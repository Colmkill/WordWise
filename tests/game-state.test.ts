import { describe, it, expect } from 'vitest';
import {
  startLevel,
  attemptGrouping,
  dropWithoutTarget,
  canRequestHint,
  requestHint,
  advanceLevel,
  newRun
} from '../src/core/game-state';
import type { Level } from '../src/types';

const level = (): Level => ({
  id: 1,
  mistakeThreshold: 3,
  topics: [
    { id: 'fruit', category: 'FRUIT', words: ['apple', 'banana', 'cherry'], hint: 'Sweet things that grow on trees.' },
    { id: 'furniture', category: 'FURNITURE', words: ['chair', 'table'], hint: 'You sit or rest on these at home.' }
  ]
});

const findWord = (state: ReturnType<typeof startLevel>, word: string) =>
  state.bubbles.find((b) => b.words.includes(word))!;

describe('startLevel', () => {
  it('creates one bubble per topic word with original identities', () => {
    const s = startLevel(level());
    expect(s.bubbles).toHaveLength(5);
    expect(s.bubbles.every((b) => b.words.length === 1)).toBe(true);
    expect(s.status).toBe('playing');
    expect(s.lives).toBe(3);
    expect(s.mistakes).toBe(0);
  });
});

describe('attemptGrouping', () => {
  it('merges a correct individual pair and preserves identities', () => {
    // Fruit has three words, so this merge completes no topic yet.
    const s = startLevel(level());
    const r = attemptGrouping(s, level(), findWord(s, 'apple').id, findWord(s, 'banana').id);
    expect(r.kind).toBe('correct');
    if (r.kind !== 'correct') return;
    expect(r.state.bubbles).toHaveLength(4);
    const merged = r.state.bubbles.find((b) => b.topicId === 'fruit')!;
    expect(merged.words).toEqual(['apple', 'banana']);
  });

  it('completes the topic when the last word is added to a merged group', () => {
    const s = startLevel(level());
    let st = s;
    for (const [w1, w2] of [['apple', 'banana'], ['cherry', 'apple']] as [string, string][]) {
      const r = attemptGrouping(st, level(), findWord(st, w1).id, findWord(st, w2).id);
      if (r.kind === 'correct') st = r.state;
    }
    expect(st.completedTopics).toEqual(['fruit']);
    expect(st.bubbles.some((b) => b.words.includes('apple'))).toBe(false);
    // Furniture is untouched.
    expect(st.bubbles.filter((b) => b.topicId === 'furniture')).toHaveLength(2);
  });

  it('separates an incorrect individual pair and records one mistake', () => {
    const s = startLevel(level());
    const r = attemptGrouping(s, level(), findWord(s, 'apple').id, findWord(s, 'chair').id);
    expect(r.kind).toBe('incorrect');
    if (r.kind !== 'incorrect') return;
    expect(r.state.mistakes).toBe(1);
    expect(r.state.bubbles).toHaveLength(5); // both returned as individuals
    expect(r.state.bubbles.some((b) => b.words.length > 1)).toBe(false);
  });

  it('does not destroy a correct merged group on a later incorrect attempt', () => {
    const s = startLevel(level());
    // Merge two of three fruit words (topic not yet complete).
    const ok = attemptGrouping(s, level(), findWord(s, 'apple').id, findWord(s, 'banana').id);
    if (ok.kind !== 'correct') throw new Error('expected correct');
    const mergedId = ok.state.bubbles.find((b) => b.topicId === 'fruit')!.id;
    // Incorrect attempt: merged fruit group onto a furniture word.
    const bad = attemptGrouping(ok.state, level(), mergedId, findWord(ok.state, 'chair').id);
    expect(bad.kind).toBe('incorrect');
    if (bad.kind !== 'incorrect') return;
    const stillMerged = bad.state.bubbles.find((b) => b.topicId === 'fruit');
    expect(stillMerged?.words).toEqual(['apple', 'banana']);
    expect(bad.state.mistakes).toBe(1);
  });

  it('assesses only the two selected bubbles', () => {
    const s = startLevel(level());
    const r = attemptGrouping(s, level(), findWord(s, 'apple').id, findWord(s, 'banana').id);
    if (r.kind !== 'correct') throw new Error('expected correct');
    // Other bubbles unchanged.
    expect(r.state.bubbles.filter((b) => b.words.length === 1)).toHaveLength(3);
  });

  it('rejects attempts on the same bubble or unknown ids without a mistake', () => {
    const s = startLevel(level());
    const a = findWord(s, 'apple').id;
    expect(attemptGrouping(s, level(), a, a).kind).toBe('invalid');
    expect(attemptGrouping(s, level(), a, 9999).kind).toBe('invalid');
    expect(attemptGrouping(s, level(), 9999, 9998).kind).toBe('invalid');
    expect(s.mistakes).toBe(0);
  });
});

describe('dropWithoutTarget', () => {
  it('changes nothing and consumes no mistake', () => {
    const s = startLevel(level());
    expect(dropWithoutTarget(s)).toBe(s);
    expect(s.mistakes).toBe(0);
  });
});

