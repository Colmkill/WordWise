import type { Level, Topic, TopicConcept } from '../types';

export interface LevelIssue {
  levelId: number;
  message: string;
}

/** Escape characters that have special meaning in regular expressions. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when the hint explicitly reveals the category name as whole word(s),
 * case-insensitively. Substring matches inside longer words (e.g. category
 * ART vs the word 'smart') are not treated as reveals.
 */
export function revealsCategory(hint: string, category: string): boolean {
  const escaped = escapeRegExp(category.trim());
  if (!escaped) return false;
  return new RegExp('\\b' + escaped + '\\b', 'i').test(hint);
}

/**
 * Structural validation of level data, run before play.
 * Returns all issues found (empty array = valid).
 *
 * The engine-level minimum of two words per topic is a gameplay invariant.
 * The shipped-content policy (3â7 words) is enforced separately by
 * validateContentPolicy so tests and future tooling may still exercise
 * two-word topics through this function.
 */
export function validateLevel(level: Level): LevelIssue[] {
  const issues: LevelIssue[] = [];
  const add = (message: string) => issues.push({ levelId: level.id, message });

  if (!Number.isInteger(level.id) || level.id < 1) add('Level id must be a positive integer.');
  if (!Number.isInteger(level.mistakeThreshold) || level.mistakeThreshold < 1) {
    add('Mistake threshold must be a positive integer.');
  }
  if (!Array.isArray(level.topics) || level.topics.length === 0) {
    add('Level must contain at least one topic.');
    return issues;
  }

  const topicIds = new Set<string>();
  const wordOwners = new Map<string, string[]>();

  level.topics.forEach((topic: Topic, index: number) => {
    if (!topic.id) add(`Topic ${index}: missing id.`);
    else if (topicIds.has(topic.id)) add(`Duplicate topic id: ${topic.id}.`);
    else topicIds.add(topic.id);

    if (!topic.category || !topic.category.trim()) add(`Topic ${topic.id}: missing category name.`);
    if (!topic.hint || !topic.hint.trim()) add(`Topic ${topic.id}: missing hint.`);
    if (topic.hint && topic.category && revealsCategory(topic.hint, topic.category)) {
      add(`Topic ${topic.id}: hint reveals the category name.`);
    }
    if (!Array.isArray(topic.words) || topic.words.length < 2) {
      add(`Topic ${topic.id}: must contain at least two words.`);
      return;
    }

    const seen = new Set<string>();
    for (const word of topic.words) {
      const key = word.trim().toLowerCase();
      if (!word.trim()) add(`Topic ${topic.id}: contains an empty word.`);
      if (seen.has(key)) add(`Topic ${topic.id}: duplicate word ${JSON.stringify(word)}.`);
      seen.add(key);
      if (!wordOwners.has(key)) wordOwners.set(key, []);
      wordOwners.get(key)!.push(topic.id);
    }
  });

  for (const [word, owners] of wordOwners) {
    if (owners.length > 1) {
      add(`Word ${JSON.stringify(word)} belongs to multiple topics: ${owners.join(', ')}.`);
    }
  }

  return issues;
}

/** Validate every level; throws with a readable report if any level is invalid. */
export function validateLevels(levels: Level[]): void {
  const issues = levels.flatMap(validateLevel);
  if (issues.length > 0) {
    const report = issues.map((i) => `Level ${i.levelId}: ${i.message}`).join('\n');
    throw new Error(`Invalid level data:\n${report}`);
  }
}

/**
 * Shipped-content policy on top of structural validation:
 * every topic must have between MIN_WORDS_PER_TOPIC (3) and
 * MAX_WORDS_PER_TOPIC (7) words. This is a content-quality rule,
 * not a gameplay invariant â two-word topics remain legal to the engine.
 */
export function validateContentPolicy(level: Level, min = 3, max = 7): LevelIssue[] {
  const issues: LevelIssue[] = [];
  for (const topic of level.topics) {
    if (!Array.isArray(topic.words)) continue;
    if (topic.words.length < min) {
      issues.push({
        levelId: level.id,
        message: `Topic ${topic.id}: shipped content requires at least ${min} words (found ${topic.words.length}).`
      });
    }
    if (topic.words.length > max) {
      issues.push({
        levelId: level.id,
        message: `Topic ${topic.id}: shipped content allows at most ${max} words (found ${topic.words.length}).`
      });
    }
  }
  return issues;
}

/** Enforce the content policy across all shipped levels; throws on violation. */
export function validateAllContentPolicy(levels: Level[], min = 3, max = 7): void {
  const issues = levels.flatMap((l) => validateContentPolicy(l, min, max));
  if (issues.length > 0) {
    const report = issues.map((i) => `Level ${i.levelId}: ${i.message}`).join('\n');
    throw new Error(`Content policy violations:\n${report}`);
  }
}


/**
 * Concept-registry validation for a level's topic instances.
 * Checked separately from structural validation so test fixtures with
 * arbitrary topics stay decoupled from the shipped registry.
 */
export function validateConcepts(level: Level, registry: Record<string, TopicConcept>): LevelIssue[] {
  const issues: LevelIssue[] = [];
  const add = (message: string) => issues.push({ levelId: level.id, message });
  const seenConcepts = new Set<string>();

  for (const topic of level.topics) {
    if (!topic.concept || !topic.concept.trim()) {
      add(`Topic ${topic.id}: missing concept reference.`);
      continue;
    }
    const concept = registry[topic.concept];
    if (!concept) {
      add(`Topic ${topic.id}: unknown concept "${topic.concept}".`);
    } else if (topic.category && concept.category !== topic.category.trim()) {
      add(`Topic ${topic.id}: category "${topic.category}" does not match concept "${concept.slug}" (expected "${concept.category}").`);
    }
    if (seenConcepts.has(topic.concept)) {
      add(`Duplicate concept "${topic.concept}" in one level.`);
    } else {
      seenConcepts.add(topic.concept);
    }
    if (topic.difficulty !== undefined && (!Number.isInteger(topic.difficulty) || topic.difficulty < 1 || topic.difficulty > 5)) {
      add(`Topic ${topic.id}: difficulty must be an integer from 1 to 5.`);
    }
    if (topic.status !== undefined && topic.status !== 'draft' && topic.status !== 'reviewed') {
      add(`Topic ${topic.id}: status must be "draft" or "reviewed".`);
    }
  }
  return issues;
}

/** Enforce concept validation across all shipped levels; throws on violation. */
export function validateAllConcepts(levels: Level[], registry: Record<string, TopicConcept>): void {
  const issues = levels.flatMap((l) => validateConcepts(l, registry));
  if (issues.length > 0) {
    const report = issues.map((i) => `Level ${i.levelId}: ${i.message}`).join('\n');
    throw new Error(`Concept violations:\n${report}`);
  }
}
