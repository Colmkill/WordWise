import type { Level, Topic } from '../types';
import { TOPIC_CONCEPTS } from '../content/concepts';
import { bandFor } from '../content/level-rules';

/** Per-instance curation: which concept appears in a level, with which hint
 *  and difficulty. Words are NOT authored here; the builder draws them from
 *  the concept's word bank. */
export interface TopicBlueprint {
  id: string;
  concept: string;
  hint: string;
  difficulty: number;
  status?: 'draft' | 'reviewed';
  /** How many words to draw from the concept's bank for this instance. */
  count: number;
}

export interface LevelBlueprint {
  id: number;
  mistakeThreshold: number;
  topics: TopicBlueprint[];
}

/** Deterministic string hash (FNV-1a). */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32): same seed, same draw, on every load. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draw n words from the eligible pool, deterministically for this seed. */
function drawWords(pool: string[], n: number, rand: () => number): string[] {
  const idx = pool.map((_, i) => i);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (idx.length - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => pool[i]);
}

/**
 * Build concrete levels from blueprints + word banks. Deterministic: the same
 * blueprints, banks and seed always produce identical levels (selection never
 * changes across renders, restarts or replays).
 *
 * Word selection per topic instance:
 * 1. start from the band's familiarity window of the concept's bank;
 * 2. exclude words already drawn for this concept in earlier levels (reuse
 *    disjointness) and words already used by another topic in this level
 *    (exact-duplicate exclusion only: a duplicate is skipped and the next
 *    eligible word substitutes);
 * 3. relax the window's rank ceiling toward the bank's deeper end until the
 *    requested count is available;
 * 4. seeded draw.
 * Insufficient banks throw with the concept, required count and availability.
 */
export function buildLevels(
  blueprints: LevelBlueprint[],
  banks: Record<string, string[]>,
  seed: number
): Level[] {
  const problems: string[] = [];
  const warnings: string[] = [];
  const usedByConcept = new Map<string, Set<string>>();
  const lastLevelOf = new Map<string, number>();
  const levels: Level[] = [];

  for (const bp of blueprints) {
    const band = bandFor(bp.id);
    if (!band) throw new Error(`Level ${bp.id}: no rule band covers this level number`);
    if (bp.topics.length !== band.topics) {
      problems.push(`Level ${bp.id}: has ${bp.topics.length} topics, band requires ${band.topics}`);
    }
    const usedWords = new Set<string>();
    const topics: Topic[] = [];

    for (const t of bp.topics) {
      const concept = TOPIC_CONCEPTS[t.concept];
      if (!concept) throw new Error(`Level ${bp.id}: unknown concept "${t.concept}"`);
      const last = lastLevelOf.get(t.concept);
      if (last !== undefined && bp.id - last < 3) {
        problems.push(
          `Level ${bp.id}: concept "${t.concept}" reused too soon (last level ${last}; spacing must be >= 3)`
        );
      }
      if (t.difficulty < band.difficulty[0] || t.difficulty > band.difficulty[1]) {
        problems.push(
          `Level ${bp.id}: topic "${t.id}" difficulty ${t.difficulty} outside band [${band.difficulty[0]}-${band.difficulty[1]}]`
        );
      }
      const bank = banks[t.concept];
      if (!bank) throw new Error(`Level ${bp.id}: no word bank for concept "${t.concept}"`);

      const excluded = usedByConcept.get(t.concept) ?? new Set<string>();
      const duplicateSkips = bank.filter((w) => usedWords.has(w));
      if (duplicateSkips.length > 0) {
        warnings.push(
          `Level ${bp.id}: "${duplicateSkips.join('", "')}" in the ${t.concept} bank already used by another topic this level - skipped`
        );
      }

      let lo = Math.min(band.window[0], Math.max(0, bank.length - 1));
      let hi = Math.min(band.window[1], bank.length);
      const pick = () => bank.slice(lo, hi).filter((w) => !excluded.has(w) && !usedWords.has(w));
      let eligible = pick();
      while (eligible.length < t.count && hi < bank.length) {
        hi++;
        eligible = pick();
      }
      if (eligible.length < t.count) {
        throw new Error(
          `Level ${bp.id} topic "${t.id}": concept "${t.concept}" has only ${eligible.length} eligible word(s), needs ${t.count} (bank: ${bank.length}, excluded by reuse: ${excluded.size}, used in level: ${usedWords.size})`
        );
      }

      const rand = mulberry32(hashString(`${seed}:${bp.id}:${t.concept}:${t.count}`));
      const words = drawWords(eligible, t.count, rand);
      for (const w of words) {
        excluded.add(w);
        usedWords.add(w);
      }
      usedByConcept.set(t.concept, excluded);
      lastLevelOf.set(t.concept, bp.id);

      const topic: Topic = {
        id: t.id,
        concept: t.concept,
        category: concept.category,
        words,
        hint: t.hint,
        difficulty: t.difficulty
      };
      if (t.status) topic.status = t.status;
      topics.push(topic);
    }

    levels.push({ id: bp.id, mistakeThreshold: bp.mistakeThreshold, topics });
  }

  if (problems.length > 0) {
    throw new Error(`Level rule violations:\n- ${problems.join('\n- ')}`);
  }
  for (const w of warnings) console.warn(`[level-builder] ${w}`);
  return levels;
}
