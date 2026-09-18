'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import {
  Home, BarChart3, BookOpen, Map, Hammer, Activity, User, Settings, LogOut,
  Trophy, Briefcase, LayoutGrid,
} from 'lucide-react';
import { useSession } from '@/lib/client/session';
import { signOutUser } from '@/lib/firebase/auth';
import { PageSkeleton } from '@/components/ui/primitives';
import { LogoMark } from '@/components/brand/Logo';
import SkillInMotionLogo, { useSlowLoad } from '@/components/brand/MotionLogo';

/**
 * The application shell: a centred, rounded surface on a sage field, with a
 * dark icon rail that becomes a bottom bar on small screens.
 */

/**
 * Primary sections, in the order the product loop runs.
 *
 * `onPhone` marks the five that make it into the bottom bar. Six tabs at
 * 375px leaves each one about 58px wide, which is below a comfortable target,
 * so Projects moves under Roadmap on a phone, where it already belongs.
 */
const NAV = [
  { href: '/app', label: 'Overview', short: 'Home', icon: Home, onPhone: true },
  { href: '/app/skills', label: 'Skills', short: 'Skills', icon: BarChart3, onPhone: true },
  { href: '/app/learn', label: 'Learn', short: 'Learn', icon: BookOpen, onPhone: true },
  { href: '/app/roadmap', label: 'Roadmap', short: 'Roadmap', icon: Map, onPhone: true },
  { href: '/app/projects', label: 'Projects', short: 'Build', icon: Hammer, onPhone: false },
  { href: '/app/hackathons', label: 'Hackathons', short: 'Hacks', icon: Trophy, onPhone: false },
  { href: '/app/jobs', label: 'Jobs', short: 'Jobs', icon: Briefcase, onPhone: false },
  { href: '/app/activity', label: 'Activity', short: 'Activity', icon: Activity, onPhone: true },
] as const;

