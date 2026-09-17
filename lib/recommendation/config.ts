/**
 * Recommendation tuning.
 *
 * Every weight the ranker uses lives here. Nothing in this file is referenced
 * by a literal anywhere else, so the ranking behaviour can be tuned, or
 * A/B tested, without touching engine code.
 */

export interface RankingWeights {
  academicMatch: number;
  projectMatch: number;
  experienceMatch: number;
  certificateGap: number;
  skillGap: number;
  careerMatch: number;
  similarity: number;
  /** Cosine between the resource and the learner's remaining-gap direction. */
  gapAffinity: number;
  quality: number;
  /** Subtracted, not added. */
  redundancyLambda: number;
}

/**
 * Skill-gap and career-match dominate deliberately.
 *
 * `similarity` is weighted low on purpose: raw skill-vector overlap measures how
 * much a resource resembles what the learner already knows, which correlates
 * with redundancy at least as much as with relevance. It breaks ties; it does
 * not drive the ranking.
 *
 * `gapAffinity` is the embedding term and is deliberately substantial. It is
 * the cosine between a resource and the direction of what the learner still
 * needs, in a space learned from how skills co-occur across the catalog. Where
 * `skillGap` can only reward an exact tag match, this rewards subject-matter
 * adjacency, a resource that teaches the neighbourhood of your gap still
 * scores, which is what makes recommendations feel considered rather than
 * keyword-matched.
 *
 * Positive weights sum to 1.0, so `total` stays interpretable as a 0-1 score.
 */
export const DEFAULT_WEIGHTS: RankingWeights = {
  academicMatch: 0.06,
  projectMatch: 0.10,
  experienceMatch: 0.10,
  certificateGap: 0.04,
  skillGap: 0.24,
  careerMatch: 0.22,
  similarity: 0.02,
  gapAffinity: 0.12,
  quality: 0.10,
  redundancyLambda: 0.35,
};

export interface QualityWeights {
  sourceReliability: number;
  rating: number;
  recency: number;
  completeness: number;
  projectBased: number;
}

export const QUALITY_WEIGHTS: QualityWeights = {
  sourceReliability: 0.32,
  rating: 0.18,
  recency: 0.15,
  completeness: 0.15,
  projectBased: 0.20,
};

/**
 * How much we trust each publisher, independent of popularity.
 *
 * This is the main defence against popularity bias: a first-party doc site
 * scores as highly as a channel with ten million subscribers.
 */
export const SOURCE_RELIABILITY: Record<string, number> = {
  'Official Docs': 0.95,
  MIT: 0.95,
  'MIT OpenCourseWare': 0.95,
  Stanford: 0.95,
  Harvard: 0.95,
  Brown: 0.92,
  NPTEL: 0.90,
  'University of Helsinki': 0.92,
  Google: 0.90,
  'Hugging Face': 0.90,
  OpenAI: 0.88,
  IBM: 0.85,
  AWS: 0.85,
  HashiCorp: 0.85,
  OWASP: 0.92,
  NIST: 0.92,
  W3C: 0.92,
  freeCodeCamp: 0.85,
  'The Odin Project': 0.85,
  'fast.ai': 0.90,
  Kaggle: 0.82,
  'Open Book': 0.85,
  GitHub: 0.78,
  PortSwigger: 0.90,
  Distill: 0.92,
  'Papers with Code': 0.85,
  'Made With ML': 0.82,
  'NN/g': 0.90,
  YouTube: 0.70,
  Blog: 0.65,
};

/** Unknown publishers are treated as average, not penalised into irrelevance. */
export const DEFAULT_SOURCE_RELIABILITY = 0.70;

/**
 * A learner is "ready" for a resource when every prerequisite is at least this
 * strong. Set deliberately below the confirmed threshold: you can start
 * learning something while a prerequisite is still developing, you just cannot
 * start from zero.
 */
export const PREREQ_READY_THRESHOLD = 0.40;

/**
 * Resources whose skills the learner has already mastered above this level are
 * treated as redundant and pushed down hard.
 */
export const REDUNDANCY_MASTERY_THRESHOLD = 0.75;

/** Ranking never returns more than this from one query. */
export const MAX_RECOMMENDATIONS = 12;

/**
 * A roadmap stops adding resources once the best remaining candidate closes
 * less than this fraction of the learner's *remaining* weighted deficit.
 *
 * Without it, a long timeline keeps filling spare hours with marginal material
 *, a second prompt-engineering guide, a framework the learner already has an
 * equivalent of, which makes the plan look padded rather than deliberate.
 */
export const MIN_MARGINAL_GAP = 0.03;
