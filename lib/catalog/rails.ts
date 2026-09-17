import type { LearningResource } from '@/data/resources';
import { skillName } from '@/data/skills';
import type { CareerGoal } from '@/data/careers';
import { fullCatalog, coverTheme } from './index';
import { scoreResource, type ScoringContext } from '@/lib/recommendation/engine';
import { gapEmbedding } from '@/lib/embeddings';
import { checkReadiness } from '@/lib/recommendation/prerequisites';
import { scoreQuality } from '@/lib/recommendation/quality';
import { SKILL_CONFIRMED_THRESHOLD, type SkillGap, type SkillVector, type StudentSkill, type UserProgress } from '@/types';

/**
 * Personalised catalog rails.
 *
 * Every row is derived from the learner's own profile, goal, gaps and history.
 * There is no "most popular overall" row anywhere in here, popularity is not
 * an input to any of it, which is the whole difference between this and a
 * streaming service's homepage.
 */

export interface Rail {
  id: string;
  title: string;
  /** Why this row exists, in the learner's own terms. Shown under the title. */
  reason: string;
  resources: LearningResource[];
  /** Rows of things the learner cannot start yet are rendered with a lock. */
  locked?: boolean;
}

export interface RailInput {
  context: ScoringContext;
  career: CareerGoal;
  skills: StudentSkill[];
  gaps: SkillGap[];
  vector: SkillVector;
  progress?: UserProgress;
  /** Resource ids the learner saved. */
  savedIds?: string[];
}

const RAIL_SIZE = 18;

