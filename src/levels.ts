import type { Level } from './types';

/**
 * Hand-authored level content. Kept separate from gameplay logic.
 * Every topic references a reusable concept from src/content/concepts.ts;
 * word lists and hints are level-specific instances of that concept.
 * difficulty is a reviewed 1–5 estimate for this instance, not the concept.
 * Levels 8–12 reuse existing concepts with fresh word lists, and later
 * levels mix group sizes (3–5 words) within a level.
 * Level ids are append-only: never reorder or renumber existing ids,
 * because checkpoints key on level numbers.
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
  },
  {
    id: 8,
    mistakeThreshold: 3,
    topics: [
      { id: 'fruit-2', concept: 'fruit', category: 'FRUIT', words: ['pear', 'plum', 'mango'], hint: 'More sweet picks from the produce aisle.', difficulty: 2, status: 'reviewed' },
      { id: 'weather-2', concept: 'weather', category: 'WEATHER', words: ['fog', 'hail', 'drizzle'], hint: 'The grey-day moods of the sky.', difficulty: 3, status: 'reviewed' },
      { id: 'body-2', concept: 'body', category: 'BODY', words: ['wrist', 'shoulder', 'heel'], hint: 'Points that bend, lift, or take a step.', difficulty: 3, status: 'reviewed' },
      { id: 'kitchen-2', concept: 'kitchen', category: 'KITCHEN', words: ['skillet', 'spatula', 'colander'], hint: 'Gear that lives beside the stove.', difficulty: 3, status: 'reviewed' }
    ]
  },
  {
    id: 9,
    mistakeThreshold: 3,
    topics: [
      { id: 'animals-2', concept: 'animals', category: 'ANIMALS', words: ['fox', 'deer', 'trout'], hint: 'Creatures of field, forest, and stream.', difficulty: 3, status: 'reviewed' },
      { id: 'music-2', concept: 'music', category: 'MUSIC', words: ['viola', 'cello', 'banjo'], hint: 'Strings you bow or strum.', difficulty: 4, status: 'reviewed' },
      { id: 'travel-2', concept: 'travel', category: 'TRAVEL', words: ['passport', 'ferry', 'itinerary'], hint: 'Paperwork and rides for a trip abroad.', difficulty: 3, status: 'reviewed' },
      { id: 'garden-2', concept: 'garden', category: 'GARDEN', words: ['hoe', 'compost', 'trellis'], hint: 'They help a plot flourish.', difficulty: 3, status: 'reviewed' }
    ]
  },
  {
    id: 10,
    mistakeThreshold: 3,
    topics: [
      { id: 'jobs-2', concept: 'jobs', category: 'JOBS', words: ['plumber', 'tailor', 'pilot'], hint: 'Trades that people train for.', difficulty: 3, status: 'reviewed' },
      { id: 'sports-2', concept: 'sports', category: 'SPORTS', words: ['archery', 'relay', 'rowing'], hint: 'Events you might watch at the summer games.', difficulty: 4, status: 'reviewed' },
      { id: 'money-2', concept: 'money', category: 'MONEY', words: ['refund', 'deposit', 'budget'], hint: 'Words from your bank statement.', difficulty: 3, status: 'reviewed' },
      { id: 'cinema-2', concept: 'cinema', category: 'CINEMA', words: ['reel', 'sequel', 'screening'], hint: 'Roll them at the picture house.', difficulty: 3, status: 'reviewed' }
    ]
  },
  {
    id: 11,
    mistakeThreshold: 2,
    topics: [
      { id: 'winter-2', concept: 'winter', category: 'WINTER', words: ['blizzard', 'mittens', 'frost'], hint: 'Signs of the bundled-up season.', difficulty: 3, status: 'reviewed' },
      { id: 'ocean-2', concept: 'ocean', category: 'OCEAN', words: ['lagoon', 'barnacle', 'tide'], hint: 'Shallow, clingy, and daily — all beside the sea.', difficulty: 3, status: 'reviewed' },
      { id: 'mail-2', concept: 'mail', category: 'MAIL', words: ['parcel', 'courier', 'postmark'], hint: 'They travel with a package.', difficulty: 4, status: 'reviewed' },
      { id: 'school-2', concept: 'school', category: 'SCHOOL', words: ['atlas', 'locker', 'lecture'], hint: 'Carried, kept, and attended on campus.', difficulty: 3, status: 'reviewed' }
    ]
  },
  {
    id: 12,
    mistakeThreshold: 2,
    topics: [
      { id: 'typography-2', concept: 'typography', category: 'TYPESETTING', words: ['italic', 'ligature', 'baseline', 'descender'], hint: 'Terms from a type specimen sheet.', difficulty: 5, status: 'reviewed' },
      { id: 'chess-2', concept: 'chess', category: 'CHESS', words: ['endgame', 'tempo', 'stalemate', 'fianchetto'], hint: 'Deeper waters of the checkered board.', difficulty: 5, status: 'reviewed' },
      { id: 'volcano-2', concept: 'volcano', category: 'VOLCANO', words: ['fumarole', 'pumice', 'vent', 'caldera', 'lahar'], hint: 'Vocabulary of an awakening peak.', difficulty: 5, status: 'reviewed' },
      { id: 'orchestra-2', concept: 'orchestra', category: 'ORCHESTRA', words: ['coda', 'pizzicato', 'crescendo', 'downbeat', 'encore'], hint: 'Words you meet in the score and on stage.', difficulty: 5, status: 'reviewed' }
    ]
  }
];
