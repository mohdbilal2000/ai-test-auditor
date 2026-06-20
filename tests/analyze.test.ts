import { describe, it, expect } from 'vitest';
import { auditSource } from '../src/analyze.js';
import type { Rating } from '../src/types.js';

/** Audit a snippet and return the single finding's rating. */
function rate(code: string): Rating {
  const findings = auditSource(code, 'snippet.spec.ts');
  expect(findings).toHaveLength(1);
  return findings[0]!.rating;
}

function audit(code: string) {
  return auditSource(code, 'snippet.spec.ts');
}

describe('STRONG ratings', () => {
  it('rates a meaningful equality assertion on a value as STRONG', () => {
    expect(
      rate(`
        it('adds', () => {
          const result = add(2, 3);
          expect(result).toBe(5);
        });
      `),
    ).toBe('STRONG');
  });

  it('rates an assertion on a call expression as STRONG', () => {
    expect(
      rate(`
        test('slugifies', () => {
          expect(slugify('A B')).toEqual('a-b');
        });
      `),
    ).toBe('STRONG');
  });

  it('rates toThrow as STRONG', () => {
    expect(
      rate(`
        it('throws', () => {
          expect(() => parse(bad)).toThrow();
        });
      `),
    ).toBe('STRONG');
  });
});

describe('WEAK ratings', () => {
  it('rates a toBeDefined-only test as WEAK', () => {
    expect(
      rate(`
        it('returns a user', () => {
          const user = getUser(1);
          expect(user).toBeDefined();
        });
      `),
    ).toBe('WEAK');
  });

  it('rates a snapshot-only test as WEAK', () => {
    expect(
      rate(`
        it('renders', () => {
          expect(render()).toMatchSnapshot();
        });
      `),
    ).toBe('WEAK');
  });

  it('rates a single truthy check as WEAK', () => {
    expect(
      rate(`
        it('has a name', () => {
          expect(getUser(1).name).toBeTruthy();
        });
      `),
    ).toBe('WEAK');
  });

  it('rates name≠assertion (name references an unused symbol) as WEAK', () => {
    const findings = audit(`
      it('calls validateUser before saving', () => {
        const card = render();
        expect(card).toContain('card');
      });
    `);
    expect(findings[0]!.rating).toBe('WEAK');
    expect(findings[0]!.reason).toMatch(/validateUser/);
  });
});

describe('FAKE ratings', () => {
  it('rates a tautology (expect(true).toBe(true)) as FAKE', () => {
    expect(
      rate(`
        it('works', () => {
          expect(true).toBe(true);
        });
      `),
    ).toBe('FAKE');
  });

  it('rates a numeric tautology (expect(1).toBe(1)) as FAKE', () => {
    expect(rate(`it('x', () => { expect(1).toBe(1); });`)).toBe('FAKE');
  });

  it('rates assert(1 === 1) as FAKE', () => {
    expect(rate(`it('x', () => { assert(1 === 1); });`)).toBe('FAKE');
  });

  it('rates an empty body as FAKE', () => {
    expect(rate(`it('x', () => {});`)).toBe('FAKE');
  });

  it('rates a console.log-only test as FAKE', () => {
    expect(rate(`it('x', () => { console.log('hi'); });`)).toBe('FAKE');
  });

  it('rates commented-out assertions as FAKE', () => {
    const findings = audit(`
      it('throws on bad input', () => {
        const total = sum([1, 2]);
        // expect(total).toBe(3);
        void total;
      });
    `);
    expect(findings[0]!.rating).toBe('FAKE');
    expect(findings[0]!.reason).toMatch(/commented out/i);
  });
});

describe('.only / .skip flagging', () => {
  it('flags it.only as FAKE even with a real assertion', () => {
    const findings = audit(`
      it.only('runs', () => {
        expect(add(1, 2)).toBe(3);
      });
    `);
    expect(findings[0]!.rating).toBe('FAKE');
    expect(findings[0]!.reason).toMatch(/only/i);
  });

  it('flags it.skip as FAKE', () => {
    const findings = audit(`
      it.skip('runs', () => {
        expect(add(1, 2)).toBe(3);
      });
    `);
    expect(findings[0]!.rating).toBe('FAKE');
    expect(findings[0]!.reason).toMatch(/skip/i);
  });

  it('inherits skip from a describe.skip block', () => {
    const findings = audit(`
      describe.skip('group', () => {
        it('runs', () => { expect(add(1, 2)).toBe(3); });
      });
    `);
    expect(findings[0]!.rating).toBe('FAKE');
  });

  it('flags xit as FAKE', () => {
    expect(rate(`xit('runs', () => { expect(add(1,2)).toBe(3); });`)).toBe('FAKE');
  });
});

describe('parsing & discovery', () => {
  it('finds tests nested inside describe blocks', () => {
    const findings = audit(`
      describe('outer', () => {
        describe('inner', () => {
          it('a', () => { expect(x).toBe(1); });
          it('b', () => { expect(true).toBe(true); });
        });
      });
    `);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.rating)).toEqual(['STRONG', 'FAKE']);
  });

  it('records the line number and name of each test', () => {
    const findings = audit(`it('my test', () => { expect(a).toBe(b); });`);
    expect(findings[0]!.name).toBe('my test');
    expect(findings[0]!.line).toBe(1);
  });

  it('parses TypeScript and JSX syntax', () => {
    const findings = audit(`
      it('renders jsx', () => {
        const el: JSX.Element = <div className="x">hi</div>;
        expect(render(el)).toContain('hi');
      });
    `);
    expect(findings[0]!.rating).toBe('STRONG');
  });
});
