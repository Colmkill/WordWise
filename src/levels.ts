import type { Level } from './types';
import { generateLevels } from './core/level-builder';
import { WORD_BANKS } from './content/word-banks';
import { LEVEL_SEED } from './config';

/**
 * Levels are generated procedurally from the word banks, the rule bands and
 * the concept registry (see content/level-rules.ts, core/level-builder.ts).
 * Nothing is authored per level; the generator derives concepts, word
 * counts, word lists, categories, hints and difficulty. Level ids remain
 * append-only (1..N): never change the seed or rule tables mid-release,
 * because checkpoints key on level numbers and changing them reshuffles
 * every level's content.
 */
export const LEVELS: Level[] = generateLevels(WORD_BANKS, LEVEL_SEED);
