'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useSession } from '@/lib/client/session';
import { CAREER_CATEGORIES, CAREER_GOALS, type CareerGoal } from '@/data/careers';
import { skillName, skillShortName } from '@/data/skills';
import { fullCatalog } from '@/lib/catalog';
import { LogoLockup } from '@/components/brand/Logo';

/**
 * The career explorer.
 *
 * Public: someone can browse the whole taxonomy before uploading anything.
 * Selecting a goal sets it on the session, which for a signed-in learner
 * rebuilds their roadmap, and for a visitor carries into onboarding.
 */
export default function GoalsPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { plan, profile, setPlan } = useSession();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  // How many catalog resources actually serve each role, a real number, not a
  // marketing one, so an under-served goal is visible rather than hidden.
  const coverage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of fullCatalog()) {
      for (const c of r.careerTags) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return counts;
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CAREER_GOALS.filter((c) => {
      if (category !== 'all' && c.category !== category) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.skills.some((s) => skillName(s.skillId).toLowerCase().includes(q))
      );
    });
  }, [query, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, CareerGoal[]>();
    for (const c of results) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    return map;
  }, [results]);

  async function choose(career: CareerGoal) {
    if (profile && plan) {
      // Already onboarded: switching the goal rebuilds everything downstream.
      await setPlan({ ...plan, careerGoalId: career.id });
      router.push('/app');
      return;
    }
    // Not onboarded yet: carry the choice into the upload flow.
    await setPlan({ careerGoalId: career.id, timelineMonths: 12, weeklyHours: 10 });
    router.push('/onboarding');
  }

  const rise = (delay: number) =>
    reduceMotion ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay } };

  return (
    <div className="lp">
      <div className="lp-shell">
        <header className="lp-nav">
          <Link href="/" aria-label="SkillIn by Amish Sharma, home">
            <LogoLockup size={32} />
          </Link>
          <div className="row-tight">
            {profile ? (
              <Link href="/app" className="btn btn-quiet">
                <ArrowLeft size={15} aria-hidden="true" />
                Dashboard
              </Link>
            ) : null}
            <Link href="/onboarding" className="btn btn-dark">
              Build My Path
            </Link>
          </div>
        </header>

        <main id="main">
          {/* ── Heading ── */}
          <motion.div style={{ padding: '38px 4px 30px', maxWidth: 780 }} {...rise(0)}>
            <h1 className="lp-h2" style={{ marginBottom: 14 }}>
              Where are you going?
            </h1>
            <p className="lp-lede">
              Choose the career you&rsquo;re building toward. Every gap, recommendation and roadmap
              in SkillIn is measured against it.
            </p>
          </motion.div>

          {/* ── Search ── */}
          <motion.div style={{ position: 'relative', maxWidth: 520, marginBottom: 18 }} {...rise(0.05)}>
            <Search
              size={16}
              aria-hidden="true"
              style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: '#8E8977' }}
            />
            <input
              className="field"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a career…"
              aria-label="Search careers"
              style={{ paddingLeft: 42, borderRadius: 999, background: 'var(--card-alt)' }}
            />
          </motion.div>

          {/* ── Categories ── */}
          <motion.div className="wrap chip-row" style={{ marginBottom: 34 }} role="tablist" aria-label="Career fields" {...rise(0.08)}>
            <button
              type="button"
              role="tab"
              className="pill"
              aria-selected={category === 'all'}
              onClick={() => setCategory('all')}
            >
              All fields
            </button>
            {CAREER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                className="pill"
                aria-selected={category === cat.id}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </motion.div>

          {/* ── Results ── */}
          {results.length === 0 ? (
            <p className="lp-lede">
              No role matches &ldquo;{query}&rdquo;. Try a broader term, or browse by field.
            </p>
          ) : (
            CAREER_CATEGORIES.filter((cat) => grouped.has(cat.id)).map((cat) => (
              <section key={cat.id} style={{ marginBottom: 38 }}>
                <h2 className="eyebrow" style={{ marginBottom: 14 }}>
                  {cat.label}
                </h2>
                <div className="lp-steps" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                  {grouped.get(cat.id)!.map((career) => {
                    const isCurrent = plan?.careerGoalId === career.id;
                    const required = career.skills.filter((s) => s.required);

                    return (
                      <article
                        key={career.id}
                        className="lp-step"
                        style={{
                          minHeight: 0,
                          background: isCurrent ? '#17191D' : 'var(--cream-2)',
                          color: isCurrent ? '#EFEAD9' : undefined,
                        }}
                      >
                        <div className="spread" style={{ alignItems: 'flex-start', marginBottom: 10 }}>
                          <h3 className="title-sm">{career.title}</h3>
                          {isCurrent ? (
                            <span className="lp-tag" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                              Your goal
                            </span>
                          ) : career.demand === 'extreme' ? (
                            <span className="lp-tag">In demand</span>
                          ) : null}
                        </div>

                        <p
                          style={{
                            fontSize: '0.875rem',
                            lineHeight: 1.55,
                            color: isCurrent ? '#9C9A92' : '#55534C',
                            marginBottom: 14,
                          }}
                        >
                          {career.description}
                        </p>

                        <div className="wrap" style={{ gap: 5, marginBottom: 14 }}>
                          {required.slice(0, 5).map((s) => (
                            <span key={s.skillId} className="lp-tag">
                              {skillShortName(s.skillId)}
                            </span>
                          ))}
                          {required.length > 5 ? (
                            <span className="lp-tag">+{required.length - 5}</span>
                          ) : null}
                        </div>

                        <dl
                          className="spread"
                          style={{
                            margin: '0 0 16px',
                            fontSize: '0.75rem',
                            color: isCurrent ? '#9C9A92' : '#6B675C',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>{required.length} core skills</span>
                          <span>{career.typicalRamp}</span>
                          <span>{(coverage.get(career.id) ?? 0).toLocaleString()} resources</span>
                        </dl>

                        <button
                          type="button"
                          className={isCurrent ? 'btn btn-onpanel' : 'btn btn-dark'}
                          onClick={() => (isCurrent ? router.push('/app') : void choose(career))}
                          style={{ alignSelf: 'flex-start' }}
                        >
                          {isCurrent ? (
                            <>
                              <Check size={15} aria-hidden="true" />
                              Open dashboard
                            </>
                          ) : (
                            <>
                              Set as my goal
                              <ArrowRight size={15} aria-hidden="true" />
                            </>
                          )}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}

          <div style={{ paddingTop: 20 }}>
            <p className="lp-lede">
              Not sure yet? Upload your profile first, we&rsquo;ll show which of these you are
              already closest to.
            </p>
            <Link href="/onboarding" className="btn btn-orange btn-lg" style={{ marginTop: 16 }}>
              Build My Learning Path
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </main>

        <footer className="lp-footer">
          <span>
            <strong style={{ fontWeight: 600, color: '#3F3C34' }}>SkillIn</strong> by Amish Sharma
            &nbsp;·&nbsp; {CAREER_GOALS.length} career goals across {CAREER_CATEGORIES.length} fields.
          </span>
          <nav className="row" aria-label="Footer">
            <Link href="/privacy">Privacy</Link>
            <Link href="/auth/login">Log in</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
