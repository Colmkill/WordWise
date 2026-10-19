import type { Level, Topic } from '../types';
import { TOPIC_CONCEPTS } from '../content/concepts';
import { BANDS, CONCEPT_DIFFICULTY, THRESHOLDS, bandFor } from '../content/level-rules';
import { buildCrossTopicIndex, type CrossTopicIndex } from '../content/cross-topic';

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

/** Score penalty for a concept already used in an earlier level. Small
 *  enough that an easy used concept beats a harder fresh one. */
const REUSE_PENALTY = 2;

/** Score bonus for a concept able to claim an unclaimed cross-topic word
 *  while the level ambiguity budget has room. Only consulted when the
 *  ambiguity axis is enabled; the dormant path never reads it. */
const AMBIGUITY_BONUS = 1.5;

/** Options for level generation. */
export interface GenerateOptions {
  /**
   * Enable the cross-topic ambiguity axis: within each band ambiguity
   * budget, concept selection biases toward concepts that could claim an
   * ambiguous word. Defaults to false (dormant): the draw sequence and
   * therefore every generated level is byte-identical to a generation
   * without this option.
   */
  ambiguity?: boolean;
}

/** Words in a bank that may still be drawn for one topic instance:
 *  the band familiarity window, relaxed toward the deeper end of the
 *  bank until enough words are available, minus words already drawn for
 *  this concept in earlier levels (reuse disjointness) and words already
 *  used by another topic in this level (a duplicate is skipped and the
 *  next eligible word substitutes). Returns fewer than minCount words only
 *  when the bank is exhausted; callers treat that as ineligibility. */
