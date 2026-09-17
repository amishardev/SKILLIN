'use client';

import { Card, Eyebrow } from '@/components/ui/primitives';

/**
 * A page that honestly says a section is not built yet.
 *
 * It shows what the feature will do and nothing more. No sample organisations,
 * no sample deadlines, no sample salaries: a placeholder that looks like real
 * data is worse than an empty page, because someone will act on it.
 */
export default function ComingSoon({
  eyebrow,
  title,
  lede,
  features,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  features: { title: string; body: string }[];
}) {
  return (
    <div className="stack-md">
      <header className="stack-sm page-head">
        <div className="row-tight">
          <Eyebrow>{eyebrow}</Eyebrow>
          <span className="chip chip-accent">Coming soon</span>
        </div>
        <h1 className="title-xl">{title}</h1>
        <p className="lede" style={{ maxWidth: '62ch' }}>
          {lede}
        </p>
      </header>

      <section className="soon-grid" aria-label="Planned capabilities">
        {features.map((feature) => (
          <Card key={feature.title} variant="white">
            <div className="spread">
              <h2 className="title-sm">{feature.title}</h2>
              <span className="meta soon-tag">Coming soon</span>
            </div>
            <p className="meta" style={{ marginTop: 6 }}>
              {feature.body}
            </p>
          </Card>
        ))}
      </section>
    </div>
  );
}
