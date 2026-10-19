import { describe, it, expect } from 'vitest';
import { generateLevels } from '../src/core/level-builder';
import { ambiguityFor, LEVEL_COUNT } from '../src/content/level-rules';
import { claimedCrossTopicWords } from '../src/core/validate-ambiguity';
import { LEVELS } from '../src/levels';
import { WORD_BANKS } from '../src/content/word-banks';
import { LEVEL_SEED } from '../src/config';

describe('ambiguity axis', () => {
  it('ramps from level 40 and caps at 3', () => {
    expect(ambiguityFor(1)).toBe(0);
    expect(ambiguityFor(39)).toBe(0);
    expect(ambiguityFor(40)).toBe(0);
    expect(ambiguityFor(54)).toBe(0);
    expect(ambiguityFor(55)).toBe(1);
    expect(ambiguityFor(70)).toBe(2);
    expect(ambiguityFor(85)).toBe(3);
    expect(ambiguityFor(100)).toBe(3);
  });

  it('is active in the shipped levels: generated levels are unchanged', () => {
    // The shipped LEVELS are generated with the axis on; the same call
    // must reproduce them exactly.
    const active = generateLevels(WORD_BANKS, LEVEL_SEED, LEVEL_COUNT, { ambiguity: true });
    expect(active).toEqual(LEVELS);
  });

  it('keeps the dormant path identical up to the ramp', () => {
    // Without the option the bias never fires: the draw sequence is the
    // same as the active one until the first budget appears (level 55).
    const dormant = generateLevels(WORD_BANKS, LEVEL_SEED, LEVEL_COUNT);
    expect(dormant.slice(0, 54)).toEqual(LEVELS.slice(0, 54));
  });

  it('claims cross-topic words within budget (plus one incidental) and never twice in one level', () => {
    const active = generateLevels(WORD_BANKS, LEVEL_SEED, LEVEL_COUNT, { ambiguity: true });
    for (const level of active) {
      const claims = claimedCrossTopicWords(level);
      expect(claims.length).toBeLessThanOrEqual(Math.max(ambiguityFor(level.id), 1));
      // On-screen exclusivity: no word in two topics.
      const owners = new Map<string, number>();
      for (const topic of level.topics) {
        for (const word of topic.words) {
          const key = word.trim().toLowerCase();
          const n = (owners.get(key) ?? 0) + 1;
          owners.set(key, n);
          expect(n).toBe(1);
        }
      }
    }
    // With the twelve-word supply the bias must actually fire.
    const claimedLevels = active.filter((l) => claimedCrossTopicWords(l).length > 0);
    expect(claimedLevels.length).toBeGreaterThan(0);
  });

  it('stays deterministic in both modes', () => {
    const a = generateLevels(WORD_BANKS, LEVEL_SEED, LEVEL_COUNT, { ambiguity: true });
    const b = generateLevels(WORD_BANKS, LEVEL_SEED, LEVEL_COUNT, { ambiguity: true });
    expect(a).toEqual(b);
    const c = generateLevels(WORD_BANKS, LEVEL_SEED, LEVEL_COUNT);
    const d = generateLevels(WORD_BANKS, LEVEL_SEED, LEVEL_COUNT);
    expect(c).toEqual(d);
  });
});
