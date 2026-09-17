/**
 * Resource quality scoring.
 *
 * Deliberately *not* a popularity metric. Publisher reliability carries the
 * most weight, ratings carry little, and enrollment counts are not an input at
 * all, so a first-party documentation site can outrank a viral video course.
 */

import type { LearningResource } from '@/data/resources';
import { QUALITY_WEIGHTS, SOURCE_RELIABILITY, DEFAULT_SOURCE_RELIABILITY } from './config';

/** Months after which an unverified entry starts losing recency credit. */
const RECENCY_HALF_LIFE_MONTHS = 18;

export interface QualityBreakdown {
  total: number;
  sourceReliability: number;
  rating: number;
  recency: number;
  completeness: number;
  projectBased: number;
}

export function sourceReliability(source: string): number {
  return SOURCE_RELIABILITY[source] ?? DEFAULT_SOURCE_RELIABILITY;
}

/**
 * Recency decays smoothly from the last verification date.
 * Never reaches zero: an old, stable reference is still useful.
 */
function recencyScore(lastVerified: string, now: Date): number {
  const verified = new Date(lastVerified);
  if (Number.isNaN(verified.getTime())) return 0.5;
  const months = (now.getTime() - verified.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months <= 0) return 1;
  return Math.max(0.35, Math.pow(0.5, months / RECENCY_HALF_LIFE_MONTHS));
}

/**
 * Is this entry actually usable, does it declare enough to plan around?
 * A resource with no skills or no duration cannot be scheduled properly.
 */
function completenessScore(resource: LearningResource): number {
  let score = 0;
  if (resource.skills.length > 0) score += 0.4;
  if (resource.estimatedHours > 0) score += 0.3;
  if (resource.description.length > 60) score += 0.2;
  if (resource.careerTags.length > 0) score += 0.1;
  return Math.min(1, score);
}

/**
 * Ratings are normalized to 0-1 but contribute little, and their *absence* is
 * treated as neutral rather than bad, most official documentation has no
 * rating and should not be punished for it.
 */
function ratingScore(rating: number | undefined): number {
  if (rating === undefined) return 0.7;
  return Math.min(1, Math.max(0, rating / 5));
}

export function scoreQuality(resource: LearningResource, now = new Date()): QualityBreakdown {
  const parts = {
    sourceReliability: sourceReliability(resource.source),
    rating: ratingScore(resource.rating),
    recency: recencyScore(resource.lastVerified, now),
    completeness: completenessScore(resource),
    projectBased: resource.projectBased ? 1 : 0.5,
  };

  const w = QUALITY_WEIGHTS;
  const total =
    parts.sourceReliability * w.sourceReliability +
    parts.rating * w.rating +
    parts.recency * w.recency +
    parts.completeness * w.completeness +
    parts.projectBased * w.projectBased;

  return { ...parts, total: Math.min(1, Math.max(0, total)) };
}
