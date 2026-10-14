import { describe, it, expect } from 'vitest';
import { VALIDATION_DELAY_MS, STARTING_LIVES } from '../src/config';

describe('scaffold smoke test', () => {
  it('loads config constants', () => {
    expect(VALIDATION_DELAY_MS).toBe(1000);
    expect(STARTING_LIVES).toBe(3);
  });
});
