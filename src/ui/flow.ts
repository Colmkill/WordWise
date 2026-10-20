import { startLevel } from '../core/game-state';
import type { GameState } from '../core/game-state';
import { LEVELS } from '../levels';
import type { Level } from '../types';

/**
 * Scene/flow controller: main menu, gameplay, tutorial, level select.
 * Owns which "screen" is active and the run vs replay distinction.
 */

export type Screen = 'menu' | 'game' | 'levelSelect' | 'tutorial';

export interface AppFlow {
  screen: Screen;
  state: GameState;
  /** True when the current game is a Level Select replay (not the main run). */
  replay: boolean;
}

/** Start or resume the main run at the checkpoint's furthest point. */
export function resumeRun(
  checkpoint: { highestUnlocked: number; lives: number } | null
): { level: Level; lives: number } {
  if (!checkpoint) return { level: LEVELS[0], lives: 3 };
  // Resume at the highest unlocked level with checkpoint lives.
  const idx = Math.min(checkpoint.highestUnlocked, LEVELS.length) - 1;
  const level = LEVELS[Math.max(0, idx)];
  return { level, lives: checkpoint.lives };
}

/** Whether replay state must stay fully separate from the main run. */
export function isReplayContext(replay: boolean): boolean {
  return replay;
}

/**
 * Start a Level Select replay from an already-built level instance. The
 * caller (main.ts) decides which instance to hand over: the shipped level
 * on a first play this session, or a freshly generated variant when the
 * level was already played (see newInstanceFor in main.ts). Replays never
 * touch main-run lives.
 */
export function startReplay(level: Level): GameState {
  return startLevel(level, 3);
}
