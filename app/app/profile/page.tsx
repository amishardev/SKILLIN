'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/client/session';
import ReviewStep from '@/components/onboarding/ReviewStep';
import { Card, Chip, Eyebrow, PageSkeleton, Bar } from '@/components/ui/primitives';
import type { StudentProfile } from '@/types';

/**
 * Profile: the same editable review used during onboarding, plus the evidence
 * behind every skill score. Editing here re-runs the whole analysis.
 */
export default function ProfilePage() {
  const router = useRouter();
  const { profile, analysis, setProfile } = useSession();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StudentProfile | null>(null);
  const [saved, setSaved] = useState(false);

  if (!profile || !analysis) return <PageSkeleton />;

  if (editing && draft) {
    return (
      <div className="stack-lg">
        <ReviewStep
          profile={draft}
          meta={null}
          onChange={setDraft}
          onConfirm={async () => {
            await setProfile(draft);
            setEditing(false);
            setSaved(true);
          }}
        />
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            setEditing(false);
            setDraft(null);
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <header className="spread" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div className="stack-sm">
          <Eyebrow>Profile</Eyebrow>
          <h1 className="title-xl">{profile.name || 'Your profile'}</h1>
          {profile.headline ? <p className="lede">{profile.headline}</p> : null}
        </div>
        <button
          type="button"
          className="btn btn-dark"
          onClick={() => {
            setDraft(profile);
            setEditing(true);
            setSaved(false);
          }}
        >
          Edit profile
        </button>
      </header>

      {saved ? (
        <div className="card card-accent" role="status">
          <p style={{ fontSize: '0.9375rem' }}>
            Profile updated. Your gaps, recommendations and roadmap have been recalculated.
          </p>
        </div>
      ) : null}

      <div className="grid-asym">
        <div className="stack-md">
          {/* Education */}
          {profile.education.length > 0 ? (
            <Card variant="white">
              <Eyebrow>Education</Eyebrow>
              <ul className="stack-md" style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
                {profile.education.map((e, i) => (
                  <li key={i} className="stack-sm">
                    <span style={{ fontWeight: 600 }}>{e.institution}</span>
                    <span className="meta">
                      {[e.degree, e.branch].filter(Boolean).join(' · ')}
                      {e.startYear || e.endYear
                        ? ` · ${[e.startYear, e.endYear].filter(Boolean).join(', ')}`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {/* Experience */}
          {profile.experience.length > 0 ? (
            <Card variant="white">
              <Eyebrow>Experience</Eyebrow>
              <ul className="stack-md" style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
                {profile.experience.map((e) => (
                  <li key={e.id} className="stack-sm">
                    <div className="row-tight" style={{ flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{e.role}</span>
                      <Chip>{e.kind === 'internship' ? 'Internship' : 'Work'}</Chip>
                    </div>
                    <span className="meta">
                      {e.organization}
                      {e.startDate ? ` · ${e.startDate}, ${e.endDate ?? 'Present'}` : ''}
                    </span>
                    {e.description ? (
                      <p className="body" style={{ fontSize: '0.875rem' }}>
                        {e.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {/* Projects */}
          {profile.projects.length > 0 ? (
            <Card variant="white">
              <Eyebrow>Projects</Eyebrow>
              <ul className="stack-md" style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
                {profile.projects.map((p) => (
                  <li key={p.id} className="stack-sm">
                    <span style={{ fontWeight: 600 }}>{p.title}</span>
                    {p.description ? (
                      <p className="body" style={{ fontSize: '0.875rem' }}>
                        {p.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {/* Certificates & achievements */}
          {profile.certificates.length > 0 || profile.achievements.length > 0 ? (
            <Card variant="white">
              {profile.certificates.length > 0 ? (
                <>
                  <Eyebrow>Certifications</Eyebrow>
                  <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: '12px 0 20px' }}>
                    {profile.certificates.map((c) => (
                      <li key={c.id} className="spread">
                        <span style={{ fontSize: '0.9375rem' }}>{c.title}</span>
                        <span className="meta">{[c.issuer, c.year].filter(Boolean).join(' · ')}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {profile.achievements.length > 0 ? (
                <>
                  <Eyebrow>Achievements</Eyebrow>
                  <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
                    {profile.achievements.map((a) => (
                      <li key={a.id} className="spread">
                        <span style={{ fontSize: '0.9375rem' }}>{a.title}</span>
                        {a.year ? <span className="meta">{a.year}</span> : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </Card>
          ) : null}
        </div>

        {/* Skill evidence */}
        <Card>
          <Eyebrow>Skill evidence</Eyebrow>
          <p className="meta" style={{ marginTop: 8, marginBottom: 18 }}>
            Every score traced to what proved it.
          </p>
          <ul className="stack-md" style={{ listStyle: 'none', padding: 0 }}>
            {analysis.skills.slice(0, 20).map((skill) => (
              <li key={skill.skillId} className="stack-sm">
                <div className="spread">
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{skill.skillName}</span>
                  <span className="meta num">{Math.round(skill.score * 100)}%</span>
                </div>
                <Bar
                  value={skill.score}
                  tone={skill.score >= 0.55 ? 'ok' : 'warn'}
                  label={`${skill.skillName} confidence`}
                />
                <div className="wrap">
                  {skill.evidenceTypes.map((type) => (
                    <Chip key={type} tone="ok" title={skill.evidence[0]}>
                      ✓ {type}
                    </Chip>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <button type="button" className="btn btn-quiet" onClick={() => router.push('/app/settings')}>
        Change your career goal or timeline
      </button>
    </div>
  );
}
