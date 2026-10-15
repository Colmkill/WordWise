import type { Level } from './types';

/**
 * Hand-authored level content. Kept separate from gameplay logic.
 * Early levels use clear, defensible associations.
 */
export const LEVELS: Level[] = [
  {
    id: 1,
    mistakeThreshold: 4,
    topics: [
      { id: 'furniture', category: 'FURNITURE', words: ['chair', 'table', 'sofa'], hint: 'You sit or rest on these at home.' },
      { id: 'fruit', category: 'FRUIT', words: ['apple', 'banana', 'cherry'], hint: 'Sweet things that grow on trees and plants.' },
      { id: 'weather', category: 'WEATHER', words: ['rain', 'snow', 'wind'], hint: 'Look out the window to check these.' },
      { id: 'colours', category: 'COLOURS', words: ['red', 'blue', 'green'], hint: 'You see them in a rainbow.' }
    ]
  },
  {
    id: 2,
    mistakeThreshold: 4,
    topics: [
      { id: 'music', category: 'MUSIC', words: ['guitar', 'drum', 'piano'], hint: 'You can play tunes on these.' },
      { id: 'animals', category: 'ANIMALS', words: ['lion', 'shark', 'eagle'], hint: 'Living creatures from land, sea and sky.' },
      { id: 'jobs', category: 'JOBS', words: ['doctor', 'chef', 'farmer'], hint: 'What people do for a living.' },
      { id: 'sports', category: 'SPORTS', words: ['tennis', 'golf', 'boxing'], hint: 'Games played for exercise or competition.' }
    ]
  },
  {
    id: 3,
    mistakeThreshold: 3,
    topics: [
      { id: 'kitchen', category: 'KITCHEN', words: ['spoon', 'kettle', 'oven'], hint: 'Find them where meals are made.' },
      { id: 'travel', category: 'TRAVEL', words: ['airport', 'ticket', 'suitcase'], hint: 'You need these when going far away.' },
      { id: 'body', category: 'BODY', words: ['elbow', 'ankle', 'thumb'], hint: 'Parts of you that bend or grip.' },
      { id: 'night', category: 'NIGHT', words: ['moon', 'owl', 'midnight'], hint: 'They appear when the sun goes down.' }
    ]
  }
];
