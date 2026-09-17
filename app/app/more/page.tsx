'use client';

import Link from 'next/link';
import { Hammer, Trophy, Briefcase, User, Settings, ArrowRight } from 'lucide-react';
import { Card, Eyebrow } from '@/components/ui/primitives';

/**
 * Everything the phone's bottom bar cannot hold.
 *
 * Five tabs is the most that clears a 44px target at 375px, so the sections
 * that did not make the bar get a real page rather than becoming unreachable.
 * On a desktop the rail lists all of them, and this page is simply another way
 * in.
 */
const ITEMS = [
  { href: '/app/projects', label: 'Projects', icon: Hammer, body: 'What to build, and what each one proves.' },
  { href: '/app/hackathons', label: 'Hackathons', icon: Trophy, body: 'Matched to your skills and eligibility. Coming soon.' },
  { href: '/app/jobs', label: 'Jobs', icon: Briefcase, body: 'Internships and roles matched to your profile. Coming soon.' },
  { href: '/app/profile', label: 'Profile', icon: User, body: 'Your background, projects and skills.' },
  { href: '/app/settings', label: 'Settings', icon: Settings, body: 'Goal, timeline, weekly hours and your account.' },
] as const;

export default function MorePage() {
  return (
    <div className="stack-md">
      <header className="stack-sm page-head">
        <Eyebrow>More</Eyebrow>
        <h1 className="title-xl">Everything else.</h1>
      </header>

      <nav className="soon-grid" aria-label="More sections">
        {ITEMS.map(({ href, label, icon: Icon, body }) => (
          <Link key={href} href={href}>
            <Card hover>
              <div className="spread">
                <div className="row-tight">
                  <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                  <h2 className="title-sm">{label}</h2>
                </div>
                <ArrowRight size={16} aria-hidden="true" />
              </div>
              <p className="meta" style={{ marginTop: 6 }}>
                {body}
              </p>
            </Card>
          </Link>
        ))}
      </nav>
    </div>
  );
}
