/**
 * Level construction rules, banded by level number. Derived from the shipped
 * level design (levels 1-15). A band constrains: topic count, permitted
 * concept difficulty, and the familiarity rank ceiling (how deep into a
 * concept's bank the draw may reach). mistakeThreshold stays per-blueprint
 * (append-only data). Add a row to extend progression; the builder never
 * hardcodes per-level logic.
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
}

export const BANDS: LevelBand[] = [
  { from: 1, to: 2, topics: 4, difficulty: [1, 2], window: [0, 3] },
  { from: 3, to: 5, topics: 4, difficulty: [1, 3], window: [0, 3] },
  { from: 6, to: 11, topics: 4, difficulty: [2, 5], window: [0, 3] },
  { from: 12, to: Number.POSITIVE_INFINITY, topics: 4, difficulty: [4, 5], window: [0, 20] }
];

/** The rule band covering a given level number, if any. */
export function bandFor(levelId: number): LevelBand | undefined {
  return BANDS.find((b) => levelId >= b.from && levelId <= b.to);
}
