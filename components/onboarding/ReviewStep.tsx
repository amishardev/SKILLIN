'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { Card, Chip, Eyebrow } from '@/components/ui/primitives';
import { buildStudentSkills } from '@/lib/skills/vector';
import { SKILLS, normalizeSkill, skillName } from '@/data/skills';
import { SKILL_CONFIRMED_THRESHOLD, type StudentProfile } from '@/types';
import type { ExtractionMeta } from './UploadStep';
import OnboardingContinue from './OnboardingContinue';

/**
 * "Here's where you're starting from."
 *
 * Everything extracted is editable before it is committed. Evidence is shown
 * against each skill so the learner can see *why* we think they know it, and
 * correct us when we are wrong.
 */
export default function ReviewStep({
  profile,
  meta,
  onChange,
  onConfirm,
}: {
  profile: StudentProfile;
  meta: ExtractionMeta | null;
  onChange: (profile: StudentProfile) => void;
  onConfirm: () => void;
}) {
  const [newSkill, setNewSkill] = useState('');
  const [skillError, setSkillError] = useState('');

  const skills = useMemo(() => buildStudentSkills(profile), [profile]);
  const confirmed = skills.filter((s) => s.score >= SKILL_CONFIRMED_THRESHOLD);
  const developing = skills.filter((s) => s.score < SKILL_CONFIRMED_THRESHOLD);

  function patch(changes: Partial<StudentProfile>) {
    onChange({ ...profile, ...changes });
  }

  function addSkill() {
    const raw = newSkill.trim();
    if (!raw) return;

    const id = normalizeSkill(raw);
    if (!id) {
      setSkillError(`We don't recognise "${raw}" yet. Try a more standard name, like "PyTorch".`);
      return;
    }
    if (profile.declaredSkills.some((s) => s.skillId === id)) {
      setSkillError(`${skillName(id)} is already on your profile.`);
      return;
    }

    patch({
      declaredSkills: [
        ...profile.declaredSkills,
        {
          skillId: id,
          rawName: skillName(id),
          confidence: 0.7,
          source: 'self',
          evidence: 'Added by you',
          explicit: true,
        },
      ],
    });
    setNewSkill('');
    setSkillError('');
  }

  const noEvidence =
    profile.projects.length === 0 &&
    profile.experience.length === 0 &&
    profile.declaredSkills.length === 0;

  return (
    <div className="stack-lg onb-step" style={{ width: '100%', maxWidth: 780 }}>
      <div className="stack-sm">
        <h1 className="title-xl">Here&apos;s where you&apos;re starting from.</h1>
        <p className="lede">
          We read this from your profile. Fix anything we got wrong, this is what every
          recommendation is built on.
        </p>
        {meta ? <ExtractionNote meta={meta} /> : null}
      </div>

      {noEvidence ? (
        <Card variant="white">
          <div className="stack-sm">
            <div className="title-sm">We couldn&apos;t find much to work with</div>
            <p className="body">
              That file had no projects, experience or skills we could read. You can add
              them below, or go back and try a different export.
            </p>
          </div>
        </Card>
      ) : null}

      {/* ── Identity ── */}
      <Card variant="white">
        <Eyebrow>You</Eyebrow>
        <div className="grid-2" style={{ marginTop: 14 }}>
          <Field
            label="Name"
            value={profile.name}
            onChange={(name) => patch({ name })}
            placeholder="Your name"
          />
          <Field
            label="Location"
            value={profile.location ?? ''}
            onChange={(location) => patch({ location })}
            placeholder="City, Country"
          />
        </div>
      </Card>

      {/* ── Education ── */}
      <Card variant="white">
        <div className="spread">
          <Eyebrow>Education</Eyebrow>
          <button
            type="button"
            className="btn btn-quiet"
            style={{ padding: '6px 12px' }}
            onClick={() =>
              patch({
                education: [
                  ...profile.education,
                  { institution: '', degree: '', branch: '' },
                ],
              })
            }
          >
            <Plus size={14} aria-hidden="true" />
            Add
          </button>
        </div>

        {profile.education.length === 0 ? (
          <p className="meta" style={{ marginTop: 12 }}>
            Nothing found. Add your degree so we can factor in what you studied.
          </p>
        ) : (
          <div className="stack-md" style={{ marginTop: 14 }}>
            {profile.education.map((entry, i) => (
              <div key={i} className="stack-sm">
                <div className="spread">
                  <div style={{ flex: 1 }}>
                    <Field
                      label="Institution"
                      value={entry.institution}
                      onChange={(institution) =>
                        patch({
                          education: profile.education.map((e, j) =>
                            j === i ? { ...e, institution } : e),
                        })
                      }
                    />
                  </div>
                  <RemoveButton
                    label={`Remove ${entry.institution || 'education entry'}`}
                    onClick={() =>
                      patch({ education: profile.education.filter((_, j) => j !== i) })
                    }
                  />
                </div>
                <div className="grid-2">
                  <Field
                    label="Degree"
                    value={entry.degree}
                    onChange={(degree) =>
                      patch({
                        education: profile.education.map((e, j) =>
                          j === i ? { ...e, degree } : e),
                      })
                    }
                  />
                  <Field
                    label="Branch / specialisation"
                    value={entry.branch}
                    onChange={(branch) =>
                      patch({
                        education: profile.education.map((e, j) =>
                          j === i ? { ...e, branch } : e),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Experience ── */}
      <ListCard
        title="Experience"
        empty="No internships or roles found."
        items={profile.experience.map((e) => ({
          id: e.id,
          primary: e.role || 'Role',
          secondary: [e.organization, [e.startDate, e.endDate].filter(Boolean).join(', ')]
            .filter(Boolean)
            .join(' · '),
          chips: e.technologies.map(skillName),
          badge: e.kind === 'internship' ? 'Internship' : 'Work',
        }))}
        onRemove={(id) =>
          patch({ experience: profile.experience.filter((e) => e.id !== id) })
        }
      />

      {/* ── Projects ── */}
      <ListCard
        title="Projects"
        empty="No projects found. Projects are the strongest evidence you can give us."
        items={profile.projects.map((p) => ({
          id: p.id,
          primary: p.title || 'Project',
          secondary: p.description.slice(0, 150),
          chips: p.technologies.map(skillName),
        }))}
        onRemove={(id) => patch({ projects: profile.projects.filter((p) => p.id !== id) })}
      />

      {/* ── Certificates & achievements ── */}
      {profile.certificates.length > 0 ? (
        <ListCard
          title="Certifications"
          empty=""
          items={profile.certificates.map((c) => ({
            id: c.id,
            primary: c.title,
            secondary: [c.issuer, c.year].filter(Boolean).join(' · '),
            chips: c.skills.map(skillName),
          }))}
          onRemove={(id) =>
            patch({ certificates: profile.certificates.filter((c) => c.id !== id) })
          }
        />
      ) : null}

      {profile.achievements.length > 0 ? (
        <ListCard
          title="Achievements"
          empty=""
          items={profile.achievements.map((a) => ({
            id: a.id,
            primary: a.title,
            secondary: a.year ? String(a.year) : '',
            chips: [],
          }))}
          onRemove={(id) =>
            patch({ achievements: profile.achievements.filter((a) => a.id !== id) })
          }
        />
      ) : null}

      {/* ── Skills with evidence ── */}
      <Card variant="white">
        <Eyebrow>Skills we found</Eyebrow>

        {confirmed.length > 0 ? (
          <div className="stack-sm" style={{ marginTop: 14 }}>
            <div className="meta">Confirmed, backed by real evidence</div>
            <div className="wrap">
              {confirmed.map((s) => (
                <Chip key={s.skillId} tone="ok" title={s.evidence.join(' · ')}>
                  {s.skillName}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        {developing.length > 0 ? (
          <div className="stack-sm" style={{ marginTop: 18 }}>
            <div className="meta">Mentioned, we&apos;ll treat these as early-stage</div>
            <div className="wrap">
              {developing.map((s) => (
                <Chip key={s.skillId} title={s.evidence.join(' · ')}>
                  {s.skillName}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        {skills.length > 0 ? (
          <details style={{ marginTop: 18 }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--ink-2)' }}>
              Where did these come from?
            </summary>
            <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
              {skills.slice(0, 12).map((s) => (
                <li key={s.skillId} className="spread" style={{ alignItems: 'flex-start', gap: 16 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 140 }}>
                    {s.skillName}
                  </span>
                  <span className="meta" style={{ textAlign: 'right', flex: 1 }}>
                    {s.evidence[0] ?? 'Listed on your profile'}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <div className="stack-sm" style={{ marginTop: 20 }}>
          <label className="label" htmlFor="add-skill">
            Add a skill we missed
          </label>
          <div className="row">
            <input
              id="add-skill"
              className="field"
              list="skill-options"
              value={newSkill}
              placeholder="e.g. PyTorch"
              aria-invalid={skillError ? 'true' : undefined}
              onChange={(e) => {
                setNewSkill(e.target.value);
                setSkillError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill();
                }
              }}
            />
            <datalist id="skill-options">
              {SKILLS.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
            <button type="button" className="btn btn-ghost" onClick={addSkill}>
              Add
            </button>
          </div>
          {skillError ? (
            <p className="meta" style={{ color: 'var(--err)' }}>
              {skillError}
            </p>
          ) : null}
        </div>
      </Card>

      <OnboardingContinue label="Looks right, continue" onClick={onConfirm} />
    </div>
  );
}

function ExtractionNote({ meta }: { meta: ExtractionMeta }) {
  const parts: string[] = [];
  if (meta.isLinkedIn) parts.push('LinkedIn export detected');
  if (meta.totalPages > 0) parts.push(`${meta.totalPages} page${meta.totalPages === 1 ? '' : 's'}`);
  if (meta.sectionsFound.length > 0) parts.push(`${meta.sectionsFound.length} sections read`);

  return (
    <div className="wrap" style={{ marginTop: 6 }}>
      {parts.map((part) => (
        <Chip key={part}>{part}</Chip>
      ))}
      {meta.aiAssisted ? (
        <Chip tone="accent">
          <Sparkles size={12} aria-hidden="true" />
          AI-enriched
        </Chip>
      ) : null}
      {meta.aiFallback ? (
        <Chip tone="warn" title="The AI step was unavailable, so we used the direct parser only.">
          Parsed directly
        </Chip>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="btn btn-quiet"
      aria-label={label}
      onClick={onClick}
      style={{ padding: 8, alignSelf: 'flex-end', marginBottom: 2 }}
    >
      <Trash2 size={15} aria-hidden="true" />
    </button>
  );
}

interface ListItem {
  id: string;
  primary: string;
  secondary: string;
  chips: string[];
  badge?: string;
}

function ListCard({
  title,
  empty,
  items,
  onRemove,
}: {
  title: string;
  empty: string;
  items: ListItem[];
  onRemove: (id: string) => void;
}) {
  return (
    <Card variant="white">
      <Eyebrow>{title}</Eyebrow>
      {items.length === 0 ? (
        <p className="meta" style={{ marginTop: 12 }}>
          {empty}
        </p>
      ) : (
        <ul className="stack-md" style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
          {items.map((item) => (
            <li
              key={item.id}
              className="spread"
              style={{ alignItems: 'flex-start', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}
            >
              <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
                <div className="row-tight" style={{ flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600 }}>{item.primary}</span>
                  {item.badge ? <Chip>{item.badge}</Chip> : null}
                </div>
                {item.secondary ? <span className="meta">{item.secondary}</span> : null}
                {item.chips.length > 0 ? (
                  <div className="wrap" style={{ marginTop: 4 }}>
                    {item.chips.slice(0, 8).map((chip) => (
                      <Chip key={chip}>{chip}</Chip>
                    ))}
                  </div>
                ) : null}
              </div>
              <RemoveButton label={`Remove ${item.primary}`} onClick={() => onRemove(item.id)} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
