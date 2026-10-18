/**
 * Procedural level-construction rules, banded by level number. No level is
 * authored by hand: the generator (core/level-builder.ts) composes each level
 * from these bands plus the concept word banks (content/word-banks.ts) and
 * the concept registry (content/concepts.ts: category + hint).
 *
 * A band constrains: topic count, permitted concept difficulty, the
 * familiarity window (how deep into a bank the draw may reach) and the
 * per-topic word-count range. Concept difficulty, difficulty banding and
 * the reserve rule (hard concepts stay available for the final band) are
 * what relegate obscure topics to later levels.
 */
export interface LevelBand {
  /** Inclusive level-number range this band covers. */
  from: number;
  to: number;
  /** Required number of topic instances per level. */
  topics: number;
  /** Permitted concept difficulty range for this band. */
  difficulty: [number, number];
  /** Familiarity window [lo, hi) of bank ranks the draw prefers. */
  window: [number, number];
  /** Per-topic word-count range [min, max]. */
  countRange: [number, number];
}

export const BANDS: LevelBand[] = [
  { from: 1, to: 2, topics: 4, difficulty: [1, 2], window: [0, 3], countRange: [3, 3] },
  { from: 3, to: 5, topics: 4, difficulty: [1, 3], window: [0, 3], countRange: [3, 3] },
  { from: 6, to: 11, topics: 4, difficulty: [2, 4], window: [0, 3], countRange: [3, 3] },
  { from: 12, to: Number.POSITIVE_INFINITY, topics: 4, difficulty: [4, 5], window: [0, 20], countRange: [3, 5] }
];

/**
 * Mistake threshold per level number. The number of entries also defines how
 * many levels are generated; append entries to extend the game.
 */
export const THRESHOLDS: Record<number, number> = {
  1: 4, 2: 4, 3: 3, 4: 3, 5: 3, 6: 3, 7: 2, 8: 3, 9: 3, 10: 3, 11: 2, 12: 2, 13: 2, 14: 2, 15: 2
};

/**
 * Editorial difficulty rating (1 = everyday, 5 = specialist) for every
 * banked concept. Drives which band a concept may appear in.
 */
export const CONCEPT_DIFFICULTY: Record<string, number> = {
  furniture: 1, fruit: 1, weather: 1, colours: 1, animals: 1,
  music: 2, jobs: 2, sports: 2, kitchen: 2, travel: 2, body: 2, coffee: 2, school: 2, cinema: 2,
  night: 3, ocean: 3, camping: 3, money: 3, garden: 3, winter: 3, mail: 3, baking: 3,
  doctor: 4, orchestra: 4, chess: 4, volcano: 4, falconry: 4, apiary: 4, cartography: 4,
  numismatics: 4, oenology: 4, alchemy: 4, taxonomy: 4,
  sailing: 5, typography: 5, horology: 5, mycology: 5, glassblowing: 5
};

/** The rule band covering a given level number, if any. */
export function bandFor(levelId: number): LevelBand | undefined {
  return BANDS.find((b) => levelId >= b.from && levelId <= b.to);
}
