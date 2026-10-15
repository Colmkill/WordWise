import { describe, it, expect } from 'vitest';
import { validateLevel, validateLevels, revealsCategory } from '../src/core/validate';
import { LEVELS } from '../src/levels';
import type { Level } from '../src/types';

const baseLevel = (): Level => ({
  id: 1,
  mistakeThreshold: 3,
  topics: [
    { id: 'a', category: 'ALPHA', words: ['one', 'two', 'three'], hint: 'A clue for the first group.' },
    { id: 'b', category: 'BETA', words: ['four', 'five', 'six'], hint: 'A clue for the second group.' }
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

describe('revealsCategory', () => {
  it('rejects a hint explicitly containing its category name', () => {
    expect(revealsCategory('Think ALPHA things.', 'ALPHA')).toBe(true);
  });

  it('matches the category name case-insensitively', () => {
    expect(revealsCategory('These are all furniture.', 'FURNITURE')).toBe(true);
  });

  it('does not match a short category inside an unrelated longer word', () => {
    expect(revealsCategory('A smart gadget for parties.', 'ART')).toBe(false);
  });

  it('handles multiword category names', () => {
    expect(revealsCategory('They are water sports gear.', 'WATER SPORTS')).toBe(true);
    expect(revealsCategory('Nothing to do with the category.', 'WATER SPORTS')).toBe(false);
  });

  it('matches category words at hint boundaries', () => {
    expect(revealsCategory('Weather is what it is.', 'WEATHER')).toBe(true);
    expect(revealsCategory('The weather outside.', 'WEATHER')).toBe(true);
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
