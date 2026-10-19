import type { Level } from '../types';
import { CROSS_TOPIC_WORDS, type CrossTopicIndex } from '../content/cross-topic';

export interface AmbiguityIssue {
  levelId: number;
  message: string;
}

/**
 * Cross-topic words CLAIMED by this level: banked by more than one concept
 * but displayed by exactly one topic. The owning topic claims the word for
 * the level; the sibling concept(s) must substitute other words (which the
 * generator's intra-level exclusivity already guarantees). A word drawn
 * into two topics of the same level is NOT a claim - it is a violation.
 *
 * Pure derivation from the level data plus the cross-topic index: no
 * generator state is needed, so this works on any Level, shipped or
 * fixture.
 */
export function claimedCrossTopicWords(
  level: Level,
  index: CrossTopicIndex = CROSS_TOPIC_WORDS
): string[] {
  const ownerCount = new Map<string, number>();
  for (const topic of level.topics) {
    for (const word of topic.words) {
      const key = word.trim().toLowerCase();
      if (!index.has(key)) continue;
      ownerCount.set(key, (ownerCount.get(key) ?? 0) + 1);
    }
  }
  return [...ownerCount.entries()]
    .filter(([, count]) => count === 1)
    .map(([word]) => word)
    .sort();
}

/**
 * Validate a level's cross-topic usage against an ambiguity budget.
 *
 * Rules:
 *  (a) on-screen exclusivity - a cross-topic word may be claimed by at
 *      most one topic per level; appearing in two topics is an error;
 *  (b) budget - the level may claim at most `budget` cross-topic words.
 *
 * Returns all issues found (empty array = valid).
 */
export function validateAmbiguity(
  level: Level,
  budget: number,
  index: CrossTopicIndex = CROSS_TOPIC_WORDS
): AmbiguityIssue[] {
  const issues: AmbiguityIssue[] = [];
  const add = (message: string) => issues.push({ levelId: level.id, message });

  const ownerCount = new Map<string, number>();
  for (const topic of level.topics) {
    for (const word of topic.words) {
      const key = word.trim().toLowerCase();
      if (!index.has(key)) continue;
      ownerCount.set(key, (ownerCount.get(key) ?? 0) + 1);
    }
  }

  for (const [word, count] of ownerCount) {
    if (count > 1) {
      add(
        `Word \`${word}\` appears in ${count} topics of one level: a cross-topic word must be claimed by exactly one topic.`
      );
    }
  }

  const claimed = claimedCrossTopicWords(level, index);
  if (claimed.length > budget) {
    add(
      `Level claims ${claimed.length} cross-topic word(s) (${claimed.join(', ')}), budget is ${budget}.`
    );
  }

  return issues;
}

/**
 * Enforce ambiguity budgets across a level list. The budget per level is
 * supplied by a lookup (the rule bands own the curve); throws with a
 * readable report on any violation.
 */
export function validateAllAmbiguity(
  levels: Level[],
  budgetFor: (levelId: number) => number,
  index: CrossTopicIndex = CROSS_TOPIC_WORDS
): void {
  const issues = levels.flatMap((level) => validateAmbiguity(level, budgetFor(level.id), index));
  if (issues.length > 0) {
    const report = issues.map((i) => `Level ${i.levelId}: ${i.message}`).join('\n');
    throw new Error(`Ambiguity violations:\n${report}`);
  }
}
