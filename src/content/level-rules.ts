/**
 * Procedural level-construction rules, driven by a difficulty curve. No
 * level is authored by hand: the generator (core/level-builder.ts) composes
 * each level from these bands plus the concept word banks
 * (content/word-banks.ts) and the concept registry (content/concepts.ts).
 *
 * The progression is defined by curveFor(levelId) rather than a hand-written
 * band table, so the game can extend to any level count (LEVEL_COUNT) with
 * small, incremental difficulty steps: six topics per level throughout, a
 * familiarity window that widens gradually, a concept-difficulty ceiling
 * that rises a notch every ten levels, and a word-count range that opens up
 * only late. Consecutive levels sharing identical curve parameters are
 * merged into BANDS rows automatically; the final row is open-ended so
 * bandFor keeps covering the last configured level.
 *
 * A band constrains: topic count, permitted concept difficulty, the
 * familiarity window (how deep into a bank the draw may reach), the
 * per-topic word-count range and the cross-topic ambiguity budget (how many
 * words banked by several concepts - see content/cross-topic.ts - a level
 * may claim). Concept difficulty, difficulty banding and the reserve rule
 * (hard concepts stay available for the final band) are what relegate
 * obscure topics to later levels.
 */
export interface LevelBand {
  /** Inclusive level-number range this band covers. */
  from: number;
  to: number;
  /** Required number of topic instances per level. */
  topics: number;
  /** Permitted concept difficulty range for this band. */
  difficulty: [number, number];
  /** Familiarity window [lo, hi) of bank ranks the draw prefers. */
  window: [number, number];
  /** Per-topic word-count range [min, max]. */
  countRange: [number, number];
  /**
   * Per-level budget of cross-topic word claims. Zero means no deliberate
   * ambiguity; the generator only seeks ambiguous words above zero.
   */
  ambiguity?: number;
}

/** How many levels the game ships. Raise it to extend the progression. */
export const LEVEL_COUNT = 100;

/**
 * The difficulty curve. Difficulty rises in small increments along five
 * independent axes so no single jump is abrupt:
 *  - topic count is constant (six) at every level;
 *  - the familiarity window widens by one bank rank every 12 levels;
 *  - the concept-difficulty ceiling rises a notch every 10 levels (the
 *    floor follows more slowly, from level 21, so easy topics keep
 *    appearing alongside harder ones);
 *  - the word-count range stays [3, 3] until level 50, then widens one
 *    step at a time up to the 3-7 content policy ceiling;
 *  - the cross-topic ambiguity budget rises from level 40, one extra
 *    claimed word every 15 levels, capped at 3 (a scarcity guard: the
 *    supply of intentionally ambiguous words is content-driven).
 */
export function curveFor(levelId: number): {
  topics: number;
  difficulty: [number, number];
  window: [number, number];
  countRange: [number, number];
  ambiguity: number;
} {
  return {
    topics: 6,
    difficulty: [
      levelId <= 20 ? 1 : Math.min(3, 1 + Math.floor((levelId - 20) / 60)),
      Math.min(5, 1 + Math.floor(levelId / 10))
    ],
    window: [0, Math.min(15, 3 + Math.floor(levelId / 12))],
    countRange: [3, Math.min(7, 3 + Math.floor(levelId / 50))],
    ambiguity: Math.min(3, Math.floor(Math.max(0, levelId - 40) / 15))
  };
}

/** Mistake allowance: generous at the start, tightening in two steps. */
function thresholdFor(levelId: number): number {
  return levelId <= 2 ? 4 : levelId <= 13 ? 3 : 2;
}

/**
 * Rule bands for the whole progression, computed from the curve. Levels
 * with identical curve parameters share one band row; the last row is
 * open-ended so bandFor covers every configured level.
 */
export const BANDS: LevelBand[] = (() => {
  const bands: LevelBand[] = [];
  let i = 1;
  while (i <= LEVEL_COUNT) {
    const c = curveFor(i);
    let j = i;
    while (j + 1 <= LEVEL_COUNT) {
      const n = curveFor(j + 1);
      if (
        n.topics !== c.topics ||
        n.difficulty[0] !== c.difficulty[0] ||
        n.difficulty[1] !== c.difficulty[1] ||
        n.window[0] !== c.window[0] ||
        n.window[1] !== c.window[1] ||
        n.countRange[0] !== c.countRange[0] ||
        n.countRange[1] !== c.countRange[1] ||
        n.ambiguity !== c.ambiguity
      ) {
        break;
      }
      j++;
    }
    bands.push({ from: i, to: j, ...c });
    i = j + 1;
  }
  bands[bands.length - 1].to = Number.POSITIVE_INFINITY;
  return bands;
})();

/**
 * Mistake threshold per level number, computed from thresholdFor. The
 * number of entries also defines how many levels are generated; raise
 * LEVEL_COUNT to extend the game.
 */
export const THRESHOLDS: Record<number, number> = Object.fromEntries(
  Array.from({ length: LEVEL_COUNT }, (_, i) => [i + 1, thresholdFor(i + 1)])
);

