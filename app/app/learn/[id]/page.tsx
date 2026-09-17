'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useSession } from '@/lib/client/session';
import { PageSkeleton, EmptyState } from '@/components/ui/primitives';
import CourseDetail from '@/components/learn/CourseDetail';
import CourseRail from '@/components/learn/CourseRail';
import LazyRail from '@/components/learn/LazyRail';
import { catalogResource, fullCatalog } from '@/lib/catalog';
import { nearestResources } from '@/lib/embeddings';
import { scoreResource } from '@/lib/recommendation/engine';
import { checkReadiness } from '@/lib/recommendation/prerequisites';
import { SKILL_CONFIRMED_THRESHOLD } from '@/types';
import type { LearningResource } from '@/data/resources';
import type { Rail } from '@/lib/catalog/rails';

/** Cinematic resource detail, plus related rows derived from the same profile. */
export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // `params` is a Promise in Next 16; `use` unwraps it in a Client Component.
  const { id } = use(params);
  const router = useRouter();
  const { analysis, profile, progress, savedIds, toggleSaved, recordActivity } = useSession();

  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const resource = catalogResource(id);

  const related = useMemo<Rail[]>(() => {
    if (!analysis || !resource) return [];

    const context = {
      vector: analysis.vector,
      career: analysis.career,
      projectSkills: profile?.projects.flatMap((p) => p.technologies) ?? [],
      experienceSkills: profile?.experience.flatMap((e) => e.technologies) ?? [],
      academicSkills: [],
      certificateSkills: profile?.certificates.flatMap((c) => c.skills) ?? [],
      completedResourceIds: progress?.resourcesCompleted ?? [],
    };

    const catalog = fullCatalog();
    const rank = (list: LearningResource[]) =>
      list
        .filter((r) => r.id !== resource.id)
        .map((r) => ({ r, s: scoreResource(r, context) }))
        .filter((x) => x.s.prerequisiteReady)
        .sort((a, b) => b.s.total - a.s.total)
        .slice(0, 14)
        .map((x) => x.r);

    const rails: Rail[] = [];

    // Nearest neighbours in the embedding space rather than a tag intersection:
    // this surfaces resources on the same subject even when their skill tags
    // differ from this one's.
    const similar = rank(nearestResources(resource, catalog, 40));
    if (similar.length >= 3) {
      rails.push({
        id: 'similar',
        title: 'Covers similar ground',
        reason: 'Closest to this one in the skill space learned from the catalog.',
        resources: similar,
      });
    }

    const nextUp = rank(
      catalog.filter((r) => r.prerequisites.some((p) => resource.skills.includes(p))));
    if (nextUp.length >= 3) {
      rails.push({
        id: 'unlocks',
        title: 'What this unlocks',
        reason: 'These become prerequisite-safe once you finish this one.',
        resources: nextUp,
      });
    }

    const forGoal = rank(catalog.filter((r) => r.careerTags.includes(analysis.career.id)));
    if (forGoal.length >= 3) {
      rails.push({
        id: 'goal',
        title: `Because you chose ${analysis.career.title}`,
        reason: 'Ranked by the gap each one closes for that role.',
        resources: forGoal,
      });
    }

    return rails;
  }, [analysis, profile, progress, resource]);

  if (!analysis) return <PageSkeleton />;

  if (!resource) {
    return (
      <div className="learn" style={{ padding: 40 }}>
        <EmptyState
          title="We couldn't find that resource"
          body="It may have been removed from the catalog."
          action={
            <button type="button" className="btn btn-dark" onClick={() => router.push('/app/learn')}>
              Back to Learn
            </button>
          }
        />
      </div>
    );
  }

  const completed = progress?.resourcesCompleted.includes(resource.id) ?? false;
  const started = progress?.resourcesStarted.includes(resource.id) ?? false;

  async function markComplete() {
    setBusy(true);
    const result = await recordActivity({
      type: 'resource_completed',
      targetId: resource!.id,
      label: `Completed ${resource!.title}`,
    });
    setNotice(
      result.ok
        ? result.milestoneReached
          ? `Marked complete, ${result.milestoneReached}-day streak reached. Your gaps and roadmap have been recalculated.`
          : 'Marked complete. Your gaps, recommendations and roadmap have been recalculated.'
        : result.message);
    setBusy(false);
  }

  async function markStarted() {
    if (started || completed) return;
    // Opening the external link is a real learning action, so it is recorded, // but as a session, which the streak engine treats on its own terms.
    await recordActivity({
      type: 'learning_session',
      targetId: resource!.id,
      label: `Started ${resource!.title}`,
      minutes: 0,
    });
  }

  return (
    <div className="learn">
      <div style={{ padding: '16px 40px 0' }}>
        <button
          type="button"
          className="btn btn-on-dark"
          style={{ padding: '7px 14px', fontSize: '0.8125rem' }}
          onClick={() => router.back()}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back
        </button>
      </div>

      <CourseDetail
        resource={resource}
        analysis={analysis}
        saved={savedIds.includes(resource.id)}
        completed={completed}
        onToggleSave={() => void toggleSaved(resource.id)}
        onStart={() => void markStarted()}
        onComplete={() => void markComplete()}
        busy={busy}
        notice={notice}
      />

      {related.length > 0 ? (
        <div style={{ paddingTop: 14 }}>
          {related.map((rail) => (
            <LazyRail key={rail.id}>
            <CourseRail
              rail={rail}
              blockedFor={(r) => {
                const readiness = checkReadiness(r.prerequisites, analysis.vector);
                return readiness.ready ? undefined : readiness.missingNames;
              }}
              onOpen={(r) => router.push(`/app/learn/${r.id}`)}
            />
            </LazyRail>
          ))}
        </div>
      ) : null}
    </div>
  );
}
