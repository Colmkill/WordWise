import { describe, it, expect } from 'vitest';
import { validateLevel, validateLevels } from '../src/core/validate';
import { LEVELS } from '../src/levels';
import type { Level } from '../src/types';

const baseLevel = (): Level => ({
  id: 1,
  mistakeThreshold: 3,
  topics: [
    { id: 'a', category: 'ALPHA', words: ['one', 'two', 'three'], hint: 'A hint about alpha.' },
    { id: 'b', category: 'BETA', words: ['four', 'five', 'six'], hint: 'A hint about beta.' }
  ]
});

describe('validateLevel', () => {
  it('accepts a valid level', () => {
    expect(validateLevel(baseLevel())).toEqual([]);
  });

  it('rejects a missing hint', () => {
    const level = baseLevel();
    level.topics[0].hint = '';
    expect(validateLevel(level).some((i) => i.message.includes('missing hint'))).toBe(true);
  });

  it('rejects a missing category', () => {
    const level = baseLevel();
    level.topics[0].category = ' ';
    expect(validateLevel(level).some((i) => i.message.includes('missing category'))).toBe(true);
  });

  it('rejects a word belonging to two topics', () => {
    const level = baseLevel();
    level.topics[1].words[0] = 'one';
    expect(validateLevel(level).some((i) => i.message.includes('multiple topics'))).toBe(true);
  });

  it('rejects duplicate words within a topic', () => {
    const level = baseLevel();
    level.topics[0].words[1] = 'one';
    expect(validateLevel(level).some((i) => i.message.includes('duplicate word'))).toBe(true);
  });

  it('rejects a hint that reveals the category', () => {
    const level = baseLevel();
    level.topics[0].hint = 'Think ALPHA things.';
    expect(validateLevel(level).some((i) => i.message.includes('reveals the category'))).toBe(true);
  });

  it('rejects topics with fewer than two words', () => {
    const level = baseLevel();
    level.topics[0].words = ['lonely'];
    expect(validateLevel(level).some((i) => i.message.includes('at least two words'))).toBe(true);
  });

  it('rejects an invalid mistake threshold', () => {
    const level = baseLevel();
    level.mistakeThreshold = 0;
    expect(validateLevel(level).some((i) => i.message.includes('Mistake threshold'))).toBe(true);
  });

  it('rejects duplicate topic ids', () => {
    const level = baseLevel();
    level.topics[1].id = 'a';
    expect(validateLevel(level).some((i) => i.message.includes('Duplicate topic id'))).toBe(true);
  });
});

describe('shipped level content', () => {
  it('validates every sample level', () => {
    expect(() => validateLevels(LEVELS)).not.toThrow();
  });

  it('has strictly increasing level ids starting at 1', () => {
    LEVELS.forEach((level, i) => expect(level.id).toBe(i + 1));
  });

  it('gives every word exactly one topic membership per level', () => {
    for (const level of LEVELS) {
      const count = level.topics.reduce((n, t) => n + t.words.length, 0);
      const unique = new Set(level.topics.flatMap((t) => t.words.map((w) => w.toLowerCase())));
      expect(unique.size).toBe(count);
    }
  });
});
