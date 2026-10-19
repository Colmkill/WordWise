import { describe, it, expect } from 'vitest';
import {
  claimedCrossTopicWords,
  validateAmbiguity,
  validateAllAmbiguity
} from '../src/core/validate-ambiguity';
import { buildCrossTopicIndex } from '../src/content/cross-topic';
import { ambiguityFor } from '../src/content/level-rules';
import { LEVELS } from '../src/levels';
import type { Level, Topic } from '../src/types';

const index = buildCrossTopicIndex({
  bathroom: ['shower', 'towel'],
  weather: ['shower', 'rain']
});

const topic = (id: string, concept: string, words: string[]): Topic => ({
  id,
  concept,
  category: concept.toUpperCase(),
  words,
  hint: `A clue about ${concept} things.`,
  difficulty: 1
});

const level = (id: number, topics: Topic[]): Level => ({ id, mistakeThreshold: 2, topics });

describe('claimedCrossTopicWords', () => {
  it('identifies a cross-topic word claimed by exactly one topic', () => {
    const l = level(5, [
      topic('a', 'bathroom', ['shower', 'towel']),
      topic('b', 'kitchen', ['oven', 'kettle'])
    ]);
    expect(claimedCrossTopicWords(l, index)).toEqual(['shower']);
  });

  it('returns empty when no cross-topic words are on screen', () => {
    const l = level(5, [
      topic('a', 'bathroom', ['towel']),
      topic('b', 'weather', ['rain'])
    ]);
    expect(claimedCrossTopicWords(l, index)).toEqual([]);
  });

  it('does not count a word drawn into two topics as a claim (it is a violation)', () => {
    const l = level(5, [
      topic('a', 'bathroom', ['shower']),
      topic('b', 'weather', ['shower'])
    ]);
    expect(claimedCrossTopicWords(l, index)).toEqual([]);
  });
});

describe('validateAmbiguity', () => {
  it('accepts a claim within budget', () => {
    const l = level(5, [topic('a', 'bathroom', ['shower'])]);
    expect(validateAmbiguity(l, 1, index)).toEqual([]);
  });

  it('flags a word drawn into two topics of one level', () => {
    const l = level(5, [
      topic('a', 'bathroom', ['shower', 'towel']),
      topic('b', 'weather', ['shower'])
    ]);
    const issues = validateAmbiguity(l, 0, index);
    expect(issues.some((i) => i.message.includes('must be claimed by exactly one topic'))).toBe(true);
  });

  it('flags over-budget claims with the word names', () => {
    const l = level(5, [topic('a', 'bathroom', ['shower'])]);
    const issues = validateAmbiguity(l, 0, index);
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain('shower');
    expect(issues[0].message).toContain('budget is 0');
  });

  it('accepts a zero-claim level at zero budget', () => {
    const l = level(5, [topic('a', 'bathroom', ['towel'])]);
    expect(validateAmbiguity(l, 0, index)).toEqual([]);
  });
});

describe('validateAllAmbiguity', () => {
  it('aggregates issues across levels and throws', () => {
    const levels = [
      level(1, [topic('a', 'bathroom', ['shower'])]),
      level(2, [topic('b', 'weather', ['shower'])])
    ];
    expect(() => validateAllAmbiguity(levels, () => 0, index)).toThrow(/Ambiguity violations/);
  });

  it('passes when every level is within its budget', () => {
    const levels = [
      level(1, [topic('a', 'bathroom', ['shower'])]),
      level(2, [topic('b', 'weather', ['rain'])])
    ];
    expect(() => validateAllAmbiguity(levels, (id) => (id === 1 ? 1 : 0), index)).not.toThrow();
  });
});

describe('shipped levels', () => {
  // The incidental sprint/descent claims of the current banks are pinned
  // here: any generator or bank change that moves them fails loudly and
  // forces a conscious re-baselining (see cross-topic.test.ts snapshot).
  it('claims cross-topic words only in the four known levels', () => {
    const claimedLevels = LEVELS.filter(
      (l) => claimedCrossTopicWords(l).length > 0
    ).map((l) => l.id);
    expect(claimedLevels).toEqual([66, 70, 73, 86]);
  });

  it('never displays a cross-topic word in two topics of one level', () => {
    for (const l of LEVELS) {
      const issues = validateAmbiguity(l, Number.POSITIVE_INFINITY);
      expect(issues).toEqual([]);
    }
  });

  // Grandfather clause: the shipped levels were generated before the
  // ambiguity axis existed, so their incidental claims (levels 66, 70, 73
  // and 86) predate any budget. They are allowed one claim each regardless
  // of the ramp, so correctness never depends on where incidental claims
  // happen to fall. Regenerate this baseline when content changes.
  const GRANDFATHERED = new Set([66, 70, 73, 86]);

  it('meets the ramped budget with the four grandfathered incidental claims', () => {
    expect(() =>
      validateAllAmbiguity(LEVELS, (id) => Math.max(ambiguityFor(id), GRANDFATHERED.has(id) ? 1 : 0))
    ).not.toThrow();
  });
});
