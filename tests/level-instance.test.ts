import { describe, it, expect } from 'vitest';
import {
  generateLevels,
  generateLevelInstance,
  nextLevelInstance,
  type LevelInstanceHistory
} from '../src/core/level-builder';
import { LEVELS } from '../src/levels';
import { WORD_BANKS } from '../src/content/word-banks';
import { TOPIC_CONCEPTS } from '../src/content/concepts';
import { LEVEL_SEED } from '../src/config';
import { LEVEL_COUNT, ambiguityFor } from '../src/content/level-rules';
import { validateLevel, validateContentPolicy, validateConcepts } from '../src/core/validate';
import { validateAmbiguity } from '../src/core/validate-ambiguity';
import { CROSS_TOPIC_WORDS } from '../src/content/cross-topic';
import type { Level } from '../src/types';

/** Fresh session history: nothing used, nothing seen recently. */
const freshHistory = (): LevelInstanceHistory => ({
  usedByConcept: new Map(),
  lastLevelOf: new Map()
});

/** History as it looks right after playing the given level (at seq). */
const historyAfter = (level: Level, seq: number): LevelInstanceHistory => {
  const history = freshHistory();
  for (const topic of level.topics) {
    history.usedByConcept.set(topic.concept, new Set(topic.words));
    history.lastLevelOf.set(topic.concept, seq);
  }
  return history;
};

/** Every validation problem a generated instance must not have. */
const problemsOf = (level: Level): string[] => [
  ...validateLevel(level).map((i) => i.message),
  ...validateContentPolicy(level).map((i) => i.message),
  ...validateConcepts(level, TOPIC_CONCEPTS).map((i) => i.message),
  ...validateAmbiguity(level, Math.max(ambiguityFor(level.id), 1), CROSS_TOPIC_WORDS).map((i) => i.message)
];

const conceptsOf = (level: Level): string[] => level.topics.map((t) => t.concept);