export function eligibleWords(
  bank: string[],
  excluded: Set<string>,
  usedInLevel: Set<string>,
  window: [number, number],
  minCount: number
): string[] {
  let hi = Math.min(window[1], bank.length);
  const pick = () => bank.slice(window[0], hi).filter((w) => !excluded.has(w) && !usedInLevel.has(w));
  let pool = pick();
  while (pool.length < minCount && hi < bank.length) {
    hi++;
    pool = pick();
  }
  return pool;
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

/** Registry hint for a concept, narrowed to a required string. The generator
 *  never emits a topic without a hint; concepts missing one are filtered
 *  out during eligibility. */
function hintFor(concept: string): string {
  const hint = TOPIC_CONCEPTS[concept]?.hint;
  if (!hint) {
    throw new Error(`Concept "${concept}" has no hint in the concept registry`);
  }
  return hint;
}

/** Ambiguous words banked by each concept, for the ambiguity axis. Built
 *  only when the axis is enabled; null keeps the dormant path untouched. */
function ambiguousWordsByConcept(banks: Record<string, string[]>, index: CrossTopicIndex): Map<string, Set<string>> {
  const byConcept = new Map<string, Set<string>>();
  for (const [word, concepts] of index) {
    for (const concept of concepts) {
      if (!banks[concept]) continue;
      const set = byConcept.get(concept) ?? new Set<string>();
      set.add(word);
      byConcept.set(concept, set);
    }
  }
  return byConcept;
}

/**
 * Generate levels procedurally from the word banks and rule bands. There is
 * no per-level authoring: concepts, word counts and word lists are all
 * derived. Deterministic: the same banks, seed and rule tables always
 * produce identical levels (selection never changes across renders,
 * restarts or replays).
 *
 * Per level, per topic slot:
 * 1. collect eligible concepts: difficulty inside the band, reused at most
 *    once every three levels, bank able to supply the minimum word count;
 *    a reserve rule keeps scarce hard concepts (difficulty >= 4 with fewer
 *    than 6 unused words) available for the final band;
 * 2. from level 4 onward, the first slot of each level revisits a
 *    previously-used concept when one is eligible. Reuse is structural,
 *    not score-dependent: however many fresh banks exist, familiar topics
 *    keep recurring with fresh word lists (guaranteeing the reuse
 *    invariant);
 * 3. pick the concept with the lowest score: lowest difficulty first, with
 *    a small penalty for already-used concepts, tie-broken by seeded
 *    randomness. With options.ambiguity, a concept that could claim an
 *    unclaimed cross-topic word (banked by another concept too, not yet
 *    used in this level) scores slightly better while the band ambiguity
 *    budget has room; the first topic to draw such a word claims it and
 *    the sibling concept substitutes other words - a cross-topic word is
 *    never displayed by two topics of one level;
 * 4. choose a word count inside the band range (seeded), capped by what
 *    the bank can still supply;
 * 5. draw the words from the most familiar eligible ranks.
 * Infeasible requests throw with the level, concept and counts involved.
 */
export function generateLevels(
  banks: Record<string, string[]>,
  seed: number,
  levelCount: number = Object.keys(THRESHOLDS).length,
  options: GenerateOptions = {}
): Level[] {
  for (const concept of Object.keys(banks)) {
    if (!TOPIC_CONCEPTS[concept]) {
      throw new Error(`Unknown concept "${concept}": not in the concept registry`);
    }
    if (CONCEPT_DIFFICULTY[concept] === undefined) {
      throw new Error(`Concept "${concept}" has no difficulty rating (see CONCEPT_DIFFICULTY in level-rules.ts)`);
    }
  }

  const useAmbiguity = options.ambiguity === true;
  const crossIndex = useAmbiguity ? buildCrossTopicIndex(banks) : null;
  const ambiguousByConcept = crossIndex ? ambiguousWordsByConcept(banks, crossIndex) : null;

  const usedByConcept = new Map<string, Set<string>>();
  const lastLevelOf = new Map<string, number>();
  const lastBandIndex = BANDS.length - 1;
  const levels: Level[] = [];

  for (let levelId = 1; levelId <= levelCount; levelId++) {
    const band = bandFor(levelId);
    if (!band) throw new Error(`Level ${levelId}: no rule band covers this level number`);
    const threshold = THRESHOLDS[levelId];
    if (threshold === undefined) {
      throw new Error(`Level ${levelId}: no mistake threshold configured (see THRESHOLDS in level-rules.ts)`);
    }
    const isFinalBand = BANDS.indexOf(band) === lastBandIndex;
    const ambiguityBudget = useAmbiguity ? band.ambiguity ?? 0 : 0;
    const usedInLevel = new Set<string>();
    const claimedAmbiguous = new Set<string>();
    const topics: Topic[] = [];

    for (let slot = 0; slot < band.topics; slot++) {
      const eligible: string[] = [];
      for (const concept of Object.keys(banks)) {
        const meta = TOPIC_CONCEPTS[concept];
        if (!meta || !meta.hint) continue;
        const difficulty = CONCEPT_DIFFICULTY[concept];
        if (difficulty < band.difficulty[0] || difficulty > band.difficulty[1]) continue;
        const last = lastLevelOf.get(concept);
        if (last !== undefined && levelId - last < 3) continue;
        const bank = banks[concept];
        const excluded = usedByConcept.get(concept) ?? new Set<string>();
        if (!isFinalBand && difficulty >= 4 && bank.length - excluded.size < 6) continue;
        const pool = eligibleWords(bank, excluded, usedInLevel, band.window, band.countRange[0]);
        if (pool.length < band.countRange[0]) continue;
        eligible.push(concept);
      }

      // Structural revisit: from level 4 on, slot 0 prefers a concept that
      // already appeared in an earlier level (fresh words, same topic).
      const candidates =
        slot === 0 && levelId >= 4
          ? eligible.filter((c) => usedByConcept.has(c))
          : eligible;
      const pickFrom = candidates.length > 0 ? candidates : eligible;
      if (pickFrom.length === 0) {
        throw new Error(
          `Level ${levelId}: no eligible concept for topic ${slot + 1} (difficulty ${band.difficulty[0]}-${band.difficulty[1]}, spacing >= 3, bank supply exhausted?)`
        );
      }

      const pickRand = mulberry32(hashString(`${seed}:${levelId}:pick:${slot}`));
      let chosen = pickFrom[0];
      let bestScore = Infinity;
      const budgetRoom = ambiguityBudget > 0 && claimedAmbiguous.size < ambiguityBudget;
      for (const concept of pickFrom) {
        let score = (usedByConcept.has(concept) ? REUSE_PENALTY : 0) + CONCEPT_DIFFICULTY[concept] + pickRand() * 1.5;
        if (budgetRoom && ambiguousByConcept) {
          const ambiguous = ambiguousByConcept.get(concept);
          if (ambiguous) {
            for (const word of ambiguous) {
              if (!claimedAmbiguous.has(word) && !usedInLevel.has(word)) {
                score -= AMBIGUITY_BONUS;
                break;
              }
            }
          }
        }
        if (score < bestScore) {
          bestScore = score;
          chosen = concept;
        }
      }

      const meta = TOPIC_CONCEPTS[chosen];
      const bank = banks[chosen];
      const excluded = usedByConcept.get(chosen) ?? new Set<string>();
      const [countLo, countHi] = band.countRange;
      let count = countLo;
      if (countHi > countLo) {
        const countRand = mulberry32(hashString(`${seed}:${levelId}:${chosen}:count`));
        count = countLo + Math.floor(countRand() * (countHi - countLo + 1));
      }
      const pool = eligibleWords(bank, excluded, usedInLevel, band.window, count);
      count = Math.min(count, pool.length);
      if (pool.length < countLo || count < countLo) {
        throw new Error(
          `Level ${levelId} topic ${slot + 1}: concept "${chosen}" has only ${pool.length} eligible word(s), needs ${countLo} (bank: ${bank.length}, excluded by reuse: ${excluded.size}, used in level: ${usedInLevel.size})`
        );
      }

      const rand = mulberry32(hashString(`${seed}:${levelId}:${chosen}:${count}`));
      const words = drawWords(pool, count, rand);
      for (const w of words) {
        excluded.add(w);
        usedInLevel.add(w);
        if (crossIndex && crossIndex.has(w.trim().toLowerCase())) {
          claimedAmbiguous.add(w.trim().toLowerCase());
        }
      }
      usedByConcept.set(chosen, excluded);
      lastLevelOf.set(chosen, levelId);

      topics.push({
        id: `${chosen}-${levelId}`,
        concept: chosen,
        category: meta.category,
        words,
        hint: hintFor(chosen),
        difficulty: CONCEPT_DIFFICULTY[chosen]
      });
    }

    levels.push({ id: levelId, mistakeThreshold: threshold, topics });
  }

  return levels;
}
