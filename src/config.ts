/**
 * Tunable gameplay configuration. Simple constants for the prototype.
 */

/** Suspense delay after dropping a bubble onto a target (ms). Spec: ~1s. */
export const VALIDATION_DELAY_MS = 1000;

/** How long a completed topic's category bubble stays visible (ms). */
export const CATEGORY_REVEAL_MS = 1500;

/** Pause between level completion celebration and next level start (ms). */
export const LEVEL_COMPLETE_PAUSE_MS = 1200;

/** Lives at the start of a new run. */
export const STARTING_LIVES = 3;

/**
 * Shipped-content policy for topic word counts. The gameplay engine itself
 * remains agnostic: it supports any group size >= 2 (see core/game-state.ts
 * and the structural validator). These bounds are a content-quality rule for
 * the levels we ship, deliberately configurable so larger groups can be
 * enabled later without touching the engine.
 */
export const MIN_WORDS_PER_TOPIC = 3;
export const MAX_WORDS_PER_TOPIC = 7;
