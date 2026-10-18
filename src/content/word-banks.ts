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
  aerospace: ['rocket', 'satellite', 'spaceship', 'orbit', 'thruster', 'cockpit', 'fuselage', 'payload', 'spacecraft', 'turbine', 'airfoil', 'reentry'],
  airport: ['runway', 'terminal', 'hangar', 'baggage', 'departure', 'arrival', 'check-in', 'concourse', 'taxiway', 'carousel'],
  alchemy: ['alembic', 'calcination', 'quintessence', 'crucible', 'elixir', 'tincture', 'vitriol', 'chrysopoeia'],
  algebra: ['equation', 'variable', 'coefficient', 'polynomial', 'quadratic', 'exponent', 'factor', 'inequality', 'constant', 'numerator', 'denominator', 'function'],
  anatomy: ['skeleton', 'muscle', 'tendon', 'ligament', 'cartilage', 'artery', 'vein', 'organ', 'nerve', 'skull', 'sternum', 'diaphragm'],
  animals: ['lion', 'shark', 'eagle', 'fox', 'deer', 'trout', 'bear', 'wolf', 'rabbit', 'dolphin', 'snake', 'frog'],
  apiary: ['smoker', 'extractor', 'propolis', 'hive', 'nectar', 'queen bee', 'drone', 'swarm', 'foundation'],
  archaeology: ['excavation', 'artifact', 'fossil', 'stratum', 'pottery', 'relic', 'sarcophagus', 'inscription', 'ruins', 'shard', 'tomb'],
  archery: ['quiver', 'bowstring', 'bullseye', 'arrowhead', 'fletching', 'longbow', 'crossbow', 'nock', 'draw', 'target', 'release', 'limb'],
  architecture: ['blueprint', 'facade', 'column', 'archway', 'dome', 'cornice', 'balustrade', 'atrium', 'vault', 'pediment', 'buttress'],
  astronomy: ['nebula', 'galaxy', 'pulsar', 'quasar', 'eclipse', 'constellation', 'supernova', 'asteroid', 'comet', 'telescope', 'solstice', 'light-year'],
  athletics: ['sprint', 'hurdles', 'discus', 'shot put', 'long jump', 'high jump', 'pole vault', 'decathlon', 'steeplechase'],
  autumn: ['harvest', 'foliage', 'acorn', 'conker', 'pumpkin', 'bonfire', 'equinox', 'chestnut', 'leaf litter', 'mushroom', 'migration', 'scarecrow'],
  baking: ['flour', 'yeast', 'rolling pin', 'dough', 'whisk', 'pastry', 'preheat', 'sourdough', 'crumb'],
  ballet: ['plie', 'pirouette', 'tutu', 'barre', 'arabesque', 'pointe', 'tendu', 'chasse', 'pas de deux', 'releve', 'ballet flats', 'choreography'],
  bank: ['withdrawal', 'balance', 'savings', 'mortgage', 'overdraft', 'teller', 'ledger', 'transaction'],
  barbecue: ['grill', 'tongs', 'marinade', 'skewer', 'charcoal', 'brisket', 'sausage', 'sizzle', 'grate', 'barbecue sauce', 'embers'],
  bathroom: ['bathtub', 'shower', 'towel', 'soap', 'shampoo', 'toothbrush', 'toothpaste', 'mirror', 'washbasin', 'drain', 'bathmat', 'razor'],
  beach: ['sand', 'seashell', 'sunshade', 'sandcastle', 'seagull', 'surfboard', 'shoreline', 'suncream', 'dune', 'pebble', 'lifeguard'],
  bedroom: ['pillow', 'mattress', 'duvet', 'bedside table', 'alarm clock', 'blanket', 'headboard', 'pillowcase', 'nightlight', 'bedspread', 'drawers'],
  bicycle: ['pedal', 'handlebar', 'saddle', 'chain', 'spokes', 'helmet', 'brakes', 'gearshift', 'kickstand', 'tyre', 'bicycle pump', 'derailleur'],
  biology: ['cell', 'DNA', 'organism', 'evolution', 'ecosystem', 'bacteria', 'enzyme', 'chromosome', 'photosynthesis', 'mutation', 'mitochondria', 'metabolism'],
  birds: ['feather', 'nest', 'beak', 'wing', 'claw', 'plumage', 'perch', 'fledgling', 'eggshell', 'talon', 'songbird'],
  boating: ['oar', 'rudder', 'hull', 'lifejacket', 'mooring', 'buoy', 'outboard', 'dinghy', 'stern', 'bowline', 'lifebuoy'],
  body: ['elbow', 'ankle', 'thumb', 'wrist', 'shoulder', 'heel', 'knee', 'spine', 'palm', 'rib', 'hip', 'chin'],
  books: ['novel', 'chapter', 'bookmark', 'prologue', 'epilogue', 'hardcover', 'paperback', 'footnote', 'foreword', 'index', 'anthology', 'manuscript'],
  botany: ['stamen', 'pistil', 'sepal', 'petal', 'chlorophyll', 'rhizome', 'xylem', 'phloem', 'germination', 'pollination', 'cotyledon', 'herbarium'],
  brewing: ['malt', 'hops', 'fermentation', 'mash', 'wort', 'lager', 'ale', 'keg', 'barley', 'hydrometer', 'bottling'],
  bridges: ['arch', 'span', 'abutment', 'pier', 'cable', 'suspension', 'truss', 'girder', 'deck', 'viaduct', 'drawbridge'],
  camping: ['tent', 'torch', 'marshmallow', 'campfire', 'canteen', 'compass', 'hammock', 'ranger', 'wilderness'],
  cartography: ['meridian', 'isobar', 'sounding', 'latitude', 'legend', 'scale', 'contour', 'projection', 'azimuth'],
  chess: ['rook', 'gambit', 'checkmate', 'endgame', 'tempo', 'stalemate', 'fianchetto', 'zugzwang', 'zwischenzug', 'en passant'],
  cinema: ['popcorn', 'trailer', 'credits', 'reel', 'sequel', 'screening', 'actor', 'screen', 'premiere', 'matinee', 'usher', 'blockbuster'],
  coffee: ['espresso', 'mug', 'barista', 'latte', 'cappuccino', 'bean', 'crema', 'percolator', 'americano'],
  colours: ['red', 'yellow', 'blue', 'green', 'purple', 'pink', 'brown', 'black', 'white', 'grey', 'violet'],
  doctor: ['stethoscope', 'waiting room', 'prescription', 'syringe', 'bandage', 'thermometer', 'appointment', 'vaccination', 'scalpel'],
  falconry: ['jess', 'hood', 'creance', 'mews', 'lure', 'bewit', 'eyas', 'haggard'],
  furniture: ['chair', 'table', 'sofa', 'bed', 'desk', 'wardrobe', 'bookcase', 'armchair', 'nightstand', 'ottoman', 'bench'],
  garden: ['trowel', 'seedling', 'lawnmower', 'hoe', 'compost', 'trellis', 'rake', 'hedge', 'greenhouse', 'watering can', 'wheelbarrow', 'shrub'],
  glassblowing: ['punty', 'gather', 'annealing', 'marver', 'glory hole', 'frit', 'block', 'parison', 'furnace'],
  horology: ['escapement', 'mainspring', 'tourbillon', 'balance wheel', 'crown', 'bezel', 'complication', 'guilloche', 'rotor'],
  jobs: ['doctor', 'chef', 'farmer', 'plumber', 'tailor', 'pilot', 'teacher', 'nurse', 'builder', 'lawyer', 'painter', 'engineer'],
  kitchen: ['spoon', 'kettle', 'oven', 'skillet', 'spatula', 'colander', 'fridge', 'blender', 'toaster', 'saucepan', 'ladle', 'chopping board'],
  mail: ['stamp', 'envelope', 'postbox', 'parcel', 'courier', 'postmark', 'postman', 'mailbox', 'delivery', 'airmail'],
  money: ['penny', 'wallet', 'invoice', 'refund', 'deposit', 'budget', 'cash', 'cheque', 'salary', 'tax', 'loan', 'interest'],
  music: ['guitar', 'drum', 'piano', 'viola', 'cello', 'banjo', 'flute', 'trumpet', 'harmonica', 'accordion', 'tambourine'],
  mycology: ['mycelium', 'hyphae', 'sporocarp', 'gills', 'spore', 'cap', 'mycorrhiza', 'lamella', 'fruiting body'],
  night: ['moon', 'owl', 'midnight', 'stars', 'darkness', 'firefly', 'twilight', 'moth'],
  numismatics: ['obverse', 'mule', 'planchet', 'reverse', 'rim', 'reeding', 'grade', 'mintmark', 'exergue'],
  ocean: ['wave', 'coral', 'anchor', 'lagoon', 'barnacle', 'tide', 'seaweed', 'current', 'seabed', 'jellyfish', 'tsunami'],
  oenology: ['lees', 'terroir', 'malolactic', 'vintage', 'decant', 'must', 'brix', 'cuvee'],
  orchestra: ['violin', 'conductor', 'overture', 'coda', 'pizzicato', 'crescendo', 'downbeat', 'encore', 'cadenza', 'glissando', 'timpani', 'attacca'],
  school: ['homework', 'chalk', 'backpack', 'atlas', 'locker', 'lecture', 'recess', 'pupil', 'whiteboard', 'exam', 'timetable', 'playground'],
  sailing: ['helmsman', 'jib', 'starboard', 'mainsail', 'tiller', 'keel', 'regatta', 'boom', 'spinnaker'],
  sports: ['tennis', 'golf', 'boxing', 'archery', 'relay', 'rowing', 'soccer', 'marathon', 'javelin', 'volleyball', 'badminton', 'polo'],
  taxonomy: ['genus', 'binomial', 'type specimen', 'phylum', 'order', 'family', 'species', 'subspecies', 'holotype'],
  typography: ['serif', 'kerning', 'glyph', 'italic', 'ligature', 'baseline', 'descender', 'leading', 'typeface', 'ascender', 'x-height', 'tracking'],
  travel: ['airport', 'ticket', 'suitcase', 'passport', 'ferry', 'itinerary', 'luggage', 'boarding pass', 'customs', 'visa', 'souvenir', 'journey'],
  volcano: ['magma', 'crater', 'eruption', 'fumarole', 'pumice', 'vent', 'caldera', 'lahar', 'ash', 'lava', 'fissure', 'tephra', 'dormant'],
  weather: ['rain', 'snow', 'wind', 'fog', 'hail', 'drizzle', 'sunshine', 'thunder', 'cloud', 'breeze', 'storm', 'sleet'],
  winter: ['scarf', 'icicle', 'sled', 'blizzard', 'mittens', 'frost', 'snowflake', 'hibernate', 'chilly', 'earmuffs', 'cocoa']
};
