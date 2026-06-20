# ai-test-auditor

> **Catch AI-generated tests that pass but test nothing.**

[![npm version](https://img.shields.io/npm/v/ai-test-auditor.svg)](https://www.npmjs.com/package/ai-test-auditor)
[![CI](https://github.com/mohdbilal2000/ai-test-auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/mohdbilal2000/ai-test-auditor/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/ai-test-auditor.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/ai-test-auditor.svg)](https://nodejs.org)

`ai-test-auditor` statically scans your Jest / Vitest / Mocha test files
(`describe` / `it` / `test`) and rates every single test:

| Rating        | Meaning                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢 **STRONG** | A meaningful assertion that references the value under test.                                                                                   |
| 🟡 **WEAK**   | Shallow check (`toBeDefined`-only, snapshot-only, single truthy) — or the name ≠ the assertion.                                                |
| 🔴 **FAKE**   | No assertion, a tautology (`expect(true).toBe(true)`), only `console.log`, an empty body, commented-out asserts, or a stray `.only` / `.skip`. |

## Why

LLMs write tests that look thorough and go green on the first run — but a
surprising number assert nothing real. A suite full of `expect(result).toBeDefined()`
and `expect(true).toBe(true)` gives you a coverage number and a false sense of
safety. `ai-test-auditor` reads the AST of each test and tells you which ones
would actually catch a regression.

## Install

Run it instantly with **npx** (no install):

```bash
npx ai-test-auditor ./tests
```

Or install **globally**:

```bash
npm i -g ai-test-auditor
ai-test-auditor ./tests
```

Or as a **dev dependency** and wire it into CI:

```bash
npm i -D ai-test-auditor
```

## Demo

![demo](assets/demo.gif)

Record it yourself:

```bash
ai-test-auditor examples/
```

## Usage

### Scan a directory (default grouped table)

```bash
ai-test-auditor examples/
```

```text
examples/fake.spec.ts
  ✘ FAKE   adds up the items:9
      ↳ Only tautological assertions (e.g. expect(true).toBe(true)) — they assert on constants and can never fail
  ✘ FAKE   handles an empty list:19
      ↳ Only logs to the console — it never asserts anything
  ✘ FAKE   is the only test that runs:34
      ↳ Stray .only — a focused test silently disables every other test in the suite

examples/strong.spec.ts
  ✔ STRONG returns the sum of two numbers:13
      ↳ Asserts on the value under test with a meaningful matcher (.toBe())

examples/weak.spec.ts
  ● WEAK   returns a user:13
      ↳ Shallow assertion — only checks existence/shape, not the value under test
  ● WEAK   calls validateUser before saving:31
      ↳ Test name references `validateUser` but the body never uses it — the name and assertions disagree

Summary: 4 strong · 4 weak · 7 fake (15 tests)
```

### Machine-readable JSON

```bash
ai-test-auditor examples/ --json
```

```json
{
  "summary": { "strong": 4, "weak": 4, "fake": 7, "total": 15 },
  "findings": [
    {
      "file": "examples/fake.spec.ts",
      "line": 9,
      "name": "adds up the items",
      "rating": "FAKE",
      "reason": "Only tautological assertions (e.g. expect(true).toBe(true)) — they assert on constants and can never fail"
    }
  ]
}
```

### Only show the worst offenders

```bash
ai-test-auditor examples/ --min-severity fake
```

### Fail CI on bad tests

```bash
# Exit 1 if any FAKE test exists (the default)
ai-test-auditor src/ --fail-on fake

# Stricter: exit 1 if any WEAK or FAKE test exists
ai-test-auditor src/ --fail-on weak
```

## Options

| Option                   | Values        | Default | Description                                                          |
| ------------------------ | ------------- | ------- | -------------------------------------------------------------------- |
| `<dir>`                  | path          | —       | Directory or file to scan. Finds `*.spec.*` / `*.test.*` files.      |
| `--json`                 | —             | off     | Output machine-readable JSON instead of the grouped table.           |
| `--min-severity <level>` | `weak`,`fake` | (all)   | Only report findings at or above this severity.                      |
| `--fail-on <level>`      | `fake`,`weak` | `fake`  | Exit with code `1` when a finding at/above this severity is present. |
| `--version`              | —             | —       | Print the version.                                                   |
| `--help`                 | —             | —       | Print help.                                                          |

**Exit codes:** `0` clean · `1` threshold exceeded (`--fail-on`) · `2` bad usage / path not found.

## How it works

1. **Discover** — recursively find `*.spec.*` / `*.test.*` files (skipping
   `node_modules`, `dist`, etc.).
2. **Parse** — each file is parsed with [`@babel/parser`](https://babeljs.io/docs/babel-parser)
   using the TypeScript + JSX plugins, so no compilation or running of your tests is needed.
3. **Locate tests** — walk the AST for `it` / `test` blocks (and `describe` /
   `context` groups), tracking inherited `.only` / `.skip`.
4. **Inspect the body** — for each test, collect every assertion
   (`expect().matcher()`, `assert(...)`, `assert.equal(...)`, chai `should`),
   constant-fold the arguments to spot tautologies, and classify the matcher
   (meaningful vs. shallow). Comments are scanned for commented-out assertions.
5. **Rate & report** — emit a grouped table or JSON, and optionally fail the
   process for CI.

## Roadmap

- [ ] Per-file and per-rule configuration (`.audit.json`)
- [ ] More assertion libraries (`chai` expect plugins, `node:test`)
- [ ] Inline source snippets in the table output
- [ ] GitHub Action wrapper with PR annotations
- [ ] Autofix suggestions for common weak patterns

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md). In short:

```bash
npm install
npm test
npm run lint
npm run build
```

## License

[MIT](./LICENSE) © 2026 Mohd Bilal
