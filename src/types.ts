import type { TopicConcept } from './content/concepts';

export type { TopicConcept };

/** A single topic within a level. */
export interface Topic {
  /** Stable identifier, unique within the level. */
  id: string;
  /** Registry slug of the reusable concept this instance belongs to. */
  concept: string;
  /** Category name revealed on completion. Must match the concept's canonical category. */
  category: string;
  /** The words belonging to this topic. Every word belongs to exactly one topic per level. */
  words: string[];
  /** Manually authored hint. Must not reveal the category name. */
  hint: string;
  /** Optional reviewed difficulty estimate for this instance, from 1 (easy) to 5 (hard). */
  difficulty?: number;
  /** Optional content review status. */
  status?: 'draft' | 'reviewed';
}

/** A hand-authored level definition. */
export interface Level {
  /** 1-based level number. */
  id: number;
  /** Topics for this level. The starting word set is exactly the union of all topic words. */
  topics: Topic[];
  /** Number of mistakes allowed before a life is lost. */
  mistakeThreshold: number;
}
