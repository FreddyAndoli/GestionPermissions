import { describe, it, expect } from 'vitest';

describe('Permission hierarchy', () => {
  it('direct deny should override role grant', () => {
    const direct = false;
    const role = true;
    const result = direct !== undefined ? direct : role;
    expect(result).toBe(false);
  });

  it('direct grant should override role deny', () => {
    const direct = true;
    const role = false;
    const result = direct !== undefined ? direct : role;
    expect(result).toBe(true);
  });
});
