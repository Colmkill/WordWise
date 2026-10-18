import type { Level } from './types';
import { buildLevels, type LevelBlueprint } from './core/level-builder';
import { WORD_BANKS } from './content/word-banks';
import { LEVEL_SEED } from './config';

/**
 * Level blueprints: concept curation only. Word lists are drawn
 * deterministically from the concept word banks by the level builder
 * (see core/level-builder.ts and content/level-rules.ts). Hints and
 * difficulty remain per-instance editorial metadata; the category comes
 * from the concept registry. Level ids are append-only: never reorder or
 * renumber existing ids, because checkpoints key on level numbers.
 */
export const BLUEPRINTS: LevelBlueprint[] = [
  {
    id: 1,
    mistakeThreshold: 4,
    topics: [
      { id: 'furniture', concept: 'furniture', hint: 'You sit or rest on these at home.', difficulty: 1, status: 'reviewed', count: 3 },
      { id: 'fruit', concept: 'fruit', hint: 'Sweet things that grow on trees and plants.', difficulty: 1, status: 'reviewed', count: 3 },
      { id: 'weather', concept: 'weather', hint: 'Look out the window to check these.', difficulty: 1, status: 'reviewed', count: 3 },
      { id: 'colours', concept: 'colours', hint: 'You see them in a rainbow.', difficulty: 1, status: 'reviewed', count: 4 }
    ]
  },
  {
    id: 2,
    mistakeThreshold: 4,
    topics: [
      { id: 'music', concept: 'music', hint: 'You can play tunes on these.', difficulty: 2, status: 'reviewed', count: 3 },
      { id: 'animals', concept: 'animals', hint: 'Living creatures from land, sea and sky.', difficulty: 1, status: 'reviewed', count: 3 },
      { id: 'jobs', concept: 'jobs', hint: 'What people do for a living.', difficulty: 2, status: 'reviewed', count: 3 },
      { id: 'sports', concept: 'sports', hint: 'Games played for exercise or competition.', difficulty: 2, status: 'reviewed', count: 3 }
    ]
  },
  {
    id: 3,
    mistakeThreshold: 3,
    topics: [
      { id: 'kitchen', concept: 'kitchen', hint: 'Find them where meals are made.', difficulty: 2, status: 'reviewed', count: 3 },
      { id: 'travel', concept: 'travel', hint: 'You need these when going far away.', difficulty: 2, status: 'reviewed', count: 3 },
      { id: 'body', concept: 'body', hint: 'Parts of you that bend or grip.', difficulty: 2, status: 'reviewed', count: 3 },
      { id: 'night', concept: 'night', hint: 'They appear when the sun goes down.', difficulty: 3, status: 'reviewed', count: 3 }
    ]
  },
  {
    id: 4,
    mistakeThreshold: 3,
    topics: [
      { id: 'coffee', concept: 'coffee', hint: 'Order these at a cafe counter.', difficulty: 2, status: 'reviewed', count: 3 },
      { id: 'ocean', concept: 'ocean', hint: 'Found in or on the deep blue sea.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'school', concept: 'school', hint: 'Carry or do these between classes.', difficulty: 2, status: 'reviewed', count: 3 },
      { id: 'camping', concept: 'camping', hint: 'Pack them for a night under the stars.', difficulty: 3, status: 'reviewed', count: 3 }
    ]
  },
  {
    id: 5,
    mistakeThreshold: 3,
    topics: [
      { id: 'money', concept: 'money', hint: 'You spend, save, or pay with these.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'garden', concept: 'garden', hint: 'Tools and starts for growing green things.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'cinema', concept: 'cinema', hint: 'The lights dim and these appear.', difficulty: 2, status: 'reviewed', count: 3 },
      { id: 'winter', concept: 'winter', hint: 'Brrr - cold-season companions.', difficulty: 3, status: 'reviewed', count: 3 }
    ]
  },
  {
    id: 6,
    mistakeThreshold: 3,
    topics: [
      { id: 'mail', concept: 'mail', hint: 'Send a letter with all three.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'doctor', concept: 'doctor', hint: 'You encounter these at a check-up.', difficulty: 4, status: 'reviewed', count: 3 },
      { id: 'baking', concept: 'baking', hint: 'Combine them before the oven does its work.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'music-making', concept: 'orchestra', hint: 'The concert hall fills with these.', difficulty: 4, status: 'reviewed', count: 3 }
    ]
  },
  {
    id: 7,
    mistakeThreshold: 2,
    topics: [
      { id: 'sailing', concept: 'sailing', hint: 'Say them aboard a boat.', difficulty: 5, status: 'reviewed', count: 3 },
      { id: 'chess', concept: 'chess', hint: 'Terms from the checkered board.', difficulty: 4, status: 'reviewed', count: 3 },
      { id: 'typography', concept: 'typography', hint: 'Designers of printed letters know these.', difficulty: 5, status: 'reviewed', count: 3 },
      { id: 'volcano', concept: 'volcano', hint: 'The mountain wakes with these.', difficulty: 4, status: 'reviewed', count: 3 }
    ]
  },
  {
    id: 8,
    mistakeThreshold: 3,
    topics: [
      { id: 'fruit-2', concept: 'fruit', hint: 'More sweet picks from the produce aisle.', difficulty: 2, status: 'reviewed', count: 3 },
      { id: 'weather-2', concept: 'weather', hint: 'The grey-day moods of the sky.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'body-2', concept: 'body', hint: 'Points that bend, lift, or take a step.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'kitchen-2', concept: 'kitchen', hint: 'Gear that lives beside the stove.', difficulty: 3, status: 'reviewed', count: 3 }
    ]
  },
  {
    id: 9,
    mistakeThreshold: 3,
    topics: [
      { id: 'animals-2', concept: 'animals', hint: 'Creatures of field, forest, and stream.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'music-2', concept: 'music', hint: 'Strings you bow or strum.', difficulty: 4, status: 'reviewed', count: 3 },
      { id: 'travel-2', concept: 'travel', hint: 'Paperwork and rides for a trip abroad.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'garden-2', concept: 'garden', hint: 'They help a plot flourish.', difficulty: 3, status: 'reviewed', count: 3 }
    ]
  },
  {
    id: 10,
    mistakeThreshold: 3,
    topics: [
      { id: 'jobs-2', concept: 'jobs', hint: 'Trades that people train for.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'sports-2', concept: 'sports', hint: 'Events you might watch at the summer games.', difficulty: 4, status: 'reviewed', count: 3 },
      { id: 'money-2', concept: 'money', hint: 'Words from your bank statement.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'cinema-2', concept: 'cinema', hint: 'Roll them at the picture house.', difficulty: 3, status: 'reviewed', count: 3 }
    ]
  },
  {
    id: 11,
    mistakeThreshold: 2,
    topics: [
      { id: 'winter-2', concept: 'winter', hint: 'Signs of the bundled-up season.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'ocean-2', concept: 'ocean', hint: 'Shallow, clingy, and daily - all beside the sea.', difficulty: 3, status: 'reviewed', count: 3 },
      { id: 'mail-2', concept: 'mail', hint: 'They travel with a package.', difficulty: 4, status: 'reviewed', count: 3 },
      { id: 'school-2', concept: 'school', hint: 'Carried, kept, and attended on campus.', difficulty: 3, status: 'reviewed', count: 3 }
    ]
  },
  {
    id: 12,
    mistakeThreshold: 2,
    topics: [
      { id: 'typography-2', concept: 'typography', hint: 'Terms from a type specimen sheet.', difficulty: 5, status: 'reviewed', count: 4 },
      { id: 'chess-2', concept: 'chess', hint: 'Deeper waters of the checkered board.', difficulty: 5, status: 'reviewed', count: 4 },
      { id: 'volcano-2', concept: 'volcano', hint: 'Vocabulary of an awakening peak.', difficulty: 5, status: 'reviewed', count: 5 },
      { id: 'orchestra-2', concept: 'orchestra', hint: 'Words you meet in the score and on stage.', difficulty: 5, status: 'reviewed', count: 5 }
    ]
  },
  {
    id: 13,
    mistakeThreshold: 2,
    topics: [
      { id: 'falconry', concept: 'falconry', hint: 'Tools of the hawk handler.', difficulty: 4, status: 'draft', count: 3 },
      { id: 'watchmaking', concept: 'horology', hint: 'Tiny parts ticking inside the case.', difficulty: 5, status: 'draft', count: 3 },
      { id: 'beekeeping', concept: 'apiary', hint: 'Gear and goods from the bee yard.', difficulty: 4, status: 'draft', count: 3 },
      { id: 'cartography', concept: 'cartography', hint: 'Lines a mapmaker draws.', difficulty: 4, status: 'draft', count: 3 }
    ]
  },
  {
    id: 14,
    mistakeThreshold: 2,
    topics: [
      { id: 'fungi', concept: 'mycology', hint: 'Parts of the fungal world, magnified.', difficulty: 5, status: 'draft', count: 3 },
      { id: 'coins', concept: 'numismatics', hint: 'Terms a coin dealer knows.', difficulty: 4, status: 'draft', count: 3 },
      { id: 'winemaking', concept: 'oenology', hint: 'Words from the cellar door.', difficulty: 4, status: 'draft', count: 3 },
      { id: 'glasswork', concept: 'glassblowing', hint: 'Steps and tools at the hot shop.', difficulty: 5, status: 'draft', count: 3 }
    ]
  },
  {
    id: 15,
    mistakeThreshold: 2,
    topics: [
      { id: 'orchestra-3', concept: 'orchestra', hint: 'Markings and moments on the concert programme.', difficulty: 5, status: 'draft', count: 4 },
      { id: 'chess-3', concept: 'chess', hint: 'Vocabulary of forced positions from deep study of the board.', difficulty: 5, status: 'draft', count: 3 },
      { id: 'alchemy', concept: 'alchemy', hint: 'The old laboratory sought transformation with these.', difficulty: 4, status: 'draft', count: 3 },
      { id: 'taxonomy', concept: 'taxonomy', hint: 'How a species gets its scientific name.', difficulty: 4, status: 'draft', count: 3 }
    ]
  }
];

export const LEVELS: Level[] = buildLevels(BLUEPRINTS, WORD_BANKS, LEVEL_SEED);
