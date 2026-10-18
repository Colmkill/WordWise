/**
 * Approved word banks per concept, keyed by concept slug (see concepts.ts).
 *
 * Bank order is the familiarity ranking: the most familiar, canonical words
 * come first. The level builder always draws from the most familiar eligible
 * words, capped by the level band's rank ceiling, and reuse of a concept
 * excludes its previously drawn words - so later instances of the same concept
 * automatically reach deeper (more obscure) ranks. Adding a word to a bank
 * makes it available to future levels without any other change.
 *
 * A bank is required only for concepts actually referenced by level
 * blueprints; the 193 unused registry concepts need no bank until used.
 */
export const WORD_BANKS: Record<string, string[]> = {
  furniture: ['chair', 'table', 'sofa'],
  fruit: ['apple', 'banana', 'cherry', 'pear', 'plum', 'mango'],
  weather: ['rain', 'snow', 'wind', 'fog', 'hail', 'drizzle'],
  colours: ['red', 'yellow', 'blue', 'green'],
  music: ['guitar', 'drum', 'piano', 'viola', 'cello', 'banjo'],
  animals: ['lion', 'shark', 'eagle', 'fox', 'deer', 'trout'],
  jobs: ['doctor', 'chef', 'farmer', 'plumber', 'tailor', 'pilot'],
  sports: ['tennis', 'golf', 'boxing', 'archery', 'relay', 'rowing'],
  kitchen: ['spoon', 'kettle', 'oven', 'skillet', 'spatula', 'colander'],
  travel: ['airport', 'ticket', 'suitcase', 'passport', 'ferry', 'itinerary'],
  body: ['elbow', 'ankle', 'thumb', 'wrist', 'shoulder', 'heel'],
  night: ['moon', 'owl', 'midnight'],
  coffee: ['espresso', 'mug', 'barista'],
  ocean: ['wave', 'coral', 'anchor', 'lagoon', 'barnacle', 'tide'],
  school: ['homework', 'chalk', 'backpack', 'atlas', 'locker', 'lecture'],
  camping: ['tent', 'torch', 'marshmallow'],
  money: ['penny', 'wallet', 'invoice', 'refund', 'deposit', 'budget'],
  garden: ['trowel', 'seedling', 'lawnmower', 'hoe', 'compost', 'trellis'],
  cinema: ['popcorn', 'trailer', 'credits', 'reel', 'sequel', 'screening'],
  winter: ['scarf', 'icicle', 'sled', 'blizzard', 'mittens', 'frost'],
  mail: ['stamp', 'envelope', 'postbox', 'parcel', 'courier', 'postmark'],
  doctor: ['stethoscope', 'waiting room', 'prescription'],
  baking: ['flour', 'yeast', 'rolling pin'],
  orchestra: ['violin', 'conductor', 'overture', 'coda', 'pizzicato', 'crescendo', 'downbeat', 'encore', 'cadenza', 'glissando', 'timpani', 'attacca'],
  sailing: ['helmsman', 'jib', 'starboard'],
  chess: ['rook', 'gambit', 'checkmate', 'endgame', 'tempo', 'stalemate', 'fianchetto', 'zugzwang', 'zwischenzug', 'en passant'],
  typography: ['serif', 'kerning', 'glyph', 'italic', 'ligature', 'baseline', 'descender'],
  volcano: ['magma', 'crater', 'eruption', 'fumarole', 'pumice', 'vent', 'caldera', 'lahar'],
  falconry: ['jess', 'hood', 'creance'],
  horology: ['escapement', 'mainspring', 'tourbillon'],
  apiary: ['smoker', 'extractor', 'propolis'],
  cartography: ['meridian', 'isobar', 'sounding'],
  mycology: ['mycelium', 'hyphae', 'sporocarp'],
  numismatics: ['obverse', 'mule', 'planchet'],
  oenology: ['lees', 'terroir', 'malolactic'],
  glassblowing: ['punty', 'gather', 'annealing'],
  alchemy: ['alembic', 'calcination', 'quintessence'],
  taxonomy: ['genus', 'binomial', 'type specimen']
};
