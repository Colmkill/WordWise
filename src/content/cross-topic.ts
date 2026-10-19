/**
 * Cross-topic word index: words banked by more than one concept.
 *
 * A cross-topic word (e.g. 'shower' in both bathroom and weather) is a
 * deliberate ambiguity construct: whichever topic draws it first CLAIMS it
 * for that level; the sibling concept must not also display it (the
 * generator's existing intra-level exclusivity already enforces this). The
 * index is derived automatically from the word banks - no separate
 * authored registry - so adding a duplicate word to a second bank is all
 * it takes to register a new cross-topic word.
 *
 * This module is pure derivation: it does not affect level generation.
 * Selection bias and per-level ambiguity budgets live in the rule bands
 * (see content/level-rules.ts); the validator that polices on-screen usage
 * and budgets is core/validate-ambiguity.ts.
 */
import { WORD_BANKS } from './word-banks';

/** word (lowercase) -> concepts that bank it. */
export type CrossTopicIndex = ReadonlyMap<string, readonly string[]>;

/**
 * Build the cross-topic index for a bank map: every word banked by two or
 * more concepts, keyed lowercase, mapped to the list of banking concepts
 * (deduplicated, in bank iteration order).
 */
export function buildCrossTopicIndex(banks: Record<string, string[]>): CrossTopicIndex {
  const byWord = new Map<string, string[]>();
  for (const [concept, bank] of Object.entries(banks)) {
    for (const word of bank) {
      const key = word.trim().toLowerCase();
      if (!key) continue;
      const concepts = byWord.get(key) ?? [];
      if (!concepts.includes(concept)) concepts.push(concept);
      byWord.set(key, concepts);
    }
  }
  const cross = new Map<string, string[]>();
  for (const [word, concepts] of byWord) {
    if (concepts.length > 1) cross.set(word, concepts);
  }
  return cross;
}

/** Cross-topic words of the shipped banks. */
export const CROSS_TOPIC_WORDS: CrossTopicIndex = buildCrossTopicIndex(WORD_BANKS);

/** True when the word is banked by more than one concept. */
export function isAmbiguous(word: string, index: CrossTopicIndex = CROSS_TOPIC_WORDS): boolean {
  return index.has(word.trim().toLowerCase());
}

/** The concepts that bank the given word (empty when unambiguous). */
export function conceptsForWord(word: string, index: CrossTopicIndex = CROSS_TOPIC_WORDS): readonly string[] {
  return index.get(word.trim().toLowerCase()) ?? [];
}
