/**
 * Main-run checkpoint persistence. Browser-local storage only; every access
 * is guarded so an unavailable or full storage never blocks play.
 *
 * Only COMPLETED-level checkpoints are saved: completed level ids, highest
 * unlocked level, and lives as of the last completed level. Unfinished
 * level arrangements are never persisted; replaying an unfinished level
 * starts a fresh arrangement by construction.
 */

import type { GameState } from '../core/game-state';

export interface Checkpoint {
  completedLevels: number[];
  highestUnlocked: number;
  lives: number;
  tutorialDone: boolean;
}

const KEY = 'wordwise.checkpoint';

export function loadCheckpoint(): Checkpoint | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (!Array.isArray(parsed.completedLevels)) return null;
    if (typeof parsed.highestUnlocked !== 'number') return null;
    if (typeof parsed.lives !== 'number') return null;
    return {
      completedLevels: parsed.completedLevels.filter((n: unknown) => typeof n === 'number'),
      highestUnlocked: parsed.highestUnlocked,
      lives: parsed.lives,
      tutorialDone: parsed.tutorialDone === true
    };
  } catch {
    return null;
  }
}

/** Returns false when storage is unavailable (play continues regardless). */
export function saveCheckpoint(cp: Checkpoint): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(cp));
    return true;
  } catch {
    return false;
  }
}

export function clearCheckpoint(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

/** Build the checkpoint to save after a level completes. */
export function checkpointFrom(state: GameState, totalLevels: number): Checkpoint {
  const completed = Array.from(
    new Set([state.levelId, ...(loadCheckpoint()?.completedLevels ?? [])])
  );
  return {
    completedLevels: completed,
    highestUnlocked: Math.min(totalLevels, state.levelId + 1),
    lives: state.lives,
    tutorialDone: loadCheckpoint()?.tutorialDone ?? true
  };
}