/** Account-level items, pinned to the bottom of the rail. */
const NAV_FOOT = [
  { href: '/app/profile', label: 'Profile', icon: User },
  { href: '/app/settings', label: 'Settings', icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authReady, dataReady, loadError, retryLoad, user, profile, plan } = useSession();
  const ready = authReady && dataReady;

  // Learn is a deliberately different mode: a dark, immersive catalog rather
  // than the cream editorial dashboard. The shell follows it so the surrounding
  // chrome does not break the immersion at the seam.
  const immersive = pathname.startsWith('/app/learn');

  /*
   * Two gates, in order.
   *
   * Signed out goes to the login screen: everything under /app is one person's
   * profile, roadmap and progress, and there is no version of it worth showing
   * to nobody in particular. Signed in without a profile goes to onboarding.
   *
   * Nothing renders from local state in the meantime. The old behaviour let an
   * unsigned visitor use the whole product out of localStorage, which made a
   * browser, rather than an account, the thing that held your work.
   */
  useEffect(() => {
    // Signed out is knowable from auth alone, and waiting on Firestore to say
    // so is what left this screen loading forever when Firestore would not
    // answer.
    if (!authReady) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    /*
     * Past this point the decision needs the documents, and it needs them to
     * have actually been read. An unreachable database is not an empty one, and
     * treating it as one sends a learner who has a profile through onboarding
     * to build a second.
     */
    if (!dataReady || loadError) return;
    if (!profile || !plan) {
      router.replace('/onboarding');
    }
  }, [authReady, dataReady, loadError, user, profile, plan, router]);

  /*
   * The motion logo is for waits that are actually waits. Firebase resolving a
   * cached session is usually well under half a second, and a loader that
   * appears for 200ms is a flash, so this only shows once the wait crosses the
   * threshold. Below it the page simply stays blank for a moment.
   */
  const slow = useSlowLoad(!ready || !user || !profile || !plan);

  /*
   * Signed in, but the profile could not be read. Not a sign-out: the account
   * is fine and the session is valid, so throwing the learner back to the login
   * screen would be both wrong and infuriating. Offer the two things that can
   * actually help.
   */
  if (authReady && user && loadError) {
    return (
      <div className="shell">
        <main className="shell-main" style={{ display: 'grid', placeItems: 'center' }}>
          <div className="stack-md" style={{ maxWidth: 380, textAlign: 'center' }}>
            <h1 className="title-sm">We signed you in, but couldn&apos;t load your profile.</h1>
            <p className="body">
              Your work is safe. This is usually a connection problem.
            </p>
            <div className="wrap" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-dark"
                style={{ minHeight: 44 }}
                onClick={() => void retryLoad()}
              >
                Retry
              </button>
              <SignOutButton onDone={() => router.push('/')} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!ready || !user || !profile || !plan) {
    if (slow) {
      return <SkillInMotionLogo variant="fullscreen" message="Loading SkillIn" />;
    }
    return (
      <div className="shell">
        <main className="shell-main">
          <PageSkeleton />
        </main>
      </div>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className={`shell ${immersive ? 'shell-immersive' : ''}`.trim()}>
        <nav className="rail" aria-label="Primary">
          <div className="rail-desktop-only">
            <RailLogo />
          </div>
          <div className="rail-spacer" style={{ height: 10 }} />
          {NAV.map(({ href, label, short, icon: Icon, onPhone }) => {
            const active = href === '/app' ? pathname === '/app' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rail-btn ${onPhone ? '' : 'rail-desktop-only'}`.trim()}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
              >
                <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                <span className="rail-tip" role="tooltip">
                  {label}
                </span>
                {/* Visible only on the bottom bar, where an icon alone is too
                    ambiguous to tap confidently. */}
                <span className="rail-label" aria-hidden="true">
                  {short}
                </span>
              </Link>
            );
          })}
          <div className="rail-spacer" style={{ flex: 1 }} />

          {NAV_FOOT.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="rail-btn rail-desktop-only"
              aria-current={pathname.startsWith(href) ? 'page' : undefined}
              aria-label={label}
            >
              <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
              <span className="rail-tip" role="tooltip">
                {label}
              </span>
            </Link>
          ))}

          <span className="rail-desktop-only">
            <SignOutButton onDone={() => router.push('/')} />
          </span>
        </nav>

        <main className="shell-main" id="main">
          <MobileHeader immersive={immersive} />
          {children}
        </main>
      </div>
    </>
  );
}

/**
 * Phone-only header.
 *
 * The desktop rail carries the logo and the account items; on a phone the rail
 * becomes a five-tab bottom bar, so those move up here where there is room for
 * them and they stay within thumb reach of the top of the screen.
 */
function MobileHeader({ immersive }: { immersive: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const onAccount = pathname.startsWith('/app/profile') || pathname.startsWith('/app/settings');

  return (
    <header
      className="mobile-header"
      style={immersive ? { borderBottomColor: '#26262A' } : undefined}
    >
      <Link href="/app" aria-label="SkillIn by Amish Sharma, home">
        <LogoMark size={30} />
      </Link>

      <div className="row-tight">
        <Link
          href="/app/settings"
          className="mobile-header-btn"
          aria-label="Settings"
          aria-current={pathname.startsWith('/app/settings') ? 'page' : undefined}
        >
          <Settings size={18} strokeWidth={1.9} aria-hidden="true" />
        </Link>
        <Link
          href="/app/profile"
          className="mobile-header-btn"
          aria-label="Profile"
          aria-current={onAccount && pathname.startsWith('/app/profile') ? 'page' : undefined}
        >
          <User size={18} strokeWidth={1.9} aria-hidden="true" />
        </Link>
        {/* The bottom bar holds five destinations; the rest live behind this. */}
        <Link
          href="/app/more"
          className="mobile-header-btn"
          aria-label="More sections"
          aria-current={pathname.startsWith('/app/more') ? 'page' : undefined}
        >
          <LayoutGrid size={18} strokeWidth={1.9} aria-hidden="true" />
        </Link>
        <SignOutButton onDone={() => router.push('/')} variant="header" />
      </div>
    </header>
  );
}

function RailLogo() {
  return (
    <Link
      href="/app"
      aria-label="SkillIn by Amish Sharma, home"
      title="SkillIn by Amish Sharma"
      style={{ display: 'block', marginBottom: 6 }}
    >
      <LogoMark size={38} />
    </Link>
  );
}

/**
 * `rail` is the desktop icon rail; `header` is the phone header, where the
 * bottom navigation is reserved for the five destinations and an action this
 * size would crowd them.
 */
function SignOutButton({ onDone, variant = 'rail' }: { onDone: () => void; variant?: 'rail' | 'header' }) {
  const { user, clearSession } = useSession();

  return (
    <button
      type="button"
      className={variant === 'header' ? 'mobile-header-btn' : 'rail-btn rail-desktop-only'}
      aria-label="Sign out"
      onClick={async () => {
        if (user) {
          try {
            await signOutUser();
          } catch {
            // Signing out locally is still the right outcome.
          }
        }
        clearSession();
        onDone();
      }}
    >
      <LogOut size={variant === 'header' ? 18 : 19} strokeWidth={1.9} aria-hidden="true" />
      <span className="rail-tip" role="tooltip">
        Sign out
      </span>
    </button>
  );
}

