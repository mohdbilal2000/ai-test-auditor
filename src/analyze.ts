import type {
  ArrowFunctionExpression,
  CallExpression,
  Comment,
  Expression,
  FunctionExpression,
  Node,
} from '@babel/types';
import { parseSource, walk, commentsWithin } from './parser.js';
import type { Rating, TestFinding } from './types.js';

/** Callees that introduce an individual test case. */
const TEST_CALLEES = new Set(['it', 'test', 'fit', 'xit', 'xtest', 'specify']);
/** Callees that group tests. */
const GROUP_CALLEES = new Set(['describe', 'context', 'suite']);

/** Matchers that only confirm existence/shape, never the actual value. */
const WEAK_MATCHERS = new Set([
  'toBeDefined',
  'toBeUndefined',
  'toBeNull',
  'toBeTruthy',
  'toBeFalsy',
  'toMatchSnapshot',
  'toMatchInlineSnapshot',
]);

const SNAPSHOT_MATCHERS = new Set(['toMatchSnapshot', 'toMatchInlineSnapshot']);
const TRUTHY_MATCHERS = new Set(['toBeTruthy', 'toBeFalsy']);

type TestFn = FunctionExpression | ArrowFunctionExpression;

interface CalleeInfo {
  base: string | null;
  modifiers: string[];
}

interface Assertion {
  matcher: string;
  tautology: boolean;
  strong: boolean;
  weak: boolean;
}

interface BodyFlags {
  skipped: boolean;
  focused: boolean;
}

/**
 * Audit a single source string and return one finding per test case.
 */
export function auditSource(code: string, file: string): TestFinding[] {
  const ast = parseSource(code);
  const comments = ast.comments ?? undefined;
  const findings: TestFinding[] = [];

  const recurse = (node: Node | null | undefined, ctx: BodyFlags): void => {
    if (!node || typeof node.type !== 'string') return;

    if (node.type === 'CallExpression') {
      const info = describeCall(node);

      if (info.base && GROUP_CALLEES.has(info.base)) {
        const childCtx: BodyFlags = {
          skipped: ctx.skipped || info.modifiers.includes('skip') || info.base.startsWith('x'),
          focused: ctx.focused || info.modifiers.includes('only'),
        };
        for (const child of children(node)) recurse(child, childCtx);
        return;
      }

      if (info.base && TEST_CALLEES.has(info.base)) {
        findings.push(rateTest(node, info, ctx, comments, file));
        return; // don't descend into a test looking for nested tests
      }
    }

    for (const child of children(node)) recurse(child, ctx);
  };

  recurse(ast.program, { skipped: false, focused: false });
  return findings;
}

function rateTest(
  call: CallExpression,
  info: CalleeInfo,
  ctx: BodyFlags,
  comments: Comment[] | undefined,
  file: string,
): TestFinding {
  const line = call.loc?.start.line ?? 0;
  const name = extractName(call) ?? '<unnamed test>';
  const skipped =
    ctx.skipped || info.modifiers.includes('skip') || info.base === 'xit' || info.base === 'xtest';
  const focused = ctx.focused || info.modifiers.includes('only') || info.base === 'fit';

  const fn = findCallback(call);
  const { rating, reason } = analyzeBody(name, fn, { skipped, focused }, comments);
  return { file, line, name, rating, reason };
}

/**
 * The pure rating function: given a test name, its callback and flags,
 * decide STRONG / WEAK / FAKE and explain why.
 */
