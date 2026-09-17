import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/lib/client/session';

/**
 * next/font self-hosts the font files and emits the @font-face rules at build
 * time, so there is no render-blocking request to Google and no layout shift.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-jakarta',
});

/**
 * Display serif, used only for the landing page's editorial headlines.
 * The product UI stays on one sans, mixing families inside the app would
 * fight the dashboard's minimal typography.
 */
const display = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://skillin.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  title: {
    default: 'SkillIn by Amish Sharma · What should I learn next?',
    template: '%s · SkillIn by Amish Sharma',
  },
  authors: [{ name: 'Amish Sharma' }],
  creator: 'Amish Sharma',
  description:
    'SkillIn reads your LinkedIn profile, works out what you already know and what your target role needs, then builds the shortest prerequisite-safe path between the two.',
  applicationName: 'SkillIn',
  openGraph: {
    siteName: 'SkillIn by Amish Sharma',
    title: 'SkillIn by Amish Sharma · What should I learn next?',
    description:
      'Upload your LinkedIn profile. See your real skill gaps. Get a personalised, free-first learning roadmap.',
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SkillIn by Amish Sharma · What should I learn next?',
    description:
      'Upload your LinkedIn profile. See your real skill gaps. Get a personalised, free-first learning roadmap.',
  },
};

export const viewport: Viewport = {
  themeColor: '#B7C1BC',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${display.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