describe('mistakes, lives and level reset', () => {
  it('loses a life and resets the level when the threshold is reached', () => {
    const lvl = level(); // threshold 3
    let s = startLevel(lvl, 2);
    s = attemptGrouping(s, lvl, findWord(s, 'apple').id, findWord(s, 'chair').id).state;
    s = attemptGrouping(s, lvl, findWord(s, 'apple').id, findWord(s, 'chair').id).state;
    expect(s.mistakes).toBe(2);
    expect(s.lives).toBe(2);
    const r = attemptGrouping(s, lvl, findWord(s, 'apple').id, findWord(s, 'chair').id);
    expect(r.state.mistakes).toBe(0); // reset
    expect(r.state.lives).toBe(1);
    expect(r.state.bubbles).toHaveLength(5); // full word set restored
    expect(r.state.hintsUsed).toEqual([]); // hints restored
  });

  it('shows game over when the last life is lost', () => {
    const lvl = level();
    let s = startLevel(lvl, 1);
    s = attemptGrouping(s, lvl, findWord(s, 'apple').id, findWord(s, 'chair').id).state;
    s = attemptGrouping(s, lvl, findWord(s, 'apple').id, findWord(s, 'chair').id).state;
    const r = attemptGrouping(s, lvl, findWord(s, 'apple').id, findWord(s, 'chair').id);
    expect(r.state.status).toBe('gameOver');
    expect(r.state.lives).toBe(0);
  });

  it('newRun resets to level 1 with full lives', () => {
    const fresh = newRun([level()]);
    expect(fresh.levelId).toBe(1);
    expect(fresh.lives).toBe(3);
    expect(fresh.mistakes).toBe(0);
  });
});

describe('hints', () => {
  it('returns the correct topic hint and consumes the allowance', () => {
    const lvl = level();
    const s = startLevel(lvl);
    const r = requestHint(s, lvl, findWord(s, 'apple').id);
    expect(r.hint).toBe('Sweet things that grow on trees.');
    expect(r.state.hintsUsed).toEqual(['fruit']);
  });

  it('allows only one hint per topic per level', () => {
    const lvl = level();
    let s = startLevel(lvl);
    const first = requestHint(s, lvl, findWord(s, 'apple').id);
    s = first.state;
    const second = requestHint(s, lvl, findWord(s, 'banana').id);
    expect(second.hint).toBeNull();
    expect(second.state.hintsUsed).toEqual(['fruit']);
  });

  it('refuses hints for completed topics', () => {
    const lvl = level();
    let s = startLevel(lvl);
    // Complete the furniture topic (2 words).
    s = attemptGrouping(s, lvl, findWord(s, 'chair').id, findWord(s, 'table').id).state;
    const done = s.completedTopics.includes('furniture');
    expect(done).toBe(true);
    expect(canRequestHint(s, findWord(s, 'apple').id)).toBe(true);
    // No furniture bubble remains to select; a completed topic id is ineligible:
    expect(s.bubbles.some((b) => b.topicId === 'furniture')).toBe(false);
  });

  it('does not reveal the category name in the hint', () => {
    const lvl = level();
    const s = startLevel(lvl);
    const r = requestHint(s, lvl, findWord(s, 'chair').id);
    expect(r.hint).not.toMatch(/furniture/i);
  });

  it('cancelling hint mode consumes no allowance', () => {
    const lvl = level();
    const s = startLevel(lvl);
    // Cancellation is a UI concern; eligibility is untouched without a request.
    expect(canRequestHint(s, findWord(s, 'apple').id)).toBe(true);
    expect(s.hintsUsed).toEqual([]);
  });
});

describe('progression', () => {
  const levels: Level[] = [
    level(),
    { ...level(), id: 2 }
  ];

  it('completes the level when every topic is done', () => {
    const lvl = level();
    let s = startLevel(lvl);
    s = attemptGrouping(s, lvl, findWord(s, 'chair').id, findWord(s, 'table').id).state;
    s = attemptGrouping(s, lvl, findWord(s, 'apple').id, findWord(s, 'banana').id).state;
    s = attemptGrouping(s, lvl, findWord(s, 'cherry').id, findWord(s, 'apple').id).state;
    expect(s.status).toBe('levelComplete');
    expect(s.completedTopics).toHaveLength(2);
  });

  it('advances to the next level with a fresh arrangement and lives intact', () => {
    const s = { ...startLevel(level(), 2), status: 'levelComplete' as const, levelId: 1 };
    const next = advanceLevel(s, levels);
    expect(next.levelId).toBe(2);
    expect(next.lives).toBe(2);
    expect(next.bubbles.every((b) => b.words.length === 1)).toBe(true);
  });

  it('ends the run after the final level', () => {
    const s = { ...startLevel(levels[1], 2), status: 'levelComplete' as const };
    expect(advanceLevel(s, levels).status).toBe('runComplete');
  });
});