export function analyzeBody(
  name: string,
  fn: TestFn | undefined,
  flags: BodyFlags,
  comments: Comment[] | undefined,
): { rating: Rating; reason: string } {
  if (flags.skipped) {
    return {
      rating: 'FAKE',
      reason: 'Test is skipped (.skip/xit) — it never runs, so it can never catch a regression',
    };
  }
  if (flags.focused) {
    return {
      rating: 'FAKE',
      reason: 'Stray .only — a focused test silently disables every other test in the suite',
    };
  }
  if (!fn) {
    return { rating: 'FAKE', reason: 'Test has no callback function — nothing executes' };
  }

  const assertions = collectAssertions(fn.body);

  if (assertions.length === 0) {
    return { rating: 'FAKE', reason: describeEmpty(fn, comments) };
  }

  if (assertions.every((a) => a.tautology)) {
    return {
      rating: 'FAKE',
      reason:
        'Only tautological assertions (e.g. expect(true).toBe(true)) — they assert on constants and can never fail',
    };
  }

  const hasStrong = assertions.some((a) => a.strong);

  if (hasStrong) {
    const mismatch = nameMismatch(name, fn);
    if (mismatch) return { rating: 'WEAK', reason: mismatch };
    const matcher = assertions.find((a) => a.strong)?.matcher;
    return {
      rating: 'STRONG',
      reason: `Asserts on the value under test with a meaningful matcher${
        matcher ? ` (.${matcher}())` : ''
      }`,
    };
  }

  return { rating: 'WEAK', reason: weakReason(assertions) };
}

/* ------------------------------------------------------------------ *
 * Assertion collection
 * ------------------------------------------------------------------ */

function collectAssertions(body: Node): Assertion[] {
  const assertions: Assertion[] = [];
  walk(body, (node) => {
    if (node.type !== 'CallExpression') return;
    const assertion = classifyCall(node as CallExpression);
    if (assertion) assertions.push(assertion);
  });
  return assertions;
}

function classifyCall(call: CallExpression): Assertion | null {
  const callee = call.callee;

  // expect(x).matcher(y) / expect(x).not.to.equal(y) ...
  if (callee.type === 'MemberExpression') {
    const base = expectBase(callee);
    if (base) {
      const subject = base.arguments[0] as Expression | undefined;
      const matcher = lastProperty(callee) ?? 'expect';
      const negated = chainHas(callee, 'not');
      const subjConst = subject ? isConstant(subject) : true;
      const tautology = !negated && subjConst;
      const weak = !tautology && WEAK_MATCHERS.has(matcher);
      return { matcher, tautology, weak, strong: !tautology && !weak };
    }

    // chai `should` style: value.should.equal(x)
    const should = shouldSubject(callee);
    if (should) {
      const matcher = lastProperty(callee) ?? 'should';
      const tautology = isConstant(should);
      const weak = !tautology && (matcher === 'exist' || matcher === 'ok');
      return { matcher: `should.${matcher}`, tautology, weak, strong: !tautology && !weak };
    }

    // assert.equal(a, b) / assert.ok(x)
    if (isMemberBase(callee, 'assert') || isMemberBase(callee, 'expect')) {
      const matcher = lastProperty(callee) ?? 'assert';
      const subject = call.arguments[0] as Expression | undefined;
      const subjConst = subject ? isConstant(subject) : true;
      const tautology = subjConst;
      const weak =
        !tautology && (matcher === 'ok' || matcher === 'isOk' || matcher === 'isDefined');
      return { matcher: `assert.${matcher}`, tautology, weak, strong: !tautology && !weak };
    }
    return null;
  }

  // assert(expr) — node:assert / chai assert
  if (callee.type === 'Identifier' && (callee.name === 'assert' || callee.name === 'invariant')) {
    const subject = call.arguments[0] as Expression | undefined;
    const tautology = subject ? isConstant(subject) : true;
    return { matcher: 'assert', tautology, weak: false, strong: !tautology };
  }

  return null;
}

/** Walk a member-expression callee down to a base `expect(...)` call. */
function expectBase(callee: Node): CallExpression | null {
  let node: Node = callee;
  while (node.type === 'MemberExpression') node = node.object;
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'expect'
  ) {
    return node;
  }
  return null;
}

/** For `x.should.equal(y)` return the subject `x`, else null. */
function shouldSubject(callee: Node): Expression | null {
  let node: Node = callee;
  while (node.type === 'MemberExpression') {
    if (node.property.type === 'Identifier' && node.property.name === 'should') {
      return node.object as Expression;
    }
    node = node.object;
  }
  return null;
}

