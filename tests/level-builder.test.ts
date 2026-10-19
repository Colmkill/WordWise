import { describe, it, expect } from 'vitest';
import { generateLevels, eligibleWords } from '../src/core/level-builder';
import { LEVELS } from '../src/levels';
import { WORD_BANKS } from '../src/content/word-banks';
import { LEVEL_SEED } from '../src/config';
import { LEVEL_COUNT } from '../src/content/level-rules';

describe('level generator', () => {
  it('is deterministic: the same inputs rebuild identical levels', () => {
    const a = generateLevels(WORD_BANKS, LEVEL_SEED, LEVEL_COUNT, { ambiguity: true });
    const b = generateLevels(WORD_BANKS, LEVEL_SEED, LEVEL_COUNT, { ambiguity: true });
    expect(a).toEqual(b);
    expect(a).toEqual(LEVELS);
  });

  it('keeps reused concepts disjoint and spaced across shipped levels', () => {
    const seen = new Map<string, string[][]>();
    const lastOf = new Map<string, number>();
    for (const level of LEVELS) {
      for (const topic of level.topics) {
        const lists = seen.get(topic.concept) ?? [];
        for (const prev of lists) {
          expect(topic.words.filter((w) => prev.includes(w))).toEqual([]);
        }
        lists.push(topic.words);
        seen.set(topic.concept, lists);
        const last = lastOf.get(topic.concept);
        if (last !== undefined) expect(level.id - last).toBeGreaterThanOrEqual(3);
        lastOf.set(topic.concept, level.id);
      }
    }
  });

  it('gives every word exactly one topic membership per level', () => {
    for (const level of LEVELS) {
      const count = level.topics.reduce((n, t) => n + t.words.length, 0);
      const unique = new Set(level.topics.flatMap((t) => t.words.map((w) => w.toLowerCase())));
      expect(unique.size).toBe(count);
    }
  });

  it('skips a duplicate word and substitutes the next eligible one', () => {
    // 'shared' was already drawn by another topic in this level.
    const pool = eligibleWords(['shared', 'x1', 'x2', 'x3'], new Set(), new Set(['shared']), [0, 3], 3);
    expect(pool).not.toContain('shared');
    expect(pool).toEqual(['x1', 'x2', 'x3']);
  });

  it('relaxes the familiarity window only as deep as needed', () => {
    // Ranks 0-2 are all consumed by earlier reuse; the window must widen
    // to reach the deeper words instead of returning an empty pool.
    const pool = eligibleWords(['a', 'b', 'c', 'd', 'e'], new Set(['a', 'b', 'c']), new Set(), [0, 3], 3);
    expect(pool).toEqual(['d', 'e']);
  });

  it('rejects banks keyed by concepts missing from the registry', () => {
    expect(() => generateLevels({ nope: ['a', 'b', 'c'] }, LEVEL_SEED)).toThrow(/Unknown concept/);
  });

  it('throws when no concept can supply the minimum word count', () => {
    expect(() => generateLevels({ fruit: ['a', 'b'] }, LEVEL_SEED)).toThrow(/no eligible concept/);
  });

  it('refuses to generate levels beyond the configured thresholds', () => {
    expect(() => generateLevels(WORD_BANKS, LEVEL_SEED, 101)).toThrow(/no mistake threshold/);
  });
});
