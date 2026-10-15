/** A single topic within a level. */
export interface Topic {
  /** Stable identifier, unique within the level. */
  id: string;
  /** Hidden category name revealed on completion, e.g. 'FURNITURE'. */
  category: string;
  /** The words belonging to this topic. Every word belongs to exactly one topic per level. */
  words: string[];
  /** Manually authored hint. Must not reveal the category name. */
  hint: string;
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
