import type { Level, Topic } from '../types';
import { TOPIC_CONCEPTS } from '../content/concepts';
import { BANDS, CONCEPT_DIFFICULTY, THRESHOLDS, bandFor, ambiguityFor } from '../content/level-rules';
import { buildCrossTopicIndex, type CrossTopicIndex } from '../content/cross-topic';
import { validateLevel, validateContentPolicy, validateConcepts } from './validate';
import { validateAmbiguity } from './validate-ambiguity';

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

/**
 * Generation state carried between levels or level instances:
 *  - usedByConcept: words already drawn for each concept (reuse
 *    disjointness - later instances of the same concept reach deeper
 *    bank ranks);
 *  - lastLevelOf: sequence number of each concept's most recent
 *    appearance (spacing). In the shipped ladder the sequence number is
 *    the level id; for on-demand level instances the caller supplies a
 *    session-wide counter so spacing holds across restarts and replays
 *    too.
 */
export interface LevelInstanceHistory {
  usedByConcept: Map<string, Set<string>>;
  lastLevelOf: Map<string, number>;
}

/** Fresh history: nothing used, nothing seen recently. */
function emptyHistory(): LevelInstanceHistory {
  return { usedByConcept: new Map(), lastLevelOf: new Map() };
}

/** Deep-copy a history so a failed candidate attempt never pollutes it. */
function cloneHistory(history: LevelInstanceHistory): LevelInstanceHistory {
  const usedByConcept = new Map<string, Set<string>>();
  for (const [concept, words] of history.usedByConcept) {
    usedByConcept.set(concept, new Set(words));
  }
  return { usedByConcept, lastLevelOf: new Map(history.lastLevelOf) };
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

/** Refuse to run on banks the registry does not fully cover. */
function validateBanks(banks: Record<string, string[]>): void {
  for (const concept of Object.keys(banks)) {
    if (!TOPIC_CONCEPTS[concept]) {
      throw new Error(`Unknown concept "${concept}": not in the concept registry`);
    }
    if (CONCEPT_DIFFICULTY[concept] === undefined) {
      throw new Error(`Concept "${concept}" has no difficulty rating (see CONCEPT_DIFFICULTY in level-rules.ts)`);
    }
  }
}

/**
 * Build one level from the rule band that covers its level number. Pure
 * derivation: the level number selects the rules (topic count, difficulty
 * band, familiarity window, count range, mistake threshold, ambiguity
 * budget); the seed, nonce and history select the content (which concepts,
 * which word subsets). Mutates the given history (reuse disjointness and
 * spacing) on success; a caller that may retry passes a clone.
 *
 * The nonce varies the draw without touching the rules: nonce 0 reproduces
 * the shipped ladder exactly (given the matching history); non-zero nonces
 * yield alternative, equally rule-conformant instances of the same level.
 * `seq` is the spacing reference number (level id in the ladder, a session
 * counter for on-demand instances) and `spacing` the minimum gap between
 * two appearances of one concept (the ladder always uses 3).
 */
function buildLevel(
  banks: Record<string, string[]>,
  seed: number,
  levelId: number,
  nonce: number,
  seq: number,
  spacing: number,
  history: LevelInstanceHistory,
  useAmbiguity: boolean,
  crossIndex: CrossTopicIndex | null,
  ambiguousByConcept: Map<string, Set<string>> | null
): Level {
  const band = bandFor(levelId);
  if (!band) throw new Error(`Level ${levelId}: no rule band covers this level number`);
  const threshold = THRESHOLDS[levelId];
  if (threshold === undefined) {
    throw new Error(`Level ${levelId}: no mistake threshold configured (see THRESHOLDS in level-rules.ts)`);
  }
  const isFinalBand = BANDS.indexOf(band) === BANDS.length - 1;
  const ambiguityBudget = useAmbiguity ? band.ambiguity ?? 0 : 0;
  const nonceTag = nonce === 0 ? '' : `i${nonce}:`;
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
      const last = history.lastLevelOf.get(concept);
      if (last !== undefined && seq - last < spacing) continue;
      const bank = banks[concept];
      const excluded = history.usedByConcept.get(concept) ?? new Set<string>();
      if (!isFinalBand && difficulty >= 4 && bank.length - excluded.size < 6) continue;
      const pool = eligibleWords(bank, excluded, usedInLevel, band.window, band.countRange[0]);
      if (pool.length < band.countRange[0]) continue;
      eligible.push(concept);
    }

    // Structural revisit: from level 4 on, slot 0 prefers a concept that
    // already appeared in an earlier level (fresh words, same topic).
    const candidates =
      slot === 0 && levelId >= 4
        ? eligible.filter((c) => history.usedByConcept.has(c))
        : eligible;
    const pickFrom = candidates.length > 0 ? candidates : eligible;
    if (pickFrom.length === 0) {
      throw new Error(
        `Level ${levelId}: no eligible concept for topic ${slot + 1} (difficulty ${band.difficulty[0]}-${band.difficulty[1]}, spacing >= ${spacing}, bank supply exhausted?)`
      );
    }

    const pickRand = mulberry32(hashString(`${seed}:${levelId}:${nonceTag}pick:${slot}`));
    let chosen = pickFrom[0];
    let bestScore = Infinity;
    const budgetRoom = ambiguityBudget > 0 && claimedAmbiguous.size < ambiguityBudget;
    for (const concept of pickFrom) {
      let score = (history.usedByConcept.has(concept) ? REUSE_PENALTY : 0) + CONCEPT_DIFFICULTY[concept] + pickRand() * 1.5;
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
    const excluded = history.usedByConcept.get(chosen) ?? new Set<string>();
    const [countLo, countHi] = band.countRange;
    let count = countLo;
    if (countHi > countLo) {
      const countRand = mulberry32(hashString(`${seed}:${levelId}:${nonceTag}${chosen}:count`));
      count = countLo + Math.floor(countRand() * (countHi - countLo + 1));
    }
    const pool = eligibleWords(bank, excluded, usedInLevel, band.window, count);
    count = Math.min(count, pool.length);
    if (pool.length < countLo || count < countLo) {
      throw new Error(
        `Level ${levelId} topic ${slot + 1}: concept "${chosen}" has only ${pool.length} eligible word(s), needs ${countLo} (bank: ${bank.length}, excluded by reuse: ${excluded.size}, used in level: ${usedInLevel.size})`
      );
    }

    const rand = mulberry32(hashString(`${seed}:${levelId}:${nonceTag}${chosen}:${count}`));
    const words = drawWords(pool, count, rand);
    for (const w of words) {
      excluded.add(w);
      usedInLevel.add(w);
      if (crossIndex && crossIndex.has(w.trim().toLowerCase())) {
        claimedAmbiguous.add(w.trim().toLowerCase());
      }
    }
    history.usedByConcept.set(chosen, excluded);
    history.lastLevelOf.set(chosen, seq);

    topics.push({
      id: `${chosen}-${levelId}`,
      concept: chosen,
      category: meta.category,
      words,
      hint: hintFor(chosen),
      difficulty: CONCEPT_DIFFICULTY[chosen]
    });
  }

  return { id: levelId, mistakeThreshold: threshold, topics };
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
  validateBanks(banks);

  const useAmbiguity = options.ambiguity === true;
  const crossIndex = useAmbiguity ? buildCrossTopicIndex(banks) : null;
  const ambiguousByConcept = crossIndex ? ambiguousWordsByConcept(banks, crossIndex) : null;

  const history = emptyHistory();
  const levels: Level[] = [];

  for (let levelId = 1; levelId <= levelCount; levelId++) {
    levels.push(buildLevel(banks, seed, levelId, 0, levelId, 3, history, useAmbiguity, crossIndex, ambiguousByConcept));
  }

  return levels;
}

