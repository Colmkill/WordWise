import type { Level } from './types';

/**
 * Hand-authored level content. Kept separate from gameplay logic.
 * Every topic references a reusable concept from src/content/concepts.ts;
 * word lists and hints are level-specific instances of that concept.
 * difficulty is a reviewed 1–5 estimate for this instance, not the concept.
 * Early levels use clear, defensible associations; later levels
 * introduce slightly more indirect associations, per the design spec.
 */
export const LEVELS: Level[] = [
  {
    id: 1,
    mistakeThreshold: 4,
    topics: [
      { id: 'furniture', concept: 'furniture', category: 'FURNITURE', words: ['chair', 'table', 'sofa'], hint: 'You sit or rest on these at home.', difficulty: 1, status: 'reviewed' },
      { id: 'fruit', concept: 'fruit', category: 'FRUIT', words: ['apple', 'banana', 'cherry'], hint: 'Sweet things that grow on trees and plants.', difficulty: 1, status: 'reviewed' },
      { id: 'weather', concept: 'weather', category: 'WEATHER', words: ['rain', 'snow', 'wind'], hint: 'Look out the window to check these.', difficulty: 1, status: 'reviewed' },
      { id: 'colours', concept: 'colours', category: 'COLOURS', words: ['red', 'blue', 'green'], hint: 'You see them in a rainbow.', difficulty: 1, status: 'reviewed' }
    ]
  },
  {
    id: 2,
    mistakeThreshold: 4,
    topics: [
      { id: 'music', concept: 'music', category: 'MUSIC', words: ['guitar', 'drum', 'piano'], hint: 'You can play tunes on these.', difficulty: 2, status: 'reviewed' },
      { id: 'animals', concept: 'animals', category: 'ANIMALS', words: ['lion', 'shark', 'eagle'], hint: 'Living creatures from land, sea and sky.', difficulty: 1, status: 'reviewed' },
      { id: 'jobs', concept: 'jobs', category: 'JOBS', words: ['doctor', 'chef', 'farmer'], hint: 'What people do for a living.', difficulty: 2, status: 'reviewed' },
      { id: 'sports', concept: 'sports', category: 'SPORTS', words: ['tennis', 'golf', 'boxing'], hint: 'Games played for exercise or competition.', difficulty: 2, status: 'reviewed' }
    ]
  },
  {
    id: 3,
    mistakeThreshold: 3,
    topics: [
      { id: 'kitchen', concept: 'kitchen', category: 'KITCHEN', words: ['spoon', 'kettle', 'oven'], hint: 'Find them where meals are made.', difficulty: 2, status: 'reviewed' },
      { id: 'travel', concept: 'travel', category: 'TRAVEL', words: ['airport', 'ticket', 'suitcase'], hint: 'You need these when going far away.', difficulty: 2, status: 'reviewed' },
      { id: 'body', concept: 'body', category: 'BODY', words: ['elbow', 'ankle', 'thumb'], hint: 'Parts of you that bend or grip.', difficulty: 2, status: 'reviewed' },
      { id: 'night', concept: 'night', category: 'NIGHT', words: ['moon', 'owl', 'midnight'], hint: 'They appear when the sun goes down.', difficulty: 3, status: 'reviewed' }
    ]
  },
  {
    id: 4,
    mistakeThreshold: 3,
    topics: [
      { id: 'coffee', concept: 'coffee', category: 'COFFEE', words: ['espresso', 'mug', 'barista'], hint: 'Order these at a café counter.', difficulty: 2, status: 'reviewed' },
      { id: 'ocean', concept: 'ocean', category: 'OCEAN', words: ['wave', 'coral', 'anchor'], hint: 'Found in or on the deep blue sea.', difficulty: 3, status: 'reviewed' },
      { id: 'school', concept: 'school', category: 'SCHOOL', words: ['homework', 'chalk', 'backpack'], hint: 'Carry or do these between classes.', difficulty: 2, status: 'reviewed' },
      { id: 'camping', concept: 'camping', category: 'CAMPING', words: ['tent', 'torch', 'marshmallow'], hint: 'Pack them for a night under the stars.', difficulty: 3, status: 'reviewed' }
    ]
  },
  {
    id: 5,
    mistakeThreshold: 3,
    topics: [
      { id: 'money', concept: 'money', category: 'MONEY', words: ['penny', 'wallet', 'invoice'], hint: 'You spend, save, or pay with these.', difficulty: 3, status: 'reviewed' },
      { id: 'garden', concept: 'garden', category: 'GARDEN', words: ['trowel', 'seedling', 'lawnmower'], hint: 'Tools and starts for growing green things.', difficulty: 3, status: 'reviewed' },
      { id: 'cinema', concept: 'cinema', category: 'CINEMA', words: ['popcorn', 'trailer', 'credits'], hint: 'The lights dim and these appear.', difficulty: 2, status: 'reviewed' },
      { id: 'winter', concept: 'winter', category: 'WINTER', words: ['scarf', 'icicle', 'sled'], hint: 'Brrr — cold-season companions.', difficulty: 3, status: 'reviewed' }
    ]
  },
  {
    id: 6,
    mistakeThreshold: 3,
    topics: [
      { id: 'mail', concept: 'mail', category: 'MAIL', words: ['stamp', 'envelope', 'postbox'], hint: 'Send a letter with all three.', difficulty: 3, status: 'reviewed' },
      { id: 'doctor', concept: 'doctor', category: 'DOCTOR', words: ['stethoscope', 'waiting room', 'prescription'], hint: 'You encounter these at a check-up.', difficulty: 4, status: 'reviewed' },
      { id: 'baking', concept: 'baking', category: 'BAKING', words: ['flour', 'yeast', 'rolling pin'], hint: 'Combine them before the oven does its work.', difficulty: 3, status: 'reviewed' },
      { id: 'music-making', concept: 'orchestra', category: 'ORCHESTRA', words: ['violin', 'conductor', 'overture'], hint: 'The concert hall fills with these.', difficulty: 4, status: 'reviewed' }
    ]
  },
  {
    id: 7,
    mistakeThreshold: 2,
    topics: [
      { id: 'sailing', concept: 'sailing', category: 'SAILING', words: ['helmsman', 'jib', 'starboard'], hint: 'Say them aboard a boat.', difficulty: 5, status: 'reviewed' },
      { id: 'chess', concept: 'chess', category: 'CHESS', words: ['rook', 'gambit', 'checkmate'], hint: 'Terms from the checkered board.', difficulty: 4, status: 'reviewed' },
      { id: 'typography', concept: 'typography', category: 'TYPESETTING', words: ['serif', 'kerning', 'glyph'], hint: 'Designers of printed letters know these.', difficulty: 5, status: 'reviewed' },
      { id: 'volcano', concept: 'volcano', category: 'VOLCANO', words: ['magma', 'crater', 'eruption'], hint: 'The mountain wakes with these.', difficulty: 4, status: 'reviewed' }
    ]
  }
];