function isMemberBase(callee: Node, name: string): boolean {
  let node: Node = callee;
  while (node.type === 'MemberExpression') node = node.object;
  return node.type === 'Identifier' && node.name === name;
}

function lastProperty(callee: Node): string | null {
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return null;
}

function chainHas(callee: Node, prop: string): boolean {
  let node: Node = callee;
  while (node.type === 'MemberExpression') {
    if (node.property.type === 'Identifier' && node.property.name === prop) return true;
    node = node.object;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * Empty / name-mismatch / weak reasoning
 * ------------------------------------------------------------------ */

function describeEmpty(fn: TestFn, comments: Comment[] | undefined): string {
  const body = fn.body;
  const start = fn.start ?? 0;
  const end = fn.end ?? 0;
  const commented = commentsWithin(comments, start, end).some((c) =>
    /\b(expect|assert|should)\b/.test(c.value),
  );

  if (body.type === 'BlockStatement') {
    if (body.body.length === 0) {
      return commented
        ? 'Assertions are commented out — the body has no live assertion'
        : 'Empty test body — it asserts nothing';
    }
    if (body.body.every(isConsoleStatement)) {
      return 'Only logs to the console — it never asserts anything';
    }
    return commented
      ? 'Assertions are commented out — the remaining code never asserts'
      : 'No assertion found — the test runs code but verifies nothing';
  }
  return 'No assertion found — the test verifies nothing';
}

function isConsoleStatement(node: Node): boolean {
  return (
    node.type === 'ExpressionStatement' &&
    node.expression.type === 'CallExpression' &&
    node.expression.callee.type === 'MemberExpression' &&
    node.expression.callee.object.type === 'Identifier' &&
    node.expression.callee.object.name === 'console'
  );
}

function weakReason(assertions: Assertion[]): string {
  const weak = assertions.filter((a) => a.weak);
  if (weak.length > 0 && weak.every((a) => SNAPSHOT_MATCHERS.has(a.matcher))) {
    return 'Snapshot-only assertion — passes as long as nothing changes, even if the output is wrong';
  }
  if (weak.some((a) => TRUTHY_MATCHERS.has(a.matcher))) {
    return 'Truthiness-only check — confirms the value is truthy/falsy, not what it actually is';
  }
  return 'Shallow assertion — only checks existence/shape, not the value under test';
}

/**
 * If the test name clearly references a code symbol that the body never
 * uses, the name and the assertions disagree → downgrade to WEAK.
 */
export function nameMismatch(name: string, fn: TestFn): string | null {
  const tokens = extractSymbols(name);
  if (tokens.length === 0) return null;

  const used = new Set<string>();
  walk(fn.body, (node) => {
    if (node.type === 'Identifier') used.add(node.name);
    if (node.type === 'MemberExpression' && node.property.type === 'Identifier') {
      used.add(node.property.name);
    }
  });

  const missing = tokens.find((t) => !used.has(t));
  return missing
    ? `Test name references \`${missing}\` but the body never uses it — the name and assertions disagree`
    : null;
}

/** Pull likely code symbols (backticked spans and camelCase words) from a name. */
function extractSymbols(name: string): string[] {
  const symbols = new Set<string>();
  for (const match of name.matchAll(/`([^`]+)`/g)) {
    const ident = match[1]?.match(/[A-Za-z_$][\w$]*/);
    if (ident) symbols.add(ident[0]);
  }
  for (const match of name.matchAll(/\b([a-z$_][a-z0-9$_]*[A-Z][\w$]*)\b/g)) {
    if (match[1]) symbols.add(match[1]);
  }
  return [...symbols];
}

/* ------------------------------------------------------------------ *
 * Callee + argument helpers
 * ------------------------------------------------------------------ */

function describeCall(call: CallExpression): CalleeInfo {
  let callee: Node = call.callee;
  const modifiers: string[] = [];

  while (callee.type === 'CallExpression') callee = callee.callee; // unwrap it.each(...)()
  while (callee.type === 'MemberExpression') {
    if (callee.property.type === 'Identifier') modifiers.unshift(callee.property.name);
    callee = callee.object;
  }
  const base = callee.type === 'Identifier' ? callee.name : null;
  return { base, modifiers };
}

function extractName(call: CallExpression): string | null {
  for (const arg of call.arguments) {
    if (arg.type === 'StringLiteral') return arg.value;
    if (arg.type === 'TemplateLiteral' && arg.expressions.length === 0) {
      return arg.quasis.map((q) => q.value.cooked ?? '').join('');
    }
  }
  return null;
}

function findCallback(call: CallExpression): TestFn | undefined {
  for (const arg of call.arguments) {
    if (arg.type === 'FunctionExpression' || arg.type === 'ArrowFunctionExpression') {
      return arg;
    }
  }
  return undefined;
}

function children(node: Node): Node[] {
  const result: Node[] = [];
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
    const value = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof (child as Node).type === 'string') result.push(child as Node);
      }
    } else if (value && typeof (value as Node).type === 'string') {
      result.push(value as Node);
    }
  }
  return result;
}

/* ------------------------------------------------------------------ *
 * Constant evaluation (for tautology detection)
 * ------------------------------------------------------------------ */

function isConstant(node: Node): boolean {
  return evalConst(node).ok;
}

interface ConstResult {
  ok: boolean;
  value?: unknown;
}

const NOT_CONST: ConstResult = { ok: false };

function evalConst(node: Node): ConstResult {
  switch (node.type) {
    case 'NumericLiteral':
    case 'StringLiteral':
    case 'BooleanLiteral':
      return { ok: true, value: node.value };
    case 'NullLiteral':
      return { ok: true, value: null };
    case 'Identifier':
      if (node.name === 'undefined') return { ok: true, value: undefined };
      if (node.name === 'NaN') return { ok: true, value: NaN };
      return NOT_CONST;
    case 'TemplateLiteral':
      return node.expressions.length === 0
        ? { ok: true, value: node.quasis.map((q) => q.value.cooked ?? '').join('') }
        : NOT_CONST;
    case 'UnaryExpression': {
      const arg = evalConst(node.argument);
      if (!arg.ok) return NOT_CONST;
      switch (node.operator) {
        case '-':
          return { ok: true, value: -(arg.value as number) };
        case '+':
          return { ok: true, value: +(arg.value as number) };
        case '!':
          return { ok: true, value: !arg.value };
        default:
          return NOT_CONST;
      }
    }
    case 'BinaryExpression': {
      if (node.left.type === 'PrivateName') return NOT_CONST;
      const l = evalConst(node.left);
      const r = evalConst(node.right);
      if (!l.ok || !r.ok) return NOT_CONST;
      return applyBinary(node.operator, l.value, r.value);
    }
    case 'LogicalExpression': {
      const l = evalConst(node.left);
      const r = evalConst(node.right);
      if (!l.ok || !r.ok) return NOT_CONST;
      if (node.operator === '&&') return { ok: true, value: l.value && r.value };
      if (node.operator === '||') return { ok: true, value: l.value || r.value };
      return NOT_CONST;
    }
    default:
      return NOT_CONST;
  }
}

function applyBinary(op: string, a: unknown, b: unknown): ConstResult {
  /* eslint-disable eqeqeq */
  switch (op) {
    case '===':
      return { ok: true, value: a === b };
    case '!==':
      return { ok: true, value: a !== b };
    case '==':
      return { ok: true, value: a == b };
    case '!=':
      return { ok: true, value: a != b };
    case '<':
      return { ok: true, value: (a as number) < (b as number) };
    case '>':
      return { ok: true, value: (a as number) > (b as number) };
    case '<=':
      return { ok: true, value: (a as number) <= (b as number) };
    case '>=':
      return { ok: true, value: (a as number) >= (b as number) };
    case '+':
      return { ok: true, value: (a as number) + (b as number) };
    case '-':
      return { ok: true, value: (a as number) - (b as number) };
    case '*':
      return { ok: true, value: (a as number) * (b as number) };
    case '/':
      return { ok: true, value: (a as number) / (b as number) };
    default:
      return NOT_CONST;
  }
  /* eslint-enable eqeqeq */
}