/**
 * Generate one on-demand instance of a level: the same rules as the shipped
 * ladder (they are derived from the level number), but with a caller-chosen
 * nonce and spacing sequence. With nonce 0, seq = levelId and the ladder's
 * own threaded history, the result is byte-identical to the shipped level;
 * non-zero nonces (or a session history that includes restarts and replays)
 * yield fresh, equally valid topic selections and word subsets.
 *
 * Throws when no rule-conformant instance can be built (eligible pool
 * exhausted); callers that need graceful degradation use
 * nextLevelInstance, which retries and falls back.
 */
export function generateLevelInstance(
  banks: Record<string, string[]>,
  seed: number,
  levelId: number,
  nonce: number,
  seq: number,
  history: LevelInstanceHistory,
  options: GenerateOptions = {}
): Level {
  validateBanks(banks);

  const useAmbiguity = options.ambiguity === true;
  const crossIndex = useAmbiguity ? buildCrossTopicIndex(banks) : null;
  const ambiguousByConcept = crossIndex ? ambiguousWordsByConcept(banks, crossIndex) : null;

  return buildLevel(banks, seed, levelId, nonce, seq, 3, history, useAmbiguity, crossIndex, ambiguousByConcept);
}

/** Retry budget per spacing tier for on-demand instances. */
const INSTANCE_ATTEMPTS_PER_TIER = 8;

