import type { Level, Topic } from '../types';

export interface LevelIssue {
  levelId: number;
  message: string;
}

/**
 * Structural validation of level data, run before play.
 * Returns all issues found (empty array = valid).
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
    if (topic.hint && topic.category && topic.hint.toLowerCase().includes(topic.category.toLowerCase())) {
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
