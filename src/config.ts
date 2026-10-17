/**
 * Tunable gameplay configuration. Simple constants for the prototype.
 */

/** Suspense delay after dropping a bubble onto a target (ms). Spec: ~1s. */
export const VALIDATION_DELAY_MS = 1000;

/** How long a completed topic's category bubble stays visible (ms). */
export const CATEGORY_REVEAL_MS = 1500;

/** Pause between level completion celebration and next level start (ms). */
export const LEVEL_COMPLETE_PAUSE_MS = 1200;

/** Turret launch animation: total sequence target for a full level (ms). */
export const LAUNCH_SEQUENCE_TARGET_MS = 4200;

/** Travel time for a single bubble from turret to destination (ms). */
export const LAUNCH_TRAVEL_MS = 650;

/** Overlap: the next bubble launches when the previous is this fraction through its flight. */
export const LAUNCH_OVERLAP = 0.5;

/** Reduced-motion alternative: fade-in duration per bubble (ms). */
export const LAUNCH_REDUCED_FADE_MS = 350;

/** Reduced-motion alternative: stagger between bubble appearances (ms). */
export const LAUNCH_REDUCED_STAGGER_MS = 60;

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