/** Outcome of an on-demand instance request. */
export interface InstanceOutcome {
  /** The level to play. */
  level: Level;
  /** True when no fresh valid instance could be built and the shipped
   *  fallback level was used instead (always valid by construction). */
  fallback: boolean;
  /** How many candidate generations were attempted in total. */
  attempts: number;
  /** Updated history including the accepted instance. Unchanged from the
   *  caller's history when fallback is true. */
  history: LevelInstanceHistory;
}

/**
 * Generate the next playable instance of a level with topic variation:
 * the same difficulty rules (owned by the level number), but a fresh
 * combination of topics wherever eligible content allows.
 *
 * Variation strategy, strictest first, each tier bounded:
 *  - spacing 3: no concept from the previous two instances (a restart or
 *    replay of the same level therefore shows a completely different
 *    topic combination when the band's pool allows it);
 *  - spacing 2: no concept from the immediately previous instance;
 *  - spacing 1: no spacing at all; accepted only when at most a third of
 *    the topics repeat (thin pools degrade gracefully instead of failing).
 *
 * Every candidate is fully validated (structure, content policy, concept
 * registry, ambiguity exclusivity and budget) before acceptance. Word
 * reuse stays disjoint through the caller's history: a repeated concept
 * always draws words it has not shown before, until its bank runs deep.
 * When nothing valid can be built, the shipped fallback level is returned
 * so play never blocks.
 */
export function nextLevelInstance(
  banks: Record<string, string[]>,
  seed: number,
  levelId: number,
  nonceBase: number,
  seq: number,
  history: LevelInstanceHistory,
  previousConcepts: readonly string[],
  options: GenerateOptions,
  fallback: Level
): InstanceOutcome {
  const useAmbiguity = options.ambiguity === true;
  const crossIndex = useAmbiguity ? buildCrossTopicIndex(banks) : null;
  const ambiguousByConcept = crossIndex ? ambiguousWordsByConcept(banks, crossIndex) : null;
  const ambiguityIndex = buildCrossTopicIndex(banks);
  const budget = Math.max(ambiguityFor(levelId), 1);
  const prev = new Set(previousConcepts);
  const spacingTiers = [3, 2, 1];

  let attempts = 0;
  let best: { level: Level; history: LevelInstanceHistory; overlap: number } | null = null;

  for (const spacing of spacingTiers) {
    for (let k = 0; k < INSTANCE_ATTEMPTS_PER_TIER; k++) {
      attempts++;
      const attemptHistory = cloneHistory(history);
      let level: Level;
      try {
        level = buildLevel(
          banks,
          seed,
          levelId,
          nonceBase + attempts - 1,
          seq,
          spacing,
          attemptHistory,
          useAmbiguity,
          crossIndex,
          ambiguousByConcept
        );
      } catch {
        continue;
      }
      if (validateLevel(level).length > 0) continue;
      if (validateContentPolicy(level).length > 0) continue;
      if (validateConcepts(level, TOPIC_CONCEPTS).length > 0) continue;
      if (validateAmbiguity(level, budget, ambiguityIndex).length > 0) continue;

      const overlap = level.topics.filter((t) => prev.has(t.concept)).length;
      if (spacing === 1) {
        const cap = Math.max(0, Math.floor(level.topics.length / 3));
        if (overlap > cap) {
          if (!best || overlap < best.overlap) best = { level, history: attemptHistory, overlap };
          continue;
        }
      }
      return { level, fallback: false, attempts, history: attemptHistory };
    }
  }

  if (best) return { level: best.level, fallback: false, attempts, history: best.history };
  return { level: fallback, fallback: true, attempts, history };
}
