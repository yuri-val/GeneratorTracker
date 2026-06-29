// Sanity check that the Jest + jest-expo + TypeScript toolchain runs.
import { generateId } from '../calculations';

describe('test environment', () => {
  it('runs TypeScript tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('imports app source under test', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});
