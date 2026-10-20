import type { Level } from '../types';
import { STARTING_LIVES } from '../config';

/** A bubble on the board: a single word or a merged group of words from one topic. */
export interface Bubble {
  id: number;
  /** Original word identities, preserved through merges and scrambling. */
  words: string[];
  /** The topic every word in this bubble belongs to. */
  topicId: string;
}

export type GameStatus = 'playing' | 'levelComplete' | 'gameOver' | 'runComplete';

export interface GameState {
  levelId: number;
  /** Number of mistakes allowed before a life is lost. */
  mistakeThreshold: number;
  /** Mistakes accumulated in the current level attempt. */
  mistakes: number;
  lives: number;
  /** Topic ids whose hint allowance has been consumed this level attempt. */
  hintsUsed: string[];
  bubbles: Bubble[];
  /** Topic ids completed and removed from play. */
  completedTopics: string[];
  status: GameStatus;
}

export type AttemptOutcome =
  | { kind: 'correct'; state: GameState }
  | { kind: 'incorrect'; state: GameState }
  /** No attempt was made: same bubble, unknown bubble, or play not active. */
  | { kind: 'invalid'; state: GameState };

/** Create the initial state for a level: one bubble per topic word. */
export function startLevel(level: Level, lives: number = STARTING_LIVES): GameState {
  let nextId = 1;
  const bubbles: Bubble[] = [];
  for (const topic of level.topics) {
    for (const word of topic.words) {
      bubbles.push({ id: nextId++, words: [word], topicId: topic.id });
    }
  }
  return {
    levelId: level.id,
    mistakeThreshold: level.mistakeThreshold,
    mistakes: 0,
    lives,
    hintsUsed: [],
    bubbles,
    completedTopics: [],
    status: 'playing'
  };
}

/** Look up the level definition's topic by id. */
function topicOf(level: Level, topicId: string) {
  return level.topics.find((t) => t.id === topicId);
}

/**
 * Assess an attempt to group two bubbles. Validation uses the original topic
 * membership only; the expected word count never establishes correctness.
 *
 * The optional restartLevel callback builds the replacement level for a
 * life-loss restart (the app layer hands in a freshly generated instance
 * so a restart shows fresh topics and words; see main.ts). Without the
 * callback the level restarts with the same definition, as before.
 */
export function attemptGrouping(
  state: GameState,
  level: Level,
  a: number,
  b: number,
  restartLevel?: (lives: number) => Level
): AttemptOutcome {
  if (state.status !== 'playing') return { kind: 'invalid', state };
  if (a === b) return { kind: 'invalid', state };

  const bubbleA = state.bubbles.find((x) => x.id === a);
  const bubbleB = state.bubbles.find((x) => x.id === b);
  if (!bubbleA || !bubbleB) return { kind: 'invalid', state };

  // Correct when both bubbles carry the same intended topic membership.
  const correct = bubbleA.topicId === bubbleB.topicId;

  if (!correct) {
    return { kind: 'incorrect', state: registerMistake(state, level, restartLevel) };
  }

  // Merge, preserving original word identities and topic membership.
  const merged: Bubble = {
    id: bubbleA.id,
    words: [...bubbleA.words, ...bubbleB.words],
    topicId: bubbleA.topicId
  };
  const bubbles = state.bubbles.filter((x) => x.id !== a && x.id !== b);
  const nextBubbles = [merged, ...bubbles];

  const topic = topicOf(level, merged.topicId);
  const isTopicComplete = !!topic && merged.words.length === topic.words.length;

  let status: GameStatus = 'playing';
  let completedTopics = state.completedTopics;
  let nextBubblesAfter = nextBubbles;

  if (isTopicComplete) {
    status = 'levelComplete';
    completedTopics = [...state.completedTopics, merged.topicId];
    // Completed category bubble leaves active play (reveal/float-off is UI).
    nextBubblesAfter = nextBubbles.filter((x) => x.id !== merged.id);
    // Level completes only when every topic is done.
    if (completedTopics.length < level.topics.length) status = 'playing';
  }

  return {
    kind: 'correct',
    state: { ...state, bubbles: nextBubblesAfter, completedTopics, status }
  };
}

/**
 * A bubble was released without landing on another bubble: no attempt, no
 * mistake. The state is unchanged (settling position is a UI concern).
 */
export function dropWithoutTarget(state: GameState): GameState {
  return state;
}

/**
 * Register a mistake; on reaching the threshold, lose a life and restart the
 * level fresh - with the replacement instance supplied by the caller's
 * restartLevel callback when the app wants a fresh topic selection.
 */
function registerMistake(state: GameState, level: Level, restartLevel?: (lives: number) => Level): GameState {
  const mistakes = state.mistakes + 1;
  if (mistakes < state.mistakeThreshold) {
    return { ...state, mistakes };
  }
  // Threshold reached: lose a life and restart the level fresh.
  const lives = state.lives - 1;
  if (lives <= 0) {
    return { ...state, mistakes, lives: 0, status: 'gameOver' };
  }
  const freshLevel = restartLevel ? restartLevel(lives) : level;
  return startLevel(freshLevel, lives);
}

/** Enter hint-selection mode: returns the selected bubble's topic hint eligibility. */
export function canRequestHint(state: GameState, bubbleId: number): boolean {
  if (state.status !== 'playing') return false;
  const bubble = state.bubbles.find((x) => x.id === bubbleId);
  if (!bubble) return false;
  if (state.completedTopics.includes(bubble.topicId)) return false;
  if (state.hintsUsed.includes(bubble.topicId)) return false;
  return true;
}

/** Consume the hint allowance for a bubble's topic. No-op if ineligible. */
export function requestHint(state: GameState, level: Level, bubbleId: number): { hint: string | null; state: GameState } {
  if (!canRequestHint(state, bubbleId)) return { hint: null, state };
  const bubble = state.bubbles.find((x) => x.id === bubbleId)!;
  const topic = topicOf(level, bubble.topicId);
  if (!topic) return { hint: null, state };
  return {
    hint: topic.hint,
    state: { ...state, hintsUsed: [...state.hintsUsed, bubble.topicId] }
  };
}

/** Advance to the next level, or finish the run if none remains. */
export function advanceLevel(state: GameState, levels: Level[]): GameState {
  const index = levels.findIndex((l) => l.id === state.levelId);
  const next = levels[index + 1];
  if (!next) {
    return { ...state, status: 'runComplete' };
  }
  return startLevel(next, state.lives);
}

/** Start a brand-new run: Level 1, full lives, fresh arrangement. */
export function newRun(levels: Level[]): GameState {
  return startLevel(levels[0], STARTING_LIVES);
}
