import type { Level } from './types';
import { generateLevels } from './core/level-builder';
import { WORD_BANKS } from './content/word-banks';
import { LEVEL_COUNT } from './content/level-rules';
import { LEVEL_SEED } from './config';

/**
 * Levels are generated procedurally from the word banks, the rule bands and
 * the concept registry (see content/level-rules.ts, core/level-builder.ts).
 * Nothing is authored per level; the generator derives concepts, word
 * counts, word lists, categories, hints and difficulty. Level ids remain
 * append-only (1..N): never change the seed or rule tables mid-release,
 * because checkpoints key on level numbers and changing them reshuffles
 * every level's content.
 *
 * The cross-topic ambiguity axis is enabled: within each level's ambiguity
 * budget, the generator seeks words banked by several concepts, and the
 * first topic to draw one claims it (a cross-topic word never appears in
 * two topics of one level; see content/cross-topic.ts and
 * core/validate-ambiguity.ts).
 */
export const LEVELS: Level[] = generateLevels(WORD_BANKS, LEVEL_SEED, LEVEL_COUNT, { ambiguity: true });
