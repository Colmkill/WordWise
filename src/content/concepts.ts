/**
 * Reusable topic-concept registry: stable identities that can appear in
 * multiple levels with different word lists and hints.
 *
 * A concept owns the canonical category name. A topic INSTANCE in a level
 * references a concept and carries its own words, hint, and optional
 * difficulty metadata. The validator enforces that instance categories
 * match their concept, keeping this registry the single source of truth.
 */

export interface TopicConcept {
  /** Stable slug, referenced by topic instances via Topic.concept. */
  slug: string;
  /** Canonical category name revealed on completion. */
  category: string;
  /** Optional authoring notes (provenance, review reminders). */
  notes?: string;
}

export const TOPIC_CONCEPTS: Record<string, TopicConcept> = {
  furniture: { slug: 'furniture', category: 'FURNITURE' },
  fruit: { slug: 'fruit', category: 'FRUIT' },
  weather: { slug: 'weather', category: 'WEATHER' },
  colours: { slug: 'colours', category: 'COLOURS' },
  music: { slug: 'music', category: 'MUSIC' },
  orchestra: { slug: 'orchestra', category: 'ORCHESTRA', notes: 'Concert-hall terms; distinct from the music concept.' },
  animals: { slug: 'animals', category: 'ANIMALS' },
  jobs: { slug: 'jobs', category: 'JOBS' },
  sports: { slug: 'sports', category: 'SPORTS' },
  kitchen: { slug: 'kitchen', category: 'KITCHEN' },
  travel: { slug: 'travel', category: 'TRAVEL' },
  body: { slug: 'body', category: 'BODY' },
  night: { slug: 'night', category: 'NIGHT' },
  coffee: { slug: 'coffee', category: 'COFFEE' },
  ocean: { slug: 'ocean', category: 'OCEAN' },
  school: { slug: 'school', category: 'SCHOOL' },
  camping: { slug: 'camping', category: 'CAMPING' },
  money: { slug: 'money', category: 'MONEY' },
  garden: { slug: 'garden', category: 'GARDEN' },
  cinema: { slug: 'cinema', category: 'CINEMA' },
  winter: { slug: 'winter', category: 'WINTER' },
  mail: { slug: 'mail', category: 'MAIL' },
  doctor: { slug: 'doctor', category: 'DOCTOR' },
  baking: { slug: 'baking', category: 'BAKING' },
  sailing: { slug: 'sailing', category: 'SAILING' },
  chess: { slug: 'chess', category: 'CHESS' },
  typography: { slug: 'typography', category: 'TYPESETTING' },
  volcano: { slug: 'volcano', category: 'VOLCANO' }
  alchemy: { slug: 'alchemy', category: 'ALCHEMY' },
  apiary: { slug: 'apiary', category: 'APIARY' },
  cartography: { slug: 'cartography', category: 'CARTOGRAPHY' },
  falconry: { slug: 'falconry', category: 'FALCONRY' },
  glassblowing: { slug: 'glassblowing', category: 'GLASSBLOWING' },
  horology: { slug: 'horology', category: 'HOROLOGY' },
  mycology: { slug: 'mycology', category: 'MYCOLOGY' },
  numismatics: { slug: 'numismatics', category: 'NUMISMATICS' },
  oenology: { slug: 'oenology', category: 'OENOLOGY' },
  taxonomy: { slug: 'taxonomy', category: 'TAXONOMY' },
};