import { describe, it, expect } from 'vitest';
import { buildLevels, type LevelBlueprint } from '../src/core/level-builder';
import { LEVELS, BLUEPRINTS } from '../src/levels';
import { WORD_BANKS } from '../src/content/word-banks';
import { LEVEL_SEED } from '../src/config';

const testBanks = (fruit: string[], weather: string[]): Record<string, string[]> => ({
  fruit,
  weather,
  colours: ['c1', 'c2', 'c3', 'c4'],
  furniture: ['d1', 'd2', 'd3']
});

const baseBlueprint = (): LevelBlueprint => ({
  id: 1,
  mistakeThreshold: 3,
  topics: [
    { id: 'a', concept: 'fruit', hint: 'Hint for the first group.', difficulty: 1, count: 3 },
    { id: 'b', concept: 'weather', hint: 'Hint for the second group.', difficulty: 1, count: 3 },
    { id: 'c', concept: 'colours', hint: 'Hint for the third group.', difficulty: 1, count: 3 },
    { id: 'd', concept: 'furniture', hint: 'Hint for the fourth group.', difficulty: 1, count: 3 }
  ]
});

describe('level builder', () => {
  it('is deterministic: the same inputs rebuild identical levels', () => {
    const a = buildLevels(BLUEPRINTS, WORD_BANKS, LEVEL_SEED);
    const b = buildLevels(BLUEPRINTS, WORD_BANKS, LEVEL_SEED);
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

  it('skips a duplicate word and substitutes the next eligible one', () => {
    const banks = testBanks(['shared', 'f2', 'f3'], ['shared', 'x1', 'x2', 'x3']);
    const levels = buildLevels([baseBlueprint()], banks, LEVEL_SEED);
    const fruit = levels[0].topics[0].words;
    const weather = levels[0].topics[1].words;
    expect(fruit).toContain('shared');
    expect(weather).not.toContain('shared');
    expect(new Set(weather)).toEqual(new Set(['x1', 'x2', 'x3']));
  });

  it('throws with concept and counts when a bank is insufficient', () => {
    const banks = testBanks(['f1', 'f2', 'f3'], ['x1', 'x2']);
    expect(() => buildLevels([baseBlueprint()], banks, LEVEL_SEED)).toThrow(/weather.*needs 3/s);
  });

  it('rejects concepts reused closer than three levels apart', () => {
    const second: LevelBlueprint = { ...baseBlueprint(), id: 2 };
    const spacedBanks: Record<string, string[]> = {
      fruit: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
      weather: ['x1', 'x2', 'x3', 'x4', 'x5', 'x6'],
      colours: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
      furniture: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6']
    };
    expect(() => buildLevels([baseBlueprint(), second], spacedBanks, LEVEL_SEED)).toThrow(/spacing must be >= 3/);
  });

  it('rejects unknown concepts', () => {
    const bp = baseBlueprint();
    bp.topics[0].concept = 'nope';
    expect(() => buildLevels([bp], testBanks(['f1', 'f2', 'f3'], ['x1', 'x2', 'x3']), LEVEL_SEED)).toThrow(/unknown concept/);
  });
});
