import { describe, it, expect } from 'vitest';
import {
  validateLevel,
  validateLevels,
  validateContentPolicy,
  validateAllContentPolicy,
  validateConcepts,
  validateAllConcepts,
  revealsCategory
} from '../src/core/validate';
import { LEVELS } from '../src/levels';
import { MIN_WORDS_PER_TOPIC, MAX_WORDS_PER_TOPIC } from '../src/config';
import { TOPIC_CONCEPTS } from '../src/content/concepts';
import type { Level } from '../src/types';

const baseLevel = (): Level => ({
  id: 1,
  mistakeThreshold: 3,
  topics: [
    { id: 'a', concept: 'alpha', category: 'ALPHA', words: ['one', 'two', 'three'], hint: 'A clue for the first group.' },
    { id: 'b', concept: 'beta', category: 'BETA', words: ['four', 'five', 'six'], hint: 'A clue for the second group.' }
  ]
});

const topicWith = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`);

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

  it('still accepts two-word topics at engine level (policy applies to shipped content only)', () => {
    const level = baseLevel();
    level.topics[1].words = ['four', 'five'];
    // Structurally valid to the engine...
    expect(validateLevel(level)).toEqual([]);
    // ...but rejected by the shipped-content policy.
    expect(validateContentPolicy(level).some((i) => i.message.includes('at least 3 words'))).toBe(true);
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

describe('content policy (3–7 words per shipped topic)', () => {
  it.each([3, 4, 5, 6, 7])('accepts a topic with %i words', (n) => {
    const level = baseLevel();
    level.topics[0].words = topicWith(n);
    expect(validateContentPolicy(level)).toEqual([]);
  });

  it('rejects a topic with 2 words under the default policy', () => {
    const level = baseLevel();
    level.topics[0].words = topicWith(2);
    expect(validateContentPolicy(level).some((i) => i.message.includes('at least 3 words'))).toBe(true);
  });

  it('rejects a topic exceeding the maximum', () => {
    const level = baseLevel();
    level.topics[0].words = topicWith(8);
    expect(validateContentPolicy(level).some((i) => i.message.includes('at most 7 words'))).toBe(true);
  });

  it('supports mixed topic sizes within one level', () => {
    const level = baseLevel();
    level.topics[0].words = topicWith(3);
    level.topics[1].words = topicWith(5);
    expect(validateContentPolicy(level)).toEqual([]);
  });

  it('respects a custom configurable maximum for future larger groups', () => {
    const level = baseLevel();
    level.topics[0].words = topicWith(9);
    // Fails under the default max of 7...
    expect(validateContentPolicy(level).length).toBeGreaterThan(0);
    // ...passes when the ceiling is raised to 9.
    expect(validateContentPolicy(level, 3, 9)).toEqual([]);
  });

  it('aggregates issues across levels and throws in validateAllContentPolicy', () => {
    const small = baseLevel();
    small.topics[0].words = topicWith(2);
    expect(() => validateAllContentPolicy([small])).toThrow(/Content policy violations/);
  });
});

describe('shipped level content', () => {
  it('validates every sample level', () => {
    expect(() => validateLevels(LEVELS)).not.toThrow();
  });

  it('satisfies the 3–7 word content policy', () => {
    expect(() => validateAllContentPolicy(LEVELS, MIN_WORDS_PER_TOPIC, MAX_WORDS_PER_TOPIC)).not.toThrow();
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


describe('concept validation', () => {
  const registry = {
    alpha: { slug: 'alpha', category: 'ALPHA' },
    beta: { slug: 'beta', category: 'BETA' }
  };

  it('accepts valid concept references', () => {
    expect(validateConcepts(baseLevel(), registry)).toEqual([]);
  });

  it('rejects an unknown concept', () => {
    const level = baseLevel();
    level.topics[0].concept = 'nope';
    expect(validateConcepts(level, registry).some((i) => i.message.includes('unknown concept'))).toBe(true);
  });

  it('rejects the same concept appearing twice in one level', () => {
    const level = baseLevel();
    level.topics[1].concept = 'alpha';
    expect(validateConcepts(level, registry).some((i) => i.message.includes('Duplicate concept'))).toBe(true);
  });

  it('rejects an instance category that mismatches its concept', () => {
    const level = baseLevel();
    level.topics[0].category = 'WRONG';
    expect(validateConcepts(level, registry).some((i) => i.message.includes('does not match concept'))).toBe(true);
  });

  it('rejects an out-of-range difficulty', () => {
    const level = baseLevel();
    level.topics[0].difficulty = 6;
    expect(validateConcepts(level, registry).some((i) => i.message.includes('difficulty'))).toBe(true);
    level.topics[0].difficulty = 0;
    expect(validateConcepts(level, registry).some((i) => i.message.includes('difficulty'))).toBe(true);
  });

  it('rejects an invalid status', () => {
    const level = baseLevel();
    (level.topics[0] as any).status = 'final';
    expect(validateConcepts(level, registry).some((i) => i.message.includes('status'))).toBe(true);
  });

  it('allows the same concept in different levels with different word lists', () => {
    const a = baseLevel();
    const b = baseLevel();
    b.id = 2;
    // Same concept refs as level a, but a fresh word list:
    // concept reuse across levels is the whole point of the registry.
    b.topics[0].words = ['seven', 'eight', 'nine', 'ten'];
    b.topics[1].words = ['eleven', 'twelve', 'thirteen'];
    expect(validateAllConcepts([a, b], registry)).toBeUndefined();
  });

  it('aggregates issues across levels and throws in validateAllConcepts', () => {
    const level = baseLevel();
    level.topics[0].concept = 'nope';
    expect(() => validateAllConcepts([level], registry)).toThrow(/Concept violations/);
  });
});

describe('shipped concept registry', () => {
  it('validates every shipped level against the concept registry', () => {
    expect(() => validateAllConcepts(LEVELS, TOPIC_CONCEPTS)).not.toThrow();
  });

  it('keeps every concept slug keyed by its own slug', () => {
    for (const [key, concept] of Object.entries(TOPIC_CONCEPTS)) {
      expect(concept.slug).toBe(key);
    }
  });
});

describe('phase C content expansion', () => {
  it('ships at least twelve levels with contiguous ids', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(12);
    // Append-only guarantee: ids are exactly 1..N in order.
    LEVELS.forEach((level, i) => expect(level.id).toBe(i + 1));
  });

  it('reuses concepts across levels with fresh word lists', () => {
    const instances = new Map<string, string[][]>();
    for (const level of LEVELS) {
      for (const topic of level.topics) {
        const lists = instances.get(topic.concept) ?? [];
        for (const existing of lists) {
          // A reused concept must come with a genuinely different word list.
          const overlap = topic.words.filter((w) => existing.includes(w));
          expect(overlap).toEqual([]);
        }
        lists.push(topic.words);
        instances.set(topic.concept, lists);
      }
    }
    const reused = [...instances.entries()].filter(([, lists]) => lists.length > 1);
    expect(reused.length).toBeGreaterThan(0);
  });

  it('mixes group sizes within the later levels', () => {
    // Word counts widen from level 50 onward; by then several levels must
    // mix group sizes rather than using a uniform count.
    const mixed = LEVELS.slice(49).filter(
      (level) => new Set(level.topics.map((t) => t.words.length)).size > 1
    );
    expect(mixed.length).toBeGreaterThan(0);
  });

  it('never repeats a word across different topics of the same level (all levels)', () => {
    for (const level of LEVELS) {
      expect(validateConcepts(level, TOPIC_CONCEPTS)).toEqual([]);
      expect(validateLevel(level)).toEqual([]);
    }
  });
});
