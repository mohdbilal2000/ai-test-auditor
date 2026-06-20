import { describe, it, expect } from 'vitest';

function getUser(id: number): { id: number; name: string } {
  return { id, name: 'Ada' };
}

function renderCard(): string {
  return '<div class="card">Ada</div>';
}

describe('getUser', () => {
  // Shallow: only checks the value exists, never what it is.
  it('returns a user', () => {
    const user = getUser(1);
    expect(user).toBeDefined();
  });

  // Truthiness-only: passes for any non-empty object.
  it('has a name', () => {
    expect(getUser(1).name).toBeTruthy();
  });
});

describe('renderCard', () => {
  // Snapshot-only: passes as long as nothing changes, even if wrong.
  it('renders the card', () => {
    expect(renderCard()).toMatchSnapshot();
  });

  // Name references a symbol the body never touches.
  it('calls validateUser before saving', () => {
    const card = renderCard();
    expect(card).toContain('card');
  });
});
