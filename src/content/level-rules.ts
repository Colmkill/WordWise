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
  airport: 2, astrology: 2, bank: 2, barbecue: 2, bicycle: 2, boating: 2, body: 2, calendar: 2, castle: 2,
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
  sewing_equipment: 2, meteorological_measurement: 4, breadmaking_technique: 3,
  gemstone_cutting: 4, printmaking_method: 4, bookbinding_craft: 4,
  medieval_weaponry: 4, leathercraft: 3, beekeeping_products: 2, calligraphy_technique: 3,

  // 5 = obscure, expert-level vocabulary
  glassblowing: 5, horology: 5, linguistics: 5, mycology: 5, ornithology: 5, sailing: 5,
  typography: 5,
  ancient_wonders: 3, modern_wonders: 3, famous_palaces: 3, famous_temples: 3,
  famous_statues: 3, famous_memorials: 3, famous_towers: 3, famous_museums: 3,
  famous_gardens: 2, famous_fountains: 2, famous_ruins: 3, unesco_sites: 3,
  famous_waterfalls: 2, famous_canyons: 2, famous_caves: 2, famous_lakes: 2,
  coastal_formations: 2, national_parks: 2, famous_islands: 2,
  archaeological_discoveries: 4,
  capital_cities: 2, countries_by_continent: 2, geographic_features: 2, borders: 2,
  landforms: 2, climate_regions: 2, biomes: 2, time_zones: 3, islands_by_type: 2,
  mountain_ranges: 2, rivers_by_continent: 2, deserts_by_continent: 2, lakes_by_continent: 2,
  seas_and_gulfs: 2, straits_and_channels: 2, peninsulas_and_capes: 2,
  cities_by_population: 2, historic_cities: 2, port_cities: 2, mountain_cities: 2,
  island_capitals: 2, cities_with_canals: 2, cities_known_for_architecture: 2,
  place_name_origins: 3, place_names_by_language: 3,
  words_ending_in_out: 2, words_ending_in_ing: 2, words_ending_in_ight: 2,
  words_ending_in_ound: 2, words_ending_in_ake: 2, words_ending_in_ash: 2,
  words_ending_in_ate: 2, words_ending_in_tion: 2, words_ending_in_ment: 2,
  words_ending_in_ness: 2, words_ending_in_ship: 2, words_ending_in_hood: 2,
  words_ending_in_ward: 2, words_ending_in_wise: 2, words_ending_in_er: 2,
  words_ending_in_est: 2, words_ending_in_ed: 2, words_ending_in_ly: 2,
  words_ending_in_y: 2, rhymes_with_light: 3, rhymes_with_stone: 3,
  rhymes_with_train: 3, rhymes_with_sound: 3, rhymes_with_green: 3,
  rhymes_with_bright: 3, rhymes_with_night: 3, rhymes_with_chair: 3,
  rhymes_with_flame: 3, rhymes_with_dream: 3, rhymes_with_cold: 3,
  rhymes_with_sweet: 3, rhymes_with_round: 3, rhymes_with_time: 3,
  rhymes_with_blue: 3, rhymes_with_star: 3, rhymes_with_gold: 3,
  rhymes_with_face: 3, rhymes_with_bell: 3, rhymes_with_play: 3,
  mystical_expressions: 3, enchanted_objects: 3, magical_ingredients: 3,
  magical_creatures: 3, supernatural_beings: 3, legendary_spirits: 3,
  ghostly_phenomena: 3, haunted_locations: 3, supernatural_encounters: 3,
  strange_omens: 3, prophetic_visions: 3, divination_methods: 3,
  fortune_telling_traditions: 3, mystical_symbols: 3, ancient_mystical_traditions: 4,
  magical_transformations: 3, curses_and_enchantments: 3, protective_charms: 3,
  magical_ceremonies: 3, mystical_landscapes: 3, otherworldly_realms: 4,
  legendary_underworlds: 4, celestial_beings: 4, demonic_figures: 4,
  angels_in_mythology: 4, trickster_spirits: 3, shape_shifting_beings: 3,
  legendary_guardians: 3, creatures_of_the_night: 3, supernatural_powers: 3,
  psychic_phenomena: 3, extrasensory_perception: 3, astral_projection: 4,
  premonitions: 3, apparitions: 3, spectral_phenomena: 3, folkloric_monsters: 3,
  legendary_sea_creatures: 3, mythical_birds: 3, legendary_serpents: 3,
  magical_plants: 3, alchemical_symbolism: 4, occult_terminology: 4,
  esoteric_traditions: 4, mystical_poetry: 3, supernatural_folklore: 3,
  greek_mythology: 3, roman_mythology: 3, norse_mythology: 3,
  egyptian_mythology: 3, celtic_mythology: 3, japanese_mythology: 3,
  chinese_mythology: 3, hindu_mythology: 3, aboriginal_dreaming: 4,
  polynesian_mythology: 3, african_mythology: 3, mesoamerican_mythology: 3,
  slavic_folklore: 3, arthurian_legends: 3, legendary_heroes: 3,
  legendary_villains: 3, legendary_kings_queens: 3, mythological_weapons: 3,
  mythological_animals: 3, mythological_transformations: 3, legendary_quests: 3,
  legendary_treasures: 3, legendary_cities: 3, creation_myths: 4,
  flood_myths: 4, underworld_myths: 4, trickster_tales: 3,
  heroic_trials: 3, legendary_prophecies: 3, folktale_characters: 3,
  folktale_settings: 3, traditional_fairy_tale_characters: 2,
  fairy_tale_objects: 2, fairy_tale_transformations: 3,
  folkloric_explanations: 3, legendary_monsters: 3,
  famous_legendary_journeys: 3, mythological_family_relationships: 4,
  legendary_origins_of_constellations: 4,
  palindromes: 2, homophones: 2, homographs: 2, homonyms: 2, heteronyms: 3,
  contronyms: 3, anagrams: 2, portmanteau_words: 2, onomatopoeia: 2, oxymorons: 3,
  spoonerisms: 3, malapropisms: 3, pangrams: 3, lipograms: 4, acrostics: 3,
  alliteration: 2, assonance: 3, consonance: 3, rebus_puzzles: 3, double_entendres: 3,
  compound_words: 1, contractions: 2, abbreviations: 2, acronyms: 2, initialisms: 2,
  eponyms: 3, loanwords: 2, words_derived_from_people: 3, words_derived_from_places: 3,
  words_with_multiple_meanings: 2, words_with_unexpected_origins: 3,
  words_with_unusual_spelling: 3, words_with_pronunciation_differences: 3,
  words_with_silent_initial_letters: 3, words_with_silent_final_letters: 3,
  words_with_alternative_spellings: 3, words_that_look_alike: 3, words_that_sound_alike: 2,
  words_that_change_meaning_with_stress: 4, words_with_unusual_grammatical_role: 4,
  words_that_can_be_multiple_parts_of_speech: 3, words_hidden_inside_other_words: 3,
  words_formed_from_initials: 3, words_created_by_blending: 3,
  words_that_are_nouns_and_verbs: 2, words_with_misleading_appearances: 3,
  unusually_long_english_words: 4, unusually_short_english_words: 1, rare_english_words: 4,
  words_with_an_unusual_grammatical_role: 4,
  words_that_function_as_multiple_parts_of_speech: 3,
  words_with_unusual_letter_combinations: 4, words_with_repeated_syllables: 3,
  words_with_three_syllables: 2, words_with_four_syllables: 2,
  words_with_the_same_number_of_letters: 2, words_with_the_same_number_of_syllables: 2,
  words_that_change_meaning_with_one_letter: 3, words_formed_by_adding_a_prefix: 2,
  words_formed_by_adding_a_suffix: 2, words_with_unusual_plural_forms: 3,
  words_with_unusual_past_tense_forms: 3, words_with_multiple_accepted_pronunciations: 3,
  words_with_no_direct_translation: 4, false_friends_between_languages: 3,
  types_of_semantic_change: 4, types_of_word_formation: 3, types_of_grammatical_construction: 4,
  types_of_translation_challenge: 4,
  common_idioms: 2, unusual_idioms: 3, idioms_involving_animals: 2,
  idioms_involving_food: 2, idioms_involving_weather: 2, idioms_involving_body_parts: 2,
  idioms_involving_colours: 2, idioms_involving_money: 2, idioms_involving_travel: 2,
  idioms_involving_time: 2, idioms_involving_clothing: 2, idioms_involving_household_objects: 2,
  idioms_involving_nature: 2, idioms_involving_sport: 2,
  expressions_about_emotions: 2, expressions_about_luck: 2, expressions_about_deception: 3,
  expressions_about_success: 2, expressions_about_failure: 2, expressions_about_conflict: 2,
  expressions_about_friendship: 2, expressions_about_secrecy: 3, expressions_about_confusion: 2,
  expressions_about_impatience: 2, expressions_about_surprise: 2,
  traditional_proverbs: 2, proverbs_from_around_the_world: 3,
  sayings_about_wisdom: 2, sayings_about_work: 2, sayings_about_relationships: 2,
  sayings_about_money: 2, sayings_about_learning: 2, sayings_about_nature: 2,
  sayings_about_time: 2, sayings_about_risk: 2,
  common_catchphrases: 2, famous_quotations_by_theme: 3,
  shakespearean_expressions: 3, latin_expressions: 3, french_expressions: 3,
  legal_expressions: 3, medical_expressions: 3, nautical_expressions: 3,
  military_expressions: 3, business_expressions: 2,
  slang_by_generation: 2, regional_english_expressions: 2,
  australian_expressions: 2, british_expressions: 2, american_expressions: 2,
  tongue_twisters: 2, rhyming_sayings: 2, traditional_riddles: 3,
  double_meaning_expressions: 2
};

/** The rule band covering a given level number, if any. */
export function bandFor(levelId: number): LevelBand | undefined {
  return BANDS.find((b) => levelId >= b.from && levelId <= b.to);
}
