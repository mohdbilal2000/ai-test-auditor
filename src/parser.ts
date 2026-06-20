import { parse } from '@babel/parser';
import type { File, Node, Comment } from '@babel/types';

/**
 * Parse a source string into a Babel AST with TypeScript + JSX support.
 * Comments are attached so we can detect commented-out assertions.
 */
export function parseSource(code: string): File {
  return parse(code, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    plugins: ['typescript', 'jsx', 'decorators-legacy'],
    attachComment: true,
    errorRecovery: true,
  });
}

/**
 * Depth-first walk over every node in the tree, invoking `visit` for each.
 * Returning `false` from `visit` skips descending into that node's children.
 */
export function walk(node: Node | null | undefined, visit: (node: Node) => boolean | void): void {
  if (!node || typeof node.type !== 'string') return;
  const descend = visit(node);
  if (descend === false) return;

  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
    const value = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof (child as Node).type === 'string') walk(child as Node, visit);
      }
    } else if (value && typeof (value as Node).type === 'string') {
      walk(value as Node, visit);
    }
  }
}

/** Return comments whose source range falls within [start, end]. */
export function commentsWithin(
  comments: Comment[] | undefined,
  start: number,
  end: number,
): Comment[] {
  if (!comments) return [];
  return comments.filter((c) => typeof c.start === 'number' && c.start >= start && c.start <= end);
}
