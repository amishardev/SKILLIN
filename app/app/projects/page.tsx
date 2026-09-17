'use client';

import { useMemo, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { useSession } from '@/lib/client/session';
import { Card, Chip, Eyebrow, PageSkeleton, EmptyState, formatHours } from '@/components/ui/primitives';
import { PROJECTS, type ProjectTemplate } from '@/data/projects';
import { skillName, skillShortName } from '@/data/skills';
import { checkReadiness } from '@/lib/recommendation/prerequisites';

/** Projects: what to build, why it matters, and what it proves. */
export default function ProjectsPage() {
  const { analysis, progress, recordActivity } = useSession();
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const relevant = useMemo(() => {
    if (!analysis) return [];
    const planned = new Set(analysis.projects.map((p) => p.id));
    return PROJECTS.filter((p) => p.careerTags.includes(analysis.career.id)).sort((a, b) => {
      // Projects already in the roadmap come first.
      const aPlanned = planned.has(a.id) ? 0 : 1;
      const bPlanned = planned.has(b.id) ? 0 : 1;
      if (aPlanned !== bPlanned) return aPlanned - bPlanned;
      const order = { beginner: 0, intermediate: 1, advanced: 2 } as const;
      return order[a.difficulty] - order[b.difficulty];
    });
  }, [analysis]);

  if (!analysis) return <PageSkeleton />;

  const planned = new Set(analysis.projects.map((p) => p.id));

  async function complete(project: ProjectTemplate) {
    setBusyId(project.id);
    const result = await recordActivity({
      type: 'project_completed',
      targetId: project.id,
      label: `Completed ${project.title}`,
    });
    setNotice(result.ok ? `“${project.title}” marked complete. ${result.message}` : result.message);
    setBusyId(null);
  }

  return (
    <div className="stack-lg">
      <header className="stack-sm">
        <Eyebrow>Projects</Eyebrow>
        <h1 className="title-xl">Build these next.</h1>
        <p className="lede">
          A project is the only evidence that survives an interview. These prove the skills{' '}
          {analysis.career.title} needs and your profile doesn&apos;t show yet.
        </p>
      </header>

      {notice ? (
        <div className="card card-dark" role="status">
          <p style={{ fontSize: '0.875rem' }}>{notice}</p>
        </div>
      ) : null}

      {relevant.length === 0 ? (
        <EmptyState
          title="No projects matched"
          body={`We don't have project templates for ${analysis.career.title} yet.`}
        />
      ) : (
        <ul className="stack-md" style={{ listStyle: 'none', padding: 0 }}>
          {relevant.map((project) => {
            const readiness = checkReadiness(project.prerequisites, analysis.vector);
            const done = progress?.projectsCompleted.includes(project.id) ?? false;
            const gained = project.skills.filter((s) => (analysis.vector.get(s) ?? 0) < 0.55);

            return (
              <li key={project.id}>
                <Card variant={planned.has(project.id) ? 'white' : 'default'}>
                  <div className="spread" style={{ alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
                    <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
                      <div className="row-tight" style={{ flexWrap: 'wrap' }}>
                        {planned.has(project.id) ? <Chip tone="accent">In your roadmap</Chip> : null}
                        <Chip>{project.difficulty}</Chip>
                        <Chip>{formatHours(project.estimatedHours)}</Chip>
                        <Chip tone={project.portfolioValue === 'very-high' ? 'ok' : 'default'}>
                          {project.portfolioValue.replace('-', ' ')} portfolio value
                        </Chip>
                        {done ? <Chip tone="ok">Completed</Chip> : null}
                      </div>
                      <h2 className="title-sm">{project.title}</h2>
                      <p className="body" style={{ fontSize: '0.875rem' }}>
                        {project.description}
                      </p>
                    </div>
                  </div>

                  {/* Why build this */}
                  <div
                    style={{
                      background: 'var(--app)',
                      borderRadius: 'var(--r-sm)',
                      padding: '14px 16px',
                      marginBottom: 16,
                    }}
                  >
                    <Eyebrow>Why build this?</Eyebrow>
                    <p className="body" style={{ marginTop: 8, fontSize: '0.875rem' }}>
                      {gained.length > 0
                        ? `Completing this demonstrates ${gained.slice(0, 3).map(skillName).join(', ')}, which your ${analysis.career.title} profile currently lacks.`
                        : `This deepens skills you already have and gives you something concrete to show for them.`}
                    </p>
                  </div>

                  <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
                    <div className="stack-sm">
                      <Eyebrow>Skills demonstrated</Eyebrow>
                      <div className="wrap">
                        {project.skills.map((s) => (
                          <Chip key={s} tone={gained.includes(s) ? 'ok' : 'default'}>
                            {skillShortName(s)}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <div className="stack-sm">
                      <Eyebrow>Tools</Eyebrow>
                      <div className="wrap">
                        {project.tools.map((t) => (
                          <Chip key={t}>{t}</Chip>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="stack-sm" style={{ marginBottom: 16 }}>
                    <Eyebrow>What you&apos;ll have at the end</Eyebrow>
                    <p className="body" style={{ fontSize: '0.875rem' }}>
                      {project.outcome}
                    </p>
                  </div>

                  {!readiness.ready ? (
                    <div className="row-tight" style={{ marginBottom: 14 }}>
                      <Lock size={14} aria-hidden="true" style={{ color: 'var(--warn)' }} />
                      <span className="meta">
                        Learn {readiness.missingNames.join(' and ')} first.
                      </span>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className={readiness.ready ? 'btn btn-dark' : 'btn btn-ghost'}
                    disabled={!readiness.ready || done || busyId === project.id}
                    onClick={() => void complete(project)}
                  >
                    {done ? (
                      <>
                        <Check size={15} aria-hidden="true" />
                        Completed
                      </>
                    ) : busyId === project.id ? (
                      'Recording…'
                    ) : readiness.ready ? (
                      'Mark as built'
                    ) : (
                      'Not ready yet'
                    )}
                  </button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
