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
  double_meaning_expressions: 2,
  ancient_egyptian_civilisation: 3, ancient_greek_civilisation: 3, ancient_roman_civilisation: 3,
  ancient_mesopotamia: 3, ancient_persia: 3, ancient_china: 3,
  ancient_india: 3, ancient_japan: 3, ancient_african_kingdoms: 4,
  ancient_mesoamerican_civilisations: 4, the_viking_age: 3, medieval_europe: 3,
  medieval_occupations: 3, medieval_daily_life: 3, medieval_clothing: 3,
  medieval_entertainment: 3, medieval_law_and_justice: 3, medieval_trade: 3,
  the_renaissance: 3, the_age_of_exploration: 3, the_industrial_revolution: 3,
  the_enlightenment: 3, the_history_of_printing: 3, the_history_of_navigation: 3,
  the_history_of_medicine: 3, the_history_of_transportation: 3, the_history_of_communication: 3,
  the_history_of_photography: 3, the_history_of_cinema: 3, the_history_of_aviation: 3,
  the_history_of_computing: 3, the_history_of_money: 3, the_history_of_banking: 3,
  the_history_of_education: 3, the_history_of_fashion: 2, the_history_of_food_preservation: 3,
  the_history_of_musical_instruments: 3, the_history_of_timekeeping: 3,
  the_history_of_cartography: 3, the_history_of_writing_systems: 3,
  ancient_writing_materials: 4, ancient_measurement_systems: 4,
  historical_trade_routes: 3, historical_empires_by_region: 3,
  historical_inventions_by_period: 3, famous_historical_discoveries: 3,
  famous_explorers: 2, famous_inventors: 2, famous_archaeologists: 3,
  historical_diplomatic_events: 3, historical_revolutions: 3, historical_treaties: 3,
  historical_court_cases: 4, historical_mysteries: 3, lost_civilisations: 4,
  historical_occupations: 3, historical_forms_of_entertainment: 3,
  historical_forms_of_punishment: 3, historical_clothing_and_accessories: 3,
  historical_household_objects: 3,
  traditional_dishes_by_country: 2, traditional_dishes_by_continent: 2,
  regional_australian_foods: 2, famous_national_desserts: 2,
  traditional_breads_by_country: 2, traditional_soups_by_country: 2,
  traditional_noodles_by_country: 2, traditional_dumplings_by_country: 2,
  traditional_rice_dishes: 2, traditional_pasta_dishes: 2,
  traditional_sauces: 2, traditional_condiments: 2,
  traditional_breakfast_foods: 2, traditional_festive_foods: 2,
  street_foods_by_country: 2, foods_associated_with_festivals: 2,
  foods_associated_with_regions: 2, famous_cheeses_by_country: 2,
  famous_pastries_by_country: 2, famous_confectionery_by_country: 2,
  traditional_cooking_methods: 2, food_preservation_methods: 2,
  fermented_foods_by_culture: 3, pickled_foods: 2, smoked_foods: 2,
  cured_foods: 2, foods_made_from_legumes: 2, foods_made_from_grains: 2,
  foods_made_from_nuts: 2, foods_made_from_tropical_fruit: 3,
  foods_made_from_root_vegetables: 2, edible_flowers: 3, edible_sea_plants: 3,
  unusual_ingredients: 3, culinary_herbs_by_region: 2, spice_blends_by_country: 2,
  types_of_vinegar: 2, types_of_cooking_oil: 2, types_of_sweetener: 2,
  types_of_flour: 2, types_of_pastry: 2, types_of_cake: 2,
  types_of_biscuit: 2, types_of_pudding: 2, types_of_noodle: 2,
  types_of_dumpling: 2, types_of_flatbread: 2, types_of_sandwich: 2,
  types_of_salad: 2, types_of_relish: 3, types_of_chutney: 3,
  types_of_stock_and_broth: 2, types_of_culinary_garnish: 2,
  food_texture_terminology: 3, food_aroma_terminology: 3,
  culinary_techniques_by_cuisine: 2, regional_food_markets: 2,
  traditional_food_utensils_by_culture: 2, famous_food_inventions: 3,
  culinary_terminology_by_language: 3,
  types_of_cloud: 2, types_of_atmospheric_phenomenon: 2, types_of_mineral_formation: 3,
  types_of_rock_formation: 2, types_of_volcanic_eruption: 3, types_of_volcanic_landform: 2,
  types_of_geological_fold: 3, types_of_geological_fault: 2, types_of_cave_formation: 3,
  types_of_coastal_erosion: 2, types_of_weathering: 2, types_of_soil: 2,
  types_of_sediment: 2, types_of_fossilisation: 3, types_of_natural_crystal: 2,
  types_of_glacial_landform: 2, types_of_earthquake_wave: 3, types_of_ocean_circulation: 2,
  types_of_marine_habitat: 2, types_of_freshwater_habitat: 2, types_of_optical_phenomenon: 2,
  types_of_electromagnetic_radiation: 3, types_of_particle: 3, types_of_nuclear_reaction: 3,
  types_of_chemical_bond: 2, types_of_chemical_reaction: 2, types_of_chemical_separation: 2,
  types_of_laboratory_apparatus: 2, types_of_spectroscopy: 3, types_of_crystalline_structure: 2,
  types_of_material_property: 2, types_of_thermodynamic_process: 3, types_of_mechanical_motion: 2,
  types_of_wave: 2, types_of_energy_transfer: 2, types_of_electrical_component: 2,
  types_of_magnetic_material: 2, types_of_scientific_measurement: 2,
  types_of_biological_tissue: 2, types_of_cell_structure: 2, types_of_genetic_mutation: 3,
  types_of_ecological_relationship: 2, types_of_symbiosis: 2, types_of_animal_adaptation: 2,
  types_of_plant_adaptation: 2, types_of_seed_dispersal: 2, types_of_pollination: 2,
  types_of_animal_communication: 2, types_of_animal_migration: 2,
  types_of_biological_reproduction: 2, types_of_animal_camouflage: 2, types_of_mimicry: 2,
  types_of_seed: 2, types_of_pollination_syndrome: 3, types_of_marine_invertebrate: 2,
  types_of_microscopic_organism: 2, types_of_parasite: 2, types_of_biological_toxin: 3,
  types_of_ecological_succession: 3, types_of_conservation_status: 2,
  meteorological_instruments: 2, seismological_instruments: 3, oceanographic_instruments: 2,
  archaeological_dating_methods: 3, forensic_analysis_techniques: 3,
  cartographic_symbols: 2, surveying_instruments: 2, horological_mechanisms: 2,
  printing_techniques: 2, textile_production_techniques: 2, leatherworking_techniques: 2,
  bookbinding_techniques: 2, calligraphy_styles: 2, gemstone_cutting_techniques: 2,
  metalworking_techniques: 2, glassmaking_techniques: 2,
  ceramics_and_firing_techniques: 2, traditional_shipbuilding_methods: 2,
  historical_agricultural_techniques: 2, scientific_classification_systems: 2, types_of_woodworking_tool: 2, types_of_woodworking_technique: 2, types_of_woodworking_joint: 2,
  types_of_wood_finish: 2, types_of_wood: 2, types_of_saw: 2, types_of_chisel: 2,
  types_of_hammer: 2, types_of_plane: 2, types_of_woodworking_clamp: 2,
  types_of_woodworking_measurement_tool: 2, types_of_metalworking_tool: 2,
  types_of_metalworking_technique: 2, types_of_metal: 2, types_of_anvil: 3,
  types_of_forge: 3, types_of_blacksmithing_tool: 3, types_of_welding: 2,
  types_of_soldering: 2, types_of_jewellery_making_technique: 2, types_of_gemstone: 2,
  types_of_jewellery_finding: 2, types_of_engraving_tool: 2, types_of_textile: 2,
  types_of_fibre: 2, types_of_weaving_technique: 2, types_of_knitting_technique: 2,
  types_of_weaving_loom: 2, types_of_knitting_needle: 2, types_of_embroidery_stitch: 2,
  types_of_sewing_technique: 2, types_of_sewing_machine: 2, types_of_sewing_notion: 2,
  types_of_leather: 2, types_of_leatherworking_tool: 2, types_of_leather_finish: 2,
  types_of_leather_stitch: 2, types_of_pottery: 2, types_of_clay: 2,
  types_of_pottery_technique: 2, types_of_glaze: 2, types_of_kiln: 2,
  types_of_glass: 2, types_of_glassmaking_tool: 2, types_of_glassblowing_technique: 2,
  types_of_stained_glass_technique: 2, types_of_paper: 2, types_of_papermaking_technique: 2,
  types_of_bookbinding_technique: 2, types_of_bookbinding_material: 2,
  types_of_printmaking_technique: 2, types_of_printmaking_tool: 2, types_of_ink: 2,
  types_of_pigment: 2, types_of_paint: 2, types_of_painting_technique: 2,
  types_of_brush: 2, types_of_canvas: 2, types_of_sculpting_material: 2,
  types_of_sculpting_tool: 2, types_of_sculpting_technique: 2, types_of_stone: 2,
  types_of_stonemasonry_tool: 2, types_of_stonemasonry_technique: 2,
  types_of_rope: 2, types_of_knot: 2, types_of_basket: 2,
  types_of_basket_weaving_technique: 2, types_of_basket_material: 2,
  types_of_traditional_toy: 2, types_of_puppet: 2, types_of_puppetry_technique: 2,
  types_of_candle: 2, types_of_candlemaking_technique: 2, types_of_soap: 2,
  types_of_soapmaking_technique: 2, types_of_perfume: 2, types_of_perfumery_technique: 2,
  types_of_traditional_craft_by_region: 2, types_of_artisan_tool: 2,
  types_of_handicraft_technique: 2, types_of_traditional_pattern: 2, types_of_folk_art: 2,

  // Occupations & Professional Specialties (category 12)
  unusual_modern_occupations: 2,
  maritime_occupations: 3,
  railway_occupations: 3,
  aviation_occupations: 3,
  agricultural_occupations: 2,
  forestry_occupations: 3,
  mining_occupations: 3,
  printing_occupations: 3,
  textile_occupations: 3,
  traditional_craft_occupations: 3,
  museum_occupations: 3,
  archaeological_occupations: 4,
  conservation_occupations: 4,
  scientific_research_occupations: 4,
  laboratory_occupations: 4,
  weather_service_occupations: 4,
  cartographic_occupations: 4,
  geological_occupations: 4,
  food_production_occupations: 2,
  culinary_occupations: 2,
  theatre_occupations: 2,
  film_production_occupations: 2,
  publishing_occupations: 3,
  music_industry_occupations: 2,
  legal_specialties: 4,
  financial_specialties: 4,
  engineering_specialties: 4,
  medical_specialties: 4,
  veterinary_specialties: 4,
  environmental_specialties: 4,
  emergency_service_occupations: 2,
  diplomatic_occupations: 3,
  translation_occupations: 3,
  archival_occupations: 4,
  rare_collecting_professions: 4,
  historical_court_occupations: 3,
  royal_household_occupations: 3,
  traditional_ceremonial_occupations: 3,
  specialist_inspection_occupations: 4,
  types_of_antique_furniture: 2, types_of_vintage_clothing: 2,
  types_of_collectible_coin: 2, types_of_collectible_stamp: 2, types_of_rare_book: 3,
  types_of_manuscript: 3, types_of_historical_document: 3, types_of_antique_map: 3,
  types_of_antique_globe: 3, types_of_antique_clock: 2, types_of_antique_watch: 2,
  types_of_vintage_camera: 2, types_of_antique_musical_instrument: 2,
  types_of_antique_weapon: 2, types_of_antique_jewellery: 2, types_of_antique_toy: 2,
  types_of_antique_doll: 2, types_of_antique_glassware: 2, types_of_antique_porcelain: 2,
  types_of_antique_silverware: 2, types_of_collectible_figures: 2,
  types_of_collectible_card: 2, types_of_miniature: 2, types_of_model_kit: 2,
  types_of_rare_postcard: 2, types_of_rare_photograph: 3, types_of_antique_textile: 3,
  types_of_antique_tapestry: 3, types_of_antique_rug: 2, types_of_antique_quilt: 2,
  types_of_collectible_bottle: 2, types_of_collectible_jar: 2, types_of_rare_mineral: 3,
  types_of_rare_fossil: 3, types_of_unusual_rock_formation: 2,
  types_of_geological_specimen: 2, types_of_botanical_specimen: 2,
  types_of_pressed_flower: 2, types_of_herbarium_sheet: 3,
  types_of_antique_scientific_instrument: 3, types_of_antique_medical_equipment: 3,
  types_of_antique_navigation_tool: 3, types_of_antique_writing_instrument: 2,
  types_of_unusual_household_object: 2, types_of_obsolete_technology: 2,
  types_of_vintage_advertising: 2, types_of_collectible_packaging: 2,
  types_of_emotion: 2, types_of_personality_trait: 2, types_of_virtue: 2,
  types_of_vice: 2, types_of_philosophical_concept: 3, types_of_ethical_dilemma: 3,
  types_of_logical_fallacy: 3, types_of_argument: 2, types_of_belief_system: 3,
  types_of_worldview: 3, types_of_spiritual_tradition: 2, types_of_meditation_practice: 2,
  types_of_mindfulness_technique: 2, types_of_moral_philosophy: 3,
  types_of_political_philosophy: 3, types_of_aesthetic_philosophy: 3,
  types_of_existential_question: 3, types_of_metaphysical_concept: 3,
  types_of_epistemological_concept: 3, types_of_ontological_concept: 3,
  types_of_philosophical_argument: 3, types_of_thought_experiment: 3,
  types_of_paradox: 2, types_of_cognitive_bias: 2, types_of_reasoning_error: 2,
  types_of_decision_making_strategy: 2, types_of_problem_solving_approach: 2,
  types_of_creativity_technique: 2, types_of_learning_style: 2,
  types_of_memory_technique: 2, types_of_concentration_technique: 2,
  types_of_relaxation_technique: 2, types_of_stress_management_technique: 2,
  types_of_coping_strategy: 2, types_of_motivational_technique: 2,
  types_of_goal_setting_method: 2, types_of_time_management_method: 2,
  types_of_organizational_method: 2, types_of_study_technique: 2,
  types_of_note_taking_method: 2, types_of_reading_strategy: 2,
  types_of_listening_skill: 2, types_of_communication_barrier: 2,
  literary_genres: 2, fictional_character_archetypes: 2, hero_archetypes: 2,
  villain_archetypes: 2, fictional_character_motivations: 2, common_story_structures: 2,
  narrative_perspectives: 2, plot_devices: 2, literary_themes: 2,
  literary_symbolism: 3, literary_movements: 3, types_of_narrator: 2,
  types_of_conflict_in_fiction: 2, types_of_fictional_setting: 2,
  types_of_fictional_society: 2, types_of_fictional_government: 2,
  types_of_fictional_technology: 2, types_of_fictional_transport: 2,
  types_of_fictional_weapon: 2, types_of_fictional_creature: 2,
  types_of_fictional_power: 2, types_of_fictional_curse: 2,
  types_of_fictional_prophecy: 2, types_of_fictional_quest: 2,
  types_of_fictional_mystery: 2, types_of_fictional_detective: 2,
  types_of_fictional_clue: 2, types_of_unreliable_narrator: 3,
  types_of_dramatic_irony: 3, types_of_literary_allusion: 3,
  famous_fictional_cities: 2, famous_fictional_islands: 2,
  famous_fictional_kingdoms: 2, famous_fictional_schools: 2,
  famous_fictional_inventions: 2, famous_fictional_organisations: 2,
  famous_fictional_sidekicks: 2, famous_fictional_mentors: 2,
  famous_fictional_disguises: 2, famous_fictional_disguises_and_identities: 2,
  famous_literary_rivalries: 3, famous_fictional_journeys: 2,
  famous_literary_opening_techniques: 3, famous_endings_in_literature: 2,
  storytelling_traditions_by_culture: 3, oral_storytelling_forms: 2,
  types_of_traditional_tale: 2,

  // Ratings for the Music, Nature, Language, Games, Space, Law, Economics, Architecture,
  // Tradition and Rare-vocabulary categories (added with their word banks).
  musical_instruments_by_family: 2, traditional_instruments_by_country: 2,
  traditional_instruments_by_continent: 2, unusual_musical_instruments: 2,
  historical_musical_instruments: 3, percussion_instruments_by_type: 2,
  string_instruments_by_construction: 3, wind_instruments_by_mechanism: 3,
  electronic_instruments_by_type: 3, musical_performance_techniques: 3, musical_notation_symbols: 3,
  musical_tempo_terms: 3, musical_dynamics_terms: 3, musical_texture_terms: 3, musical_forms: 3,
  musical_structures: 3, musical_scales: 3, musical_modes: 3, rhythm_patterns: 3,
  rhythmic_terminology: 3, vocal_techniques: 2, vocal_classifications: 3, choir_types: 2,
  opera_terminology: 3, orchestral_terminology: 3, jazz_styles: 2, folk_music_traditions: 2,
  world_music_traditions: 2, dance_styles_by_region: 2, traditional_dance_forms: 2,
  traditional_ceremonial_music: 3, types_of_percussion_pattern: 3, musical_recording_techniques: 3,
  sound_engineering_terminology: 3, audio_effects: 3, acoustic_phenomena: 3,
  types_of_musical_improvisation: 3, musical_genres_by_historical_period: 3,
  musical_terminology_borrowed_from_italian: 3, musical_terminology_borrowed_from_french: 4,
  unusual_natural_phenomena: 2, bioluminescent_organisms: 2, natural_optical_phenomena: 3,
  atmospheric_optical_phenomena: 3, types_of_aurora: 3, types_of_cloud_formation: 2,
  types_of_precipitation: 2, types_of_wind: 2, types_of_storm: 2, types_of_frost: 2,
  types_of_ice_formation: 2, types_of_tidal_phenomenon: 3, types_of_coastal_habitat: 2,
  types_of_wetland: 2, types_of_forest_ecosystem: 2, types_of_grassland: 2,
  types_of_desert_ecosystem: 2, types_of_mountain_ecosystem: 2, types_of_freshwater_ecosystem: 2,
  types_of_deep_sea_habitat: 3, types_of_coral_formation: 3, types_of_animal_migration_pattern: 2,
  types_of_animal_defence: 2, types_of_camouflage: 2, types_of_plant_pollination: 2,
  types_of_plant_movement: 3, types_of_plant_defence: 2, types_of_geological_formation: 2,
  types_of_mineral_deposit: 3, types_of_glacial_feature: 3, types_of_fossil_preservation: 3,
  types_of_natural_hazard: 2, types_of_extinction_event: 3, types_of_ecological_restoration: 3,
  unusual_adaptations_in_nature: 3, organisms_with_unusual_life_cycles: 3,
  organisms_with_unusual_survival_strategies: 3, natural_phenomena_named_after_people: 3,
  natural_phenomena_named_after_places: 3, writing_systems_by_type: 3, ancient_writing_systems: 3,
  alphabets_by_language: 3, non_alphabetic_writing_systems: 3, historical_scripts: 3,
  cuneiform_terminology: 5, hieroglyphic_terminology: 5, calligraphic_traditions_by_culture: 3,
  languages_written_from_right_to_left: 3, languages_with_unusual_grammatical_structures: 3,
  languages_with_grammatical_gender: 3, languages_with_extensive_case_systems: 4,
  languages_with_unusual_number_systems: 4, language_families: 3, language_isolates: 5,
  endangered_languages: 3, constructed_languages: 3, sign_languages: 3, braille_terminology: 3,
  phonetic_alphabet_terminology: 3, word_origins_by_language: 3, words_borrowed_from_arabic: 2,
  words_borrowed_from_french: 2, words_borrowed_from_italian: 2, words_borrowed_from_japanese: 2,
  words_borrowed_from_spanish: 2, words_borrowed_from_indigenous_languages: 2,
  words_derived_from_mythology: 3, words_derived_from_historical_figures: 3,
  words_derived_from_place_names: 3, words_whose_meanings_have_changed_over_time: 3,
  words_with_obsolete_meanings: 3, archaic_english_words: 3, regional_vocabulary: 2,
  dialect_words_by_region: 3, language_change_terminology: 4, types_of_word_puzzle: 2,
  types_of_logic_puzzle: 3, types_of_number_puzzle: 2, types_of_visual_puzzle: 2,
  types_of_mechanical_puzzle: 2, types_of_cipher: 3, types_of_code: 3, types_of_cryptogram: 3,
  types_of_riddle: 2, types_of_brainteaser: 2, types_of_board_game_mechanic: 3,
  types_of_card_game_mechanic: 3, traditional_games_by_country: 2, traditional_childrens_games: 2,
  traditional_playground_games: 2, traditional_party_games: 2, historical_games: 3,
  ancient_board_games: 3, strategy_game_terminology: 3, role_playing_game_terminology: 3,
  tabletop_game_components: 2, types_of_maze: 2, types_of_labyrinth: 2, types_of_pattern_puzzle: 2,
  types_of_sequence_puzzle: 2, types_of_deduction_puzzle: 3, types_of_word_transformation: 2,
  types_of_anagram_challenge: 2, types_of_hidden_word_puzzle: 2, types_of_spatial_puzzle: 2,
  types_of_matching_puzzle: 2, types_of_classification_challenge: 2, types_of_memory_game: 2,
  types_of_dexterity_game: 2, types_of_probability_game: 3, types_of_bluffing_game: 2,
  types_of_cooperative_game: 2, types_of_competitive_game: 2, puzzle_solving_terminology: 3,
  types_of_recreational_mathematics: 3, famous_space_missions: 2,
  historical_astronomical_discoveries: 3, famous_observatories: 3, space_exploration_milestones: 2,
  types_of_space_probe: 2, types_of_scientific_satellite_mission: 3,
  types_of_astronomical_observation: 3, types_of_astronomical_instrument: 3,
  types_of_celestial_object: 2, types_of_stellar_remnant: 3, types_of_planetary_feature: 2,
  types_of_planetary_atmosphere: 3, types_of_planetary_geology: 3,
  types_of_orbital_configuration: 4, types_of_space_propulsion: 3, types_of_space_habitat: 2,
  types_of_space_suit_component: 3, types_of_spacecraft_instrument: 3,
  types_of_extraterrestrial_environment: 2, types_of_astronomical_event: 3,
  types_of_cosmic_radiation: 4, types_of_stellar_classification: 4,
  types_of_galaxy_classification: 4, types_of_exoplanet: 3, types_of_planetary_moon: 2,
  types_of_meteorite: 3, types_of_impact_crater: 3, types_of_space_weather: 3,
  types_of_astronomical_measurement: 3, famous_astronomers: 2, famous_explorers_by_era: 2,
  famous_polar_expeditions: 2, famous_deep_sea_expeditions: 3, famous_cave_expeditions: 3,
  famous_mountain_expeditions: 2, famous_archaeological_expeditions: 3,
  famous_scientific_expeditions: 3, exploration_equipment_by_historical_period: 3,
  types_of_legal_profession: 2, types_of_court: 2, types_of_legal_proceeding: 3,
  types_of_legal_document: 2, types_of_legal_remedy: 3, types_of_legal_argument: 3,
  types_of_evidence_in_law: 3, types_of_witness: 2, types_of_judicial_decision: 3,
  types_of_legal_appeal: 3, types_of_legislation: 3, types_of_constitutional_arrangement: 3,
  types_of_government: 2, types_of_political_system: 2, types_of_electoral_system: 2,
  types_of_voting_method: 2, types_of_parliamentary_procedure: 3, types_of_legislative_committee: 3,
  types_of_diplomatic_role: 2, types_of_treaty: 3, types_of_international_organisation: 2,
  types_of_public_inquiry: 3, types_of_commission: 3, types_of_historical_trial: 3,
  types_of_historical_punishment: 2, types_of_legal_principle: 3, types_of_property_right: 3,
  types_of_intellectual_property: 3, types_of_international_law: 3,
  types_of_legal_latin_expression: 4, types_of_administrative_decision: 3,
  types_of_public_policy_instrument: 3, types_of_government_department: 2,
  types_of_public_institution: 2, historical_forms_of_currency: 2, historical_forms_of_payment: 2,
  types_of_coinage_by_era: 2, types_of_banknote: 2, types_of_monetary_standard: 3,
  types_of_financial_instrument: 3, types_of_investment_vehicle: 3, types_of_market_structure: 3,
  types_of_economic_system: 2, types_of_trade_route: 2, types_of_trading_post: 2,
  types_of_merchant_by_historical_period: 3, types_of_commercial_contract: 3, types_of_tax: 2,
  types_of_tariff: 3, types_of_subsidy: 3, types_of_economic_indicator: 3, types_of_inflation: 3,
  types_of_economic_crisis: 3, types_of_historical_financial_institution: 3, types_of_insurance: 2,
  types_of_credit_arrangement: 3, types_of_lending: 2, types_of_debt_instrument: 3,
  types_of_business_ownership: 2, types_of_business_partnership: 3, types_of_auction: 2,
  types_of_commodity: 2, types_of_precious_metal_standard: 3, types_of_barter_arrangement: 2,
  types_of_historical_trade_goods: 2, types_of_commercial_shipping_arrangement: 3,
  types_of_economic_theory: 3, types_of_economic_externality: 4, types_of_market_failure: 4,
  types_of_public_expenditure: 3, architectural_styles_by_historical_period: 3,
  architectural_styles_by_country: 3, architectural_styles_by_region: 3,
  traditional_houses_by_culture: 2, vernacular_architecture: 3,
  indigenous_architectural_traditions: 3, religious_architectural_styles: 3,
  industrial_architecture: 2, art_deco_design: 2, modernist_architecture: 3,
  brutalist_architecture: 3, gothic_architectural_features: 3, baroque_architectural_features: 3,
  classical_architectural_features: 3, islamic_architectural_features: 3,
  japanese_architectural_features: 3, chinese_architectural_features: 3,
  african_architectural_traditions: 3, polynesian_architectural_traditions: 3,
  traditional_building_materials: 2, traditional_roofing_methods: 2,
  structural_engineering_concepts: 3, decorative_architectural_details: 3,
  types_of_arch_construction: 3, types_of_roof: 2, types_of_staircase: 2, types_of_window: 2,
  types_of_door_construction: 2, types_of_flooring: 2, types_of_facade_treatment: 3,
  types_of_architectural_ornament: 3, types_of_public_square: 2, types_of_urban_planning: 3,
  types_of_garden_design: 2, types_of_landscape_design: 2, types_of_interior_design: 2,
  types_of_furniture_design: 2, types_of_industrial_design: 3, types_of_graphic_design: 2,
  types_of_typography: 3, types_of_visual_composition: 3, types_of_colour_scheme: 2,
  types_of_pattern_design: 2, types_of_textile_pattern: 2, traditional_greetings_by_culture: 2,
  traditional_hospitality_customs: 2, traditional_wedding_customs: 2,
  traditional_coming_of_age_ceremonies: 3, traditional_mourning_customs: 3,
  traditional_gift_giving_customs: 2, traditional_naming_customs: 3, traditional_food_etiquette: 2,
  traditional_table_settings: 2, traditional_clothing_by_occasion: 2,
  traditional_headwear_by_culture: 2, traditional_footwear_by_culture: 2,
  traditional_household_objects_by_culture: 2, traditional_sleeping_arrangements: 2,
  traditional_bathing_customs: 2, traditional_festival_customs: 2,
  traditional_seasonal_celebrations: 2, traditional_games_by_culture: 2,
  traditional_storytelling_customs: 2, traditional_music_making_customs: 2,
  traditional_dance_customs: 2, traditional_crafts_by_culture: 2, traditional_market_customs: 2,
  traditional_bargaining_customs: 2, traditional_transport_by_culture: 2,
  traditional_farming_practices: 2, traditional_fishing_practices: 2,
  traditional_food_preservation: 2, traditional_forms_of_shelter: 2,
  traditional_household_heating: 2, traditional_household_lighting: 2,
  traditional_forms_of_timekeeping: 3, traditional_forms_of_measurement: 3,
  traditional_social_titles: 3, traditional_systems_of_hospitality: 3,
  traditional_ceremonial_roles: 3, cultural_symbols_and_their_meanings: 3,
  traditional_patterns_and_motifs: 3, traditional_forms_of_ornamentation: 3,
  obsolete_household_objects: 2, obsolete_occupations: 3, obsolete_transport_terminology: 3,
  obsolete_technology: 2, obsolete_medical_terminology: 4, obsolete_printing_terminology: 4,
  obsolete_legal_terminology: 4, obsolete_military_terminology: 4, obsolete_measurements: 3,
  obsolete_currencies: 3, rare_historical_titles: 4, rare_geographical_terms: 4,
  rare_weather_terms: 4, rare_geological_terms: 4, rare_botanical_terms: 4,
  rare_zoological_terms: 4, rare_linguistic_terms: 5, rare_astronomical_terms: 4,
  rare_architectural_terms: 4, rare_musical_terms: 4, rare_culinary_terms: 4, rare_textile_terms: 4,
  rare_nautical_terms: 4, rare_horological_terms: 5, rare_collecting_terminology: 4,
  rare_historical_materials: 4, rare_scientific_instruments: 4, rare_natural_phenomena: 4,
  rare_types_of_mineral: 4, rare_types_of_gemstone: 4, rare_forms_of_craftsmanship: 4,
  rare_historical_games: 4, rare_forms_of_literature: 4, rare_rhetorical_devices: 5,
  rare_grammatical_constructions: 5, rare_philosophical_concepts: 5,
  rare_terms_for_human_behaviour: 4, rare_terms_for_sounds: 4, rare_terms_for_light: 4,
  rare_terms_for_movement: 4, rare_terms_for_shape: 4, rare_terms_for_texture: 4,
  rare_terms_for_colour: 4, rare_terms_for_smell: 4, rare_terms_for_atmospheric_conditions: 4,
  rare_terms_for_water_movement: 4, rare_terms_for_landforms: 4, international_phonetic_symbols: 5,
  types_of_erosion: 2, types_of_natural_disturbance: 3, types_of_symbiotic_relationship: 2,
};

/** The rule band covering a given level number, if any. */
export function bandFor(levelId: number): LevelBand | undefined {
  return BANDS.find((b) => levelId >= b.from && levelId <= b.to);
}
