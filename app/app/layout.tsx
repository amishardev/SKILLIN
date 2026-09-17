import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/AppShell';

/**
 * Everything under /app is somebody's own profile, roadmap and progress.
 * It is behind a session, it has no value in a search result, and it should
 * not be crawled even if a URL leaks.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
