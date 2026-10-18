/**
 * Approved word banks per concept, keyed by concept slug (see concepts.ts).
 *
 * Bank order is the familiarity ranking: the most familiar, canonical words
 * come first. The level generator always draws from the most familiar
 * eligible words, capped by the level band's rank ceiling, and reuse of a
 * concept excludes its previously drawn words - so later instances of the
 * same concept automatically reach deeper (more obscure) ranks. Adding a
 * word to a bank makes it available to future levels without any other
 * change; the generator picks concepts and word counts automatically from
 * the rule bands (see content/level-rules.ts and core/level-builder.ts).
 *
 * A bank is required only for concepts the generator may draw on; the
 * remaining registry concepts need no bank until they are given one, at
 * which point the generator can start selecting them.
 */
export const WORD_BANKS: Record<string, string[]> = {
  furniture: ['chair', 'table', 'sofa', 'bed', 'desk', 'wardrobe', 'bookcase', 'armchair', 'nightstand', 'ottoman', 'bench'],
  fruit: ['apple', 'banana', 'cherry', 'pear', 'plum', 'mango', 'orange', 'peach', 'apricot', 'kiwi', 'fig', 'lime', 'nectarine'],
  weather: ['rain', 'snow', 'wind', 'fog', 'hail', 'drizzle', 'sunshine', 'thunder', 'cloud', 'breeze', 'storm', 'sleet'],
  colours: ['red', 'yellow', 'blue', 'green', 'purple', 'pink', 'brown', 'black', 'white', 'grey', 'violet'],
  music: ['guitar', 'drum', 'piano', 'viola', 'cello', 'banjo', 'flute', 'trumpet', 'harmonica', 'accordion', 'tambourine'],
  animals: ['lion', 'shark', 'eagle', 'fox', 'deer', 'trout', 'bear', 'wolf', 'rabbit', 'dolphin', 'snake', 'frog'],
  jobs: ['doctor', 'chef', 'farmer', 'plumber', 'tailor', 'pilot', 'teacher', 'nurse', 'builder', 'lawyer', 'painter', 'engineer'],
  sports: ['tennis', 'golf', 'boxing', 'archery', 'relay', 'rowing', 'soccer', 'marathon', 'javelin', 'volleyball', 'badminton', 'polo'],
  kitchen: ['spoon', 'kettle', 'oven', 'skillet', 'spatula', 'colander', 'fridge', 'blender', 'toaster', 'saucepan', 'ladle', 'chopping board'],
  travel: ['airport', 'ticket', 'suitcase', 'passport', 'ferry', 'itinerary', 'luggage', 'boarding pass', 'customs', 'visa', 'souvenir', 'journey'],
  body: ['elbow', 'ankle', 'thumb', 'wrist', 'shoulder', 'heel', 'knee', 'spine', 'palm', 'rib', 'hip', 'chin'],
  night: ['moon', 'owl', 'midnight', 'stars', 'darkness', 'firefly', 'twilight', 'moth'],
  coffee: ['espresso', 'mug', 'barista', 'latte', 'cappuccino', 'bean', 'crema', 'percolator', 'americano'],
  ocean: ['wave', 'coral', 'anchor', 'lagoon', 'barnacle', 'tide', 'seaweed', 'current', 'seabed', 'jellyfish', 'tsunami'],
  school: ['homework', 'chalk', 'backpack', 'atlas', 'locker', 'lecture', 'recess', 'pupil', 'whiteboard', 'exam', 'timetable', 'playground'],
  camping: ['tent', 'torch', 'marshmallow', 'campfire', 'canteen', 'compass', 'hammock', 'ranger', 'wilderness'],
  money: ['penny', 'wallet', 'invoice', 'refund', 'deposit', 'budget', 'cash', 'cheque', 'salary', 'tax', 'loan', 'interest'],
  garden: ['trowel', 'seedling', 'lawnmower', 'hoe', 'compost', 'trellis', 'rake', 'hedge', 'greenhouse', 'watering can', 'wheelbarrow', 'shrub'],
  cinema: ['popcorn', 'trailer', 'credits', 'reel', 'sequel', 'screening', 'actor', 'screen', 'premiere', 'matinee', 'usher', 'blockbuster'],
  winter: ['scarf', 'icicle', 'sled', 'blizzard', 'mittens', 'frost', 'snowflake', 'hibernate', 'chilly', 'earmuffs', 'cocoa'],
  mail: ['stamp', 'envelope', 'postbox', 'parcel', 'courier', 'postmark', 'postman', 'mailbox', 'delivery', 'airmail'],
  doctor: ['stethoscope', 'waiting room', 'prescription', 'syringe', 'bandage', 'thermometer', 'appointment', 'vaccination', 'scalpel'],
  baking: ['flour', 'yeast', 'rolling pin', 'dough', 'whisk', 'pastry', 'preheat', 'sourdough', 'crumb'],
  orchestra: ['violin', 'conductor', 'overture', 'coda', 'pizzicato', 'crescendo', 'downbeat', 'encore', 'cadenza', 'glissando', 'timpani', 'attacca'],
  sailing: ['helmsman', 'jib', 'starboard', 'mainsail', 'tiller', 'keel', 'regatta', 'boom', 'spinnaker'],
  chess: ['rook', 'gambit', 'checkmate', 'endgame', 'tempo', 'stalemate', 'fianchetto', 'zugzwang', 'zwischenzug', 'en passant'],
  typography: ['serif', 'kerning', 'glyph', 'italic', 'ligature', 'baseline', 'descender', 'leading', 'typeface', 'ascender', 'x-height', 'tracking'],
  volcano: ['magma', 'crater', 'eruption', 'fumarole', 'pumice', 'vent', 'caldera', 'lahar', 'ash', 'lava', 'fissure', 'tephra', 'dormant'],
  falconry: ['jess', 'hood', 'creance', 'mews', 'lure', 'bewit', 'eyas', 'haggard'],
  horology: ['escapement', 'mainspring', 'tourbillon', 'balance wheel', 'crown', 'bezel', 'complication', 'guilloche', 'rotor'],
  apiary: ['smoker', 'extractor', 'propolis', 'hive', 'nectar', 'queen bee', 'drone', 'swarm', 'foundation'],
  cartography: ['meridian', 'isobar', 'sounding', 'latitude', 'legend', 'scale', 'contour', 'projection', 'azimuth'],
  mycology: ['mycelium', 'hyphae', 'sporocarp', 'gills', 'spore', 'cap', 'mycorrhiza', 'lamella', 'fruiting body'],
  numismatics: ['obverse', 'mule', 'planchet', 'reverse', 'rim', 'reeding', 'grade', 'mintmark', 'exergue'],
  oenology: ['lees', 'terroir', 'malolactic', 'vintage', 'decant', 'must', 'brix', 'cuvee'],
  glassblowing: ['punty', 'gather', 'annealing', 'marver', 'glory hole', 'frit', 'block', 'parison', 'furnace'],
  alchemy: ['alembic', 'calcination', 'quintessence', 'crucible', 'elixir', 'tincture', 'vitriol', 'chrysopoeia'],
  taxonomy: ['genus', 'binomial', 'type specimen', 'phylum', 'order', 'family', 'species', 'subspecies', 'holotype']
};
