import type { Level } from './types';

/**
 * Hand-authored level content. Kept separate from gameplay logic.
 * Early levels use clear, defensible associations; later levels
 * introduce slightly more indirect associations, per the design spec.
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
  },
  {
    id: 4,
    mistakeThreshold: 3,
    topics: [
      { id: 'coffee', category: 'COFFEE', words: ['espresso', 'mug', 'barista'], hint: 'Order these at a café counter.' },
      { id: 'ocean', category: 'OCEAN', words: ['wave', 'coral', 'anchor'], hint: 'Found in or on the deep blue sea.' },
      { id: 'school', category: 'SCHOOL', words: ['homework', 'chalk', 'backpack'], hint: 'Carry or do these between classes.' },
      { id: 'camping', category: 'CAMPING', words: ['tent', 'torch', 'marshmallow'], hint: 'Pack them for a night under the stars.' }
    ]
  },
  {
    id: 5,
    mistakeThreshold: 3,
    topics: [
      { id: 'money', category: 'MONEY', words: ['penny', 'wallet', 'invoice'], hint: 'You spend, save, or pay with these.' },
      { id: 'garden', category: 'GARDEN', words: ['trowel', 'seedling', 'lawnmower'], hint: 'Tools and starts for growing green things.' },
      { id: 'cinema', category: 'CINEMA', words: ['popcorn', 'trailer', 'credits'], hint: 'The lights dim and these appear.' },
      { id: 'winter', category: 'WINTER', words: ['scarf', 'icicle', 'sled'], hint: 'Brrr — cold-season companions.' }
    ]
  },
  {
    id: 6,
    mistakeThreshold: 3,
    topics: [
      { id: 'mail', category: 'MAIL', words: ['stamp', 'envelope', 'postbox'], hint: 'Send a letter with all three.' },
      { id: 'doctor', category: 'DOCTOR', words: ['stethoscope', 'waiting room', 'prescription'], hint: 'You encounter these at a check-up.' },
      { id: 'baking', category: 'BAKING', words: ['flour', 'yeast', 'rolling pin'], hint: 'Combine them before the oven does its work.' },
      { id: 'music-making', category: 'ORCHESTRA', words: ['violin', 'conductor', 'overture'], hint: 'The concert hall fills with these.' }
    ]
  },
  {
    id: 7,
    mistakeThreshold: 2,
    topics: [
      { id: 'sailing', category: 'SAILING', words: ['helmsman', 'jib', 'starboard'], hint: 'Say them aboard a boat.' },
      { id: 'chess', category: 'CHESS', words: ['rook', 'gambit', 'checkmate'], hint: 'Terms from the checkered board.' },
      { id: 'typography', category: 'TYPESETTING', words: ['serif', 'kerning', 'glyph'], hint: 'Designers of printed letters know these.' },
      { id: 'volcano', category: 'VOLCANO', words: ['magma', 'crater', 'eruption'], hint: 'The mountain wakes with these.' }
    ]
  }
];