export function buildRails(input: RailInput): Rail[] {
  const catalog = fullCatalog();
  const { vector, career, gaps, progress } = input;

  // Scored against ~2,400 resources, so the embedding direction is computed
  // once rather than per resource.
  const context: ScoringContext = {
    ...input.context,
    gapVector: input.context.gapVector ?? gapEmbedding(gaps),
  };

  const completed = new Set(progress?.resourcesCompleted ?? []);
  const started = new Set(progress?.resourcesStarted ?? []);
  const saved = new Set(input.savedIds ?? []);

  /** Score once, reuse across every row. */
  const scored = new Map<string, number>();
  const ready = new Map<string, boolean>();
  for (const r of catalog) {
    if (completed.has(r.id)) continue;
    const s = scoreResource(r, context);
    scored.set(r.id, s.total);
    ready.set(r.id, s.prerequisiteReady);
  }

  const rank = (list: LearningResource[]) =>
    list
      .filter((r) => !completed.has(r.id))
      .sort((a, b) => (scored.get(b.id) ?? 0) - (scored.get(a.id) ?? 0))
      .slice(0, RAIL_SIZE);

  const rails: Rail[] = [];

  // ── 1. Continue learning ──
  const inProgress = catalog.filter((r) => started.has(r.id) && !completed.has(r.id));
  if (inProgress.length > 0) {
    rails.push({
      id: 'continue',
      title: 'Continue learning',
      reason: 'You started these and have not finished them yet.',
      resources: inProgress.slice(0, RAIL_SIZE),
    });
  }

  // ── 2. Recommended for you ──
  const recommended = rank(
    catalog.filter((r) => ready.get(r.id) && (scored.get(r.id) ?? 0) > 0));
  if (recommended.length > 0) {
    rails.push({
      id: 'recommended',
      title: 'Recommended for you',
      reason: `Ranked by the ${career.title} gap each one closes, not by popularity.`,
      resources: recommended,
    });
  }

  // ── 3. Build your missing skills ──
  const topGaps = gaps.filter((g) => g.status === 'missing' && g.gap > 0.2).slice(0, 4);
  for (const gap of topGaps) {
    const forGap = rank(
      catalog.filter((r) => r.skills.includes(gap.skillId) && ready.get(r.id)));
    if (forGap.length >= 3) {
      rails.push({
        id: `gap-${gap.skillId}`,
        title: `Close your ${gap.skillName} gap`,
        reason: `${career.title} needs ${gap.skillName} and your profile shows none of it yet.`,
        resources: forGap,
      });
    }
  }

  // ── 4. Because you know <strongest skill> ──
  const strongest = input.skills
    .filter((s) => s.score >= SKILL_CONFIRMED_THRESHOLD)
    .slice(0, 2);
  for (const skill of strongest) {
    const nextLevel = rank(
      catalog.filter(
        (r) =>
          ready.get(r.id) &&
          r.level !== 'beginner' &&
          // Builds on it without simply re-teaching it.
          (r.prerequisites.includes(skill.skillId) ||
            (r.skills.includes(skill.skillId) && r.skills.length > 2)) &&
          r.skills.some((s) => (vector.get(s) ?? 0) < SKILL_CONFIRMED_THRESHOLD)));
    if (nextLevel.length >= 3) {
      rails.push({
        id: `knows-${skill.skillId}`,
        title: `Because you know ${skill.skillName}`,
        reason: `Builds on your ${skill.skillName} rather than repeating it.`,
        resources: nextLevel,
      });
    }
  }

  // ── 5. Best for your goal ──
  const forCareer = rank(
    catalog.filter((r) => r.careerTags.includes(career.id) && ready.get(r.id)));
  if (forCareer.length > 0) {
    rails.push({
      id: 'career',
      title: `Best for ${career.title}`,
      reason: `Tagged to the skills this role actually requires.`,
      resources: forCareer,
    });
  }

  // NOTE: there is deliberately no "semantically adjacent" row here.
  //
  // It was built and measured, and the numbers killed it: for a learner whose
  // gaps are Deep Learning and MLOps, everything the embedding puts near those
  // gaps is ML material they already know (redundancy ~100%), and once the
  // redundant ones are excluded the best remaining affinity is 0.34, which in
  // this catalog means "Jenkins for Beginners" and "Apigee API Platform".
  // Either way the row would be bad.
  //
  // The embedding is genuinely useful, just not as a row that sorts by
  // affinity alone. It earns its keep inside `scoreResource`, where it is
  // balanced against redundancy and the explicit gap, and on the detail page
  // where nearest-neighbour lookup powers "Covers similar ground".

  // ── 6. Free and open ──
  const free = catalog
    .filter((r) => r.access === 'free' && !completed.has(r.id) && ready.get(r.id))
    .sort((a, b) => scoreQuality(b).total - scoreQuality(a).total)
    .slice(0, RAIL_SIZE);
  if (free.length > 0) {
    rails.push({
      id: 'free',
      title: 'Free and open',
      reason: 'No paywall, no sign-up, official docs, NPTEL, freeCodeCamp and university courses.',
      resources: free,
    });
  }

  // ── 7. Publisher rows, quality-ordered ──
  for (const [source, title, reason] of [
    ['NPTEL', 'From NPTEL', 'Full lecture series from the IITs, free to watch.'],
    ['Official Docs', 'Straight from the source', 'First-party documentation, written by the people who built it.'],
    ['freeCodeCamp', 'Project-based on freeCodeCamp', 'Certification tracks you finish by building something.'],
  ] as const) {
    const rows = catalog
      // Readiness matters here too: a publisher row is still a recommendation,
      // and an unlocked row must never contain something you cannot start.
      .filter((r) => r.source === source && !completed.has(r.id) && ready.get(r.id))
      .sort((a, b) => (scored.get(b.id) ?? 0) - (scored.get(a.id) ?? 0))
      .slice(0, RAIL_SIZE);
    if (rows.length >= 3) rails.push({ id: `src-${source}`, title, reason, resources: rows });
  }

  // ── 8. Not ready yet ──
  const blocked = catalog
    .filter((r) => {
      if (completed.has(r.id) || ready.get(r.id) !== false) return false;
      // Only worth showing if it is relevant to the goal.
      return r.careerTags.includes(career.id) || r.skills.some((s) => gaps.some((g) => g.skillId === s));
    })
    .sort((a, b) => {
      const am = checkReadiness(a.prerequisites, vector).missing.length;
      const bm = checkReadiness(b.prerequisites, vector).missing.length;
      return am - bm || (scored.get(b.id) ?? 0) - (scored.get(a.id) ?? 0);
    })
    .slice(0, RAIL_SIZE);
  if (blocked.length > 0) {
    rails.push({
      id: 'blocked',
      title: 'Not ready yet',
      reason: 'Worth knowing about, each one needs a prerequisite you have not covered.',
      resources: blocked,
      locked: true,
    });
  }

  // ── 9. Saved ──
  if (saved.size > 0) {
    const savedList = catalog.filter((r) => saved.has(r.id));
    if (savedList.length > 0) {
      rails.push({
        id: 'saved',
        title: 'Your list',
        reason: 'Everything you saved for later.',
        resources: savedList.slice(0, RAIL_SIZE),
      });
    }
  }

  // Never show an empty row.
  return rails.filter((rail) => rail.resources.length > 0);
}

/**
 * The featured hero resource: the single best prerequisite-safe next step.
 * Same answer the dashboard gives, so the two screens never disagree.
 */
export function featuredResource(input: RailInput): LearningResource | null {
  const catalog = fullCatalog();
  const completed = new Set(input.progress?.resourcesCompleted ?? []);
  const context: ScoringContext = {
    ...input.context,
    gapVector: input.context.gapVector ?? gapEmbedding(input.gaps),
  };

  let best: LearningResource | null = null;
  let bestScore = -Infinity;

  for (const r of catalog) {
    if (completed.has(r.id)) continue;
    const s = scoreResource(r, context);
    if (!s.prerequisiteReady) continue;
    // A hero needs a cover worth looking at, so a thumbnail breaks ties.
    const bonus = r.thumbnail ? 0.02 : 0;
    if (s.total + bonus > bestScore) {
      bestScore = s.total + bonus;
      best = r;
    }
  }
  return best;
}

export { coverTheme, skillName };
