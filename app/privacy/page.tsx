import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What SkillIn stores, what it does not, and how to remove it.',
};

export default function PrivacyPage() {
  return (
    <div className="shell" style={{ flexDirection: 'column' }}>
      <main className="shell-main" style={{ maxWidth: 720, margin: '0 auto' }} id="main">
        <Link href="/" className="btn btn-quiet" style={{ padding: '6px 12px', marginBottom: 28 }}>
          ← SkillIn
        </Link>

        <h1 className="title-xl" style={{ marginBottom: 12 }}>
          Privacy
        </h1>
        <p className="lede" style={{ marginBottom: 40 }}>
          Plainly: your profile is yours, it is never shown to anyone else, and you can delete
          all of it at any time.
        </p>

        <div className="stack-lg">
          <Section title="Your uploaded PDF">
            <p>
              The PDF you upload is read in memory on the server to extract its text, and is
              then discarded. The file itself is never written to disk or to storage. Only the
              structured profile derived from it, education, experience, projects, skills, is
              saved, and only against your own account.
            </p>
          </Section>

          <Section title="What we store">
            <ul>
              <li>Your account: name, email address, and sign-in method.</li>
              <li>Your extracted profile, after you have reviewed and confirmed it.</li>
              <li>Your career goal, timeline and weekly hours.</li>
              <li>Your generated roadmap and saved resources.</li>
              <li>Learning activity you record, and the streak derived from it.</li>
            </ul>
          </Section>

          <Section title="Who can see it">
            <p>
              Only you. Every document is keyed to your user ID, and database rules reject any
              read from another account. There is no public profile, no leaderboard, and no
              sharing feature.
            </p>
          </Section>

          <Section title="AI processing">
            <p>
              When an AI key is configured, the text of your profile is sent to Google&apos;s
              Gemini API to improve extraction accuracy. That call is stateless, it returns
              structured fields and nothing is retained by SkillIn beyond the result you
              confirm. When no key is configured, extraction runs entirely on our own server
              with no third party involved.
            </p>
          </Section>

          <Section title="Your controls">
            <ul>
              <li>
                <strong>Export</strong>, download everything we hold as a JSON file, from
                Settings.
              </li>
              <li>
                <strong>Edit</strong>, correct or remove anything in your profile at any time.
              </li>
              <li>
                <strong>Delete</strong>, remove your account and all associated data
                permanently, from Settings. This cannot be undone.
              </li>
            </ul>
          </Section>

          <Section title="External links">
            <p>
              Learning resources link out to their publishers, official documentation, NPTEL,
              freeCodeCamp, universities and others. SkillIn does not track what you do once
              you follow one, and there are no affiliate links.
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="stack-sm">
      <h2 className="title-md">{title}</h2>
      <div className="body" style={{ lineHeight: 1.7 }}>
        {children}
      </div>
    </section>
  );
}
