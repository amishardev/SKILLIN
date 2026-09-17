'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, FileText, Target, Route } from 'lucide-react';
import { useSession } from '@/lib/client/session';
import HeroStage from '@/components/landing/HeroStage';
import { LogoLockup } from '@/components/brand/Logo';
import { RESOURCES } from '@/data/resources';
import { CAREER_GOALS } from '@/data/careers';
import { SKILLS } from '@/data/skills';
import { datasetCount } from '@/lib/catalog/dataset';
import StartButton from '@/components/landing/StartButton';

/**
 * Landing page.
 *
 * Editorial and typographic: a cream shell wrapping a dark hero panel, with the
 * product's own cards floating inside it. The first screen has to communicate
 * upload → goal → roadmap without a wall of text.
 */
export default function LandingPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-80px' },
          transition: { duration: 0.5, delay, ease: [0.22, 0.61, 0.36, 1] as const },
        };

  const totalResources = RESOURCES.length + datasetCount;

  return (
    <div className="lp">
      <div className="lp-shell">
        {/* ══ Nav ══ */}
        <header className="lp-nav">
          <Link href="/" aria-label="SkillIn by Amish Sharma, home">
            <LogoLockup size={32} />
          </Link>

          <nav className="lp-nav-links" aria-label="Primary">
            <a href="#how">Product</a>
            <a href="#how">How it works</a>
            <Link href="/goals">Explore Goals</Link>
            <a href="#catalog">Resources</a>
          </nav>

          <div className="row-tight">
            <Link href="/auth/login" className="btn btn-quiet">
              Log in
            </Link>
            <StartButton className="btn btn-dark" signedInLabel="Open SkillIn">
              Get Started
            </StartButton>
          </div>
        </header>

        {/* ══ Hero panel ══ */}
        <section className="lp-panel">
          <div className="lp-grid" aria-hidden="true" />

          <div className="lp-hero">
            <div>
              <motion.div
                className="row-tight"
                style={{ marginBottom: 26 }}
                {...(reduceMotion ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5 } })}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: 'var(--accent)',
                    color: 'var(--accent-ink)',
                  }}
                >
                  <Route size={13} />
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--on-panel-2)' }}>
                  <strong style={{ color: 'var(--on-panel)', fontWeight: 600 }}>
                    {totalResources.toLocaleString()} resources
                  </strong>{' '}
                  · {CAREER_GOALS.length} career goals · {SKILLS.length} mapped skills
                </span>
              </motion.div>

              <motion.h1
                className="lp-display"
                style={{ marginBottom: 26 }}
                {...(reduceMotion
                  ? {}
                  : {
                      initial: { opacity: 0, y: 20 },
                      animate: { opacity: 1, y: 0 },
                      transition: { duration: 0.6, delay: 0.06, ease: [0.22, 0.61, 0.36, 1] as const },
                    })}
              >
                Know where you are.
                <br />
                <em>Know where you&rsquo;re going.</em>
              </motion.h1>

              <hr className="lp-rule" style={{ marginBottom: 22 }} />

              <motion.p
                className="lp-sub"
                style={{ marginBottom: 30 }}
                {...(reduceMotion
                  ? {}
                  : {
                      initial: { opacity: 0, y: 14 },
                      animate: { opacity: 1, y: 0 },
                      transition: { duration: 0.5, delay: 0.14 },
                    })}
              >
                Upload your LinkedIn profile. Pick your destination. SkillIn maps the shortest
                prerequisite-safe path between them.
              </motion.p>

              <motion.div
                className="wrap"
                {...(reduceMotion
                  ? {}
                  : {
                      initial: { opacity: 0, y: 14 },
                      animate: { opacity: 1, y: 0 },
                      transition: { duration: 0.5, delay: 0.2 },
                    })}
              >
                <StartButton className="btn btn-orange btn-lg" signedInLabel="Open your dashboard">
                  Build My Learning Path
                  <ArrowRight size={16} aria-hidden="true" />
                </StartButton>
                <Link href="/goals" className="btn btn-onpanel btn-lg">
                  Explore Goals
                </Link>
                <Link href="/auth/register" className="btn btn-quiet">Create an account</Link>
              </motion.div>
            </div>

            <HeroStage />
          </div>
        </section>

        {/* ══ Provider strip ══ */}
        <div className="lp-strip">
          {['NPTEL', 'freeCodeCamp', 'MIT OpenCourseWare', 'Stanford', 'Hugging Face', 'Google', 'Coursera'].map(
            (name) => (
              <span key={name}>{name}</span>
            ))}
        </div>

        {/* ══ From profile to path ══ */}
        <section className="lp-section" id="how">
          <motion.h2 className="lp-h2" style={{ marginBottom: 14 }} {...rise(0)}>
            From profile to path.
          </motion.h2>
          <motion.p className="lp-lede" style={{ marginBottom: 40 }} {...rise(0.05)}>
            Three steps, no forms to fill in. Everything starts from what you have already done.
          </motion.p>

          <div className="lp-steps">
            {[
              {
                n: '01',
                icon: <FileText size={17} aria-hidden="true" />,
                title: 'Understand you',
                body: 'We read your education, projects, internships, certifications and skills, and trace every skill back to the line that proves it. Nothing is invented.',
              },
              {
                n: '02',
                icon: <Target size={17} aria-hidden="true" />,
                title: 'Find your gaps',
                body: `Pick from ${CAREER_GOALS.length} technical roles, each with a weighted skill profile. We measure the distance between where you are and what the role needs.`,
              },
              {
                n: '03',
                icon: <Route size={17} aria-hidden="true" />,
                title: 'Build your path',
                body: 'A month-by-month roadmap that fits your real hours, refuses to recommend anything you are not ready for, and rebuilds as you learn.',
              },
            ].map((step, i) => (
              <motion.div key={step.n} className="lp-step" {...rise(0.06 * i)}>
                <div className="spread" style={{ alignItems: 'flex-start' }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: 11,
                      background: '#17191D',
                      color: '#EFEAD9',
                    }}
                  >
                    {step.icon}
                  </span>
                  <span className="lp-step-n">{step.n}</span>
                </div>
                <h3 className="title-sm" style={{ margin: '22px 0 8px' }}>
                  {step.title}
                </h3>
                <p className="body" style={{ fontSize: '0.875rem' }}>
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ══ The distinction ══ */}
        <section className="lp-section">
          <motion.h2 className="lp-h2" style={{ marginBottom: 40 }} {...rise(0)}>
            Not the most popular course.
            <br />
            <em style={{ fontStyle: 'italic', color: '#8E8977' }}>The right next course.</em>
          </motion.h2>

          <div className="lp-split">
            <motion.div className="lp-quote-bad" {...rise(0.04)}>
              <div className="lp-eyebrow" style={{ marginBottom: 14, opacity: 1 }}>
                Everywhere else
              </div>
              &ldquo;Here are this month&rsquo;s most popular AI courses.&rdquo;
            </motion.div>

            <motion.div className="lp-quote-good" {...rise(0.09)}>
              <div className="lp-eyebrow" style={{ marginBottom: 14, color: 'var(--accent)', opacity: 1 }}>
                SkillIn
              </div>
              &ldquo;You already demonstrate Python and Machine Learning through your projects and
              internship. Deep Learning is the largest prerequisite-safe gap between you and AI
              Engineer.&rdquo;
            </motion.div>
          </div>

          <motion.p className="lp-lede" style={{ marginTop: 26 }} {...rise(0.12)}>
            Popularity is not an input to our ranking. Not in the recommendation engine, not in the
            catalog rows, not anywhere.
          </motion.p>
        </section>

        {/* ══ Built around what you know ══ */}
        <section className="lp-section">
          <motion.h2 className="lp-h2" style={{ marginBottom: 14 }} {...rise(0)}>
            Built around what you already know.
          </motion.h2>
          <motion.p className="lp-lede" style={{ marginBottom: 36 }} {...rise(0.04)}>
            Four kinds of evidence, weighted by how much they actually prove. An internship counts
            for more than a checkbox.
          </motion.p>

          <div className="lp-evidence">
            {[
              ['Internships', '0.95', 'Paid work is the strongest signal there is.'],
              ['Projects', '0.85', 'You built it, so you can talk about it.'],
              ['Certificates', '0.70', 'Real, but narrower than shipping something.'],
              ['Education', '0.65', 'Your degree implies foundations we can use.'],
            ].map(([label, weight, note], i) => (
              <motion.div key={label} className="lp-evidence-item" {...rise(0.04 * i)}>
                <div
                  className="num"
                  style={{
                    fontFamily: 'var(--font-display), Georgia, serif',
                    fontSize: '2.25rem',
                    lineHeight: 1,
                    marginBottom: 10,
                  }}
                >
                  {weight}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4 }}>{label}</div>
                <div className="meta">{note}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ══ Catalog ══ */}
        <section className="lp-section" id="catalog">
          <div className="lp-split">
            <motion.div {...rise(0)}>
              <h2 className="lp-h2" style={{ marginBottom: 14 }}>
                A catalog that reorders itself around you.
              </h2>
              <p className="lp-lede" style={{ marginBottom: 24 }}>
                Every row is generated from your goal, your gaps and what you have already finished, &ldquo;Close your Deep Learning gap&rdquo;, &ldquo;Because you know Python&rdquo;,
                &ldquo;Not ready yet&rdquo;. Free and open resources come first.
              </p>
              <StartButton className="btn btn-dark btn-lg" signedInLabel="Open your catalog">
                Build your catalog
                <ArrowRight size={16} aria-hidden="true" />
              </StartButton>
            </motion.div>

            <motion.div {...rise(0.06)}>
              <div
                style={{
                  background: 'var(--panel)',
                  borderRadius: 20,
                  padding: 22,
                  color: 'var(--on-panel)',
                }}
              >
                {[
                  ['Recommended for you', 'Ranked by the gap each one closes'],
                  ['Close your Deep Learning gap', 'AI Engineer needs it; you have none of it'],
                  ['Because you know Python', 'Builds on it rather than repeating it'],
                  ['Not ready yet', 'Each needs a prerequisite you have not covered'],
                ].map(([title, reason], i) => (
                  <div
                    key={title}
                    style={{
                      padding: '13px 0',
                      borderBottom: i < 3 ? '1px solid var(--rule-dark)' : 'none',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-panel-2)', marginTop: 3 }}>
                      {reason}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══ Final CTA ══ */}
        <section className="lp-section">
          <motion.div className="lp-cta" {...rise(0)}>
            <div className="lp-grid" aria-hidden="true" />
            <h2
              className="lp-display"
              style={{ fontSize: 'clamp(2.25rem, 4.6vw, 4rem)', marginBottom: 20 }}
            >
              What should you
              <br />
              <em>learn next?</em>
            </h2>
            <p className="lp-sub" style={{ margin: '0 auto 30px' }}>
              Find out in about two minutes. Free, and your roadmap is saved to your account.
            </p>
            <div className="wrap" style={{ justifyContent: 'center' }}>
              <StartButton className="btn btn-orange btn-lg" signedInLabel="Open your dashboard">
                Build My Path
                <ArrowRight size={16} aria-hidden="true" />
              </StartButton>
              <Link href="/auth/register" className="btn btn-quiet">Create an account</Link>
            </div>
          </motion.div>
        </section>

        {/* ══ Footer ══ */}
        <footer className="lp-footer">
          <span>
            <strong style={{ fontWeight: 600, color: '#3F3C34' }}>SkillIn</strong> by Amish Sharma
            &nbsp;·&nbsp; Here&rsquo;s where you are. Here&rsquo;s where you&rsquo;re going.
          </span>
          <nav className="row" aria-label="Footer">
            <Link href="/privacy">Privacy</Link>
            <Link href="/goals">Careers</Link>
            <Link href="/auth/login">Log in</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