describe('level instance generation', () => {
  it('rebuilds the shipped ladder exactly on the nonce-0 first-playthrough thread', () => {
    const history = freshHistory();
    const rebuilt: Level[] = [];
    for (let id = 1; id <= LEVEL_COUNT; id++) {
      rebuilt.push(generateLevelInstance(WORD_BANKS, LEVEL_SEED, id, 0, id, history, { ambiguity: true }));
    }
    expect(rebuilt).toEqual(LEVELS);
  });

  it('is deterministic for a given nonce', () => {
    const a = generateLevelInstance(WORD_BANKS, LEVEL_SEED, 1, 7, 1000, freshHistory(), { ambiguity: true });
    const b = generateLevelInstance(WORD_BANKS, LEVEL_SEED, 1, 7, 1000, freshHistory(), { ambiguity: true });
    expect(a).toEqual(b);
  });

  it('restarts level 1 with a completely different topic combination', () => {
    const shipped = LEVELS[0];
    const outcome = nextLevelInstance(
      WORD_BANKS,
      LEVEL_SEED,
      1,
      1,
      1000,
      historyAfter(shipped, 999),
      conceptsOf(shipped),
      { ambiguity: true },
      shipped
    );
    expect(outcome.fallback).toBe(false);
    expect(outcome.level.topics.filter((t) => conceptsOf(shipped).includes(t.concept))).toHaveLength(0);
    expect(problemsOf(outcome.level)).toEqual([]);
    // The accepted instance was recorded at the current sequence number.
    for (const concept of conceptsOf(outcome.level)) {
      expect(outcome.history.lastLevelOf.get(concept)).toBe(1000);
    }
  });

  it('varies a level FIRST encounter away from the shipped selection', () => {
    // First start of a level this session: empty history, and the variation
    // moves away from the shipped ladder's topics (see newInstanceFor in
    // main.ts). The session salt changes only the draw, never the rules.
    const shipped = LEVELS[4]; // level 5
    const outcome = nextLevelInstance(
      WORD_BANKS,
      LEVEL_SEED,
      5,
      1234567,
      1,
      freshHistory(),
      conceptsOf(shipped),
      { ambiguity: true },
      shipped
    );
    expect(outcome.fallback).toBe(false);
    expect(outcome.level).not.toEqual(shipped);
    expect(outcome.level.topics.filter((t) => conceptsOf(shipped).includes(t.concept))).toHaveLength(0);
    expect(problemsOf(outcome.level)).toEqual([]);
  });

  it('gives different sessions (salts) different first encounters', () => {
    const shipped = LEVELS[0];
    const mk = (salt: number) =>
      nextLevelInstance(
        WORD_BANKS,
        LEVEL_SEED,
        1,
        salt + 1,
        1,
        freshHistory(),
        conceptsOf(shipped),
        { ambiguity: true },
        shipped
      );
    const a = mk(111);
    const b = mk(222);
    expect(a.fallback).toBe(false);
    expect(b.fallback).toBe(false);
    expect(a.level).not.toEqual(b.level);
    expect(problemsOf(a.level)).toEqual([]);
    expect(problemsOf(b.level)).toEqual([]);
  });

  it('produces valid, non-fallback instances across repeated restarts of several levels', () => {
    for (const id of [1, 10, 25, 40, 60, 85, 100]) {
      const shipped = LEVELS[id - 1];
      let history = historyAfter(shipped, 999);
      let previous = conceptsOf(shipped);
      let seq = 1000;
      for (let restart = 0; restart < 6; restart++) {
        const outcome = nextLevelInstance(
          WORD_BANKS,
          LEVEL_SEED,
          id,
          restart + 1,
          seq,
          history,
          previous,
          { ambiguity: true },
          shipped
        );
        expect(outcome.fallback).toBe(false);
        expect(problemsOf(outcome.level)).toEqual([]);
        history = outcome.history;
        previous = conceptsOf(outcome.level);
        seq++;
      }
    }
  });

  it('falls back to the shipped level and keeps history untouched when content is insufficient', () => {
    const shipped = LEVELS[0];
    const history = freshHistory();
    const outcome = nextLevelInstance(
      { fruit: ['a', 'b'] },
      LEVEL_SEED,
      1,
      1,
      1000,
      history,
      [],
      { ambiguity: true },
      shipped
    );
    expect(outcome.fallback).toBe(true);
    expect(outcome.level).toBe(shipped);
    expect(outcome.history).toBe(history);
  });

  it('keeps concept spacing when the history places a concept in the previous two instances', () => {
    const shipped = LEVELS[4]; // level 5
    const history = historyAfter(shipped, 999);
    // Everything in the previous instance is spacing-blocked for this seq.
    const outcome = nextLevelInstance(
      WORD_BANKS,
      LEVEL_SEED,
      5,
      1,
      1000,
      history,
      conceptsOf(shipped),
      { ambiguity: true },
      shipped
    );
    expect(outcome.fallback).toBe(false);
    expect(outcome.level.topics.some((t) => history.lastLevelOf.has(t.concept))).toBe(false);
  });

  it('draws disjoint word lists for concepts repeated across chained restarts', () => {
    const shipped = LEVELS[24]; // level 25
    let history = historyAfter(shipped, 999);
    let previous = conceptsOf(shipped);
    let seq = 1000;
    // Words every concept has shown so far (shipped instance included).
    const usedByConcept = new Map<string, Set<string>>();
    for (const topic of shipped.topics) usedByConcept.set(topic.concept, new Set(topic.words));
    for (let restart = 0; restart < 6; restart++) {
      const outcome = nextLevelInstance(
        WORD_BANKS,
        LEVEL_SEED,
        25,
        restart + 1,
        seq,
        history,
        previous,
        { ambiguity: true },
        shipped
      );
      expect(outcome.fallback).toBe(false);
      for (const topic of outcome.level.topics) {
        const used = usedByConcept.get(topic.concept);
        if (used) {
          expect(topic.words.filter((w) => used.has(w))).toEqual([]);
        }
        const set = usedByConcept.get(topic.concept) ?? new Set<string>();
        for (const w of topic.words) set.add(w);
        usedByConcept.set(topic.concept, set);
      }
      history = outcome.history;
      previous = conceptsOf(outcome.level);
      seq++;
    }
  });

  it('keeps the full generator pipeline identical to the shipped levels', () => {
    const regenerated = generateLevels(WORD_BANKS, LEVEL_SEED, LEVEL_COUNT, { ambiguity: true });
    expect(regenerated).toEqual(LEVELS);
  });
});