/** The cross-topic ambiguity budget of a given level number. */
export function ambiguityFor(levelId: number): number {
  return bandFor(levelId)?.ambiguity ?? 0;
}

/**
 * Editorial difficulty rating (1 = everyday, 5 = specialist) for every
 * banked concept. Drives which band a concept may appear in. Every concept
 * with a word bank MUST have an entry here, or the generator refuses to run.
 */
export const CONCEPT_DIFFICULTY: Record<string, number> = {
  // 1 = everyday, instantly familiar
  animals: 1, bathroom: 1, beach: 1, bedroom: 1, birds: 1, books: 1, candy: 1, cars: 1,
  cheese: 1, christmas: 1, city: 1, clothing: 1, colours: 1, cooking: 1, family: 1, farm: 1,
  flowers: 1, food: 1, football: 1, fruit: 1, furniture: 1, games: 1, hair: 1, holiday: 1,
  house: 1, nature: 1, pasta: 1, pets: 1, rain: 1, restaurant: 1, seasons: 1, shopping: 1,
  sleep: 1, spring: 1, summer: 1, supermarket: 1, swimming: 1, tea: 1, time: 1, toys: 1,
  trees: 1, vegetables: 1, weather: 1, zoo: 1,

  // 2 = common, familiar to most people
  airport: 2, bank: 2, barbecue: 2, bicycle: 2, boating: 2, body: 2, calendar: 2, castle: 2,
  cinema: 2, circus: 2, coffee: 2, computers: 2, cricket: 2, cycling: 2, dairy: 2, dance: 2,
  dentist: 2, desert: 2, dinosaurs: 2, drawing: 2, dreams: 2, education: 2, emotions: 2,
  fashion: 2, festival: 2, fire: 2, fishing: 2, forest: 2, golf: 2, health: 2, herbs: 2,
  history: 2, hockey: 2, horses: 2, hospital: 2, hotel: 2, insects: 2, internet: 2, islands: 2,
  jobs: 2, jungle: 2, kitchen: 2, landscape: 2, language: 2, library: 2, magic: 2, markets: 2,
  mountains: 2, museum: 2, music: 2, news: 2, office: 2, olympics: 2, painting: 2,
  photography: 2, picnic: 2, pirates: 2, planets: 2, police: 2, radio: 2, rivers: 2, rugby: 2,
  school: 2, science: 2, skiing: 2, space: 2, sports: 2, surfing: 2, technology: 2,
  telephone: 2, tennis: 2, theatre: 2, tools: 2, trains: 2, transport: 2, travel: 2,
  vehicles: 2, village: 2, weddings: 2, wine: 2, writing: 2, yoga: 2,

  // 3 = known, but with more specialised vocabulary
  archery: 3, athletics: 3, autumn: 3, baking: 3, ballet: 3, biology: 3, bridges: 3,
  camping: 3, carpentry: 3, chemistry: 3, climbing: 3, construction: 3, courtroom: 3,
  electricity: 3, energy: 3, engineering: 3, environment: 3, exploration: 3, factory: 3,
  fossils: 3, garden: 3, gemstones: 3, geography: 3, government: 3, grammar: 3,
  gymnastics: 3, harbour: 3, jazz: 3, jewellery: 3, knights: 3, knitting: 3, laboratory: 3,
  law: 3, lighthouse: 3, literature: 3, mail: 3, mathematics: 3, medicine: 3, metals: 3,
  military: 3, mining: 3, money: 3, mythology: 3, navigation: 3, night: 3, nutrition: 3,
  ocean: 3, opera: 3, parliament: 3, pharmacy: 3, physics: 3, plumbing: 3, poetry: 3,
  politics: 3, pottery: 3, railway: 3, religion: 3, sculpture: 3, spices: 3, stationery: 3,
  tourism: 3, university: 3, winter: 3, woodwork: 3,

  // 4 = specialist fields and technical hobbies
  aerospace: 4, alchemy: 4, algebra: 4, anatomy: 4, apiary: 4, archaeology: 4,
  architecture: 4, astronomy: 4, botany: 4, brewing: 4, cartography: 4, chess: 4, doctor: 4,
  ecology: 4, economics: 4, falconry: 4, folklore: 4, geology: 4, investing: 4,
  journalism: 4, logic: 4, manufacturing: 4, meteorology: 4, numismatics: 4, oenology: 4,
  orchestra: 4, philosophy: 4, psychology: 4, robotics: 4, tailoring: 4, taxonomy: 4,
  textiles: 4, veterinary: 4, volcano: 4,

  // 5 = obscure, expert-level vocabulary
  glassblowing: 5, horology: 5, linguistics: 5, mycology: 5, ornithology: 5, sailing: 5,
  typography: 5
};

/** The rule band covering a given level number, if any. */
export function bandFor(levelId: number): LevelBand | undefined {
  return BANDS.find((b) => levelId >= b.from && levelId <= b.to);
}
