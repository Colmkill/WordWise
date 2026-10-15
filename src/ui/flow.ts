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

export function startReplay(levelId: number): GameState {
  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];
  return startLevel(level, 3); // replays never touch main-run lives
}
