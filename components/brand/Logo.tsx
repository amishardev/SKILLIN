'use client';

import { useState } from 'react';

/**
 * SkillIn brand marks.
 *
 * Two pieces, matching the supplied artwork:
 *
 *   LogoMark      the app icon: a dark rounded square carrying a cream "s"
 *   LogoWordmark  the script wordmark
 *
 * Both prefer a real asset from `public/brand/` and fall back to a drawn
 * version if the file is absent, so the app never renders a broken image. The
 * fallback is not a placeholder: it is the same mark built from the type system
 * already loaded on the page.
 */

const ICON_SRC = '/brand/skillin-icon.png';
const WORDMARK_SRC = '/brand/skillin-wordmark.png';

const INK = '#17191D';
const CREAM = '#EFEAD9';

/** The square app icon. `tone` flips it for use on a dark surface. */
export function LogoMark({
  size = 32,
  tone = 'dark',
  className,
}: {
  size?: number;
  /** `dark` is a dark tile with a cream letter; `accent` uses the lime. */
  tone?: 'dark' | 'accent' | 'plain';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  const background = tone === 'accent' ? 'var(--accent)' : tone === 'plain' ? 'transparent' : INK;
  const letter = tone === 'accent' ? INK : tone === 'plain' ? 'currentColor' : CREAM;

  if (!failed && tone === 'dark') {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- a fixed-size
         local brand asset; the optimiser adds nothing and this needs an
         onError fallback, which next/image does not surface. */
      <img
        src={ICON_SRC}
        alt=""
        width={size}
        height={size}
        className={className}
        onError={() => setFailed(true)}
        /* The artwork carries its own rounded corners and about 18% transparent
           padding, so it is scaled up inside a box of the requested size rather
           than being re-rounded and rendered small. */
        style={{ display: 'block', flexShrink: 0, transform: 'scale(1.3)' }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background,
        color: letter,
        flexShrink: 0,
        // The supplied icon uses a heavy script "s"; the display serif is the
        // closest face already loaded, so the drawn fallback stays on-brand.
        fontFamily: 'var(--font-display), Georgia, serif',
        fontSize: size * 0.62,
        lineHeight: 1,
        paddingBottom: size * 0.04,
      }}
    >
      s
    </span>
  );
}

/**
 * The full wordmark. Falls back to set type when the asset is missing.
 * `tone` controls the colour so it works on cream and on dark alike.
 */
export function LogoWordmark({
  height = 22,
  tone = 'ink',
}: {
  height?: number;
  tone?: 'ink' | 'cream';
}) {
  const [failed, setFailed] = useState(false);
  const color = tone === 'cream' ? CREAM : INK;

  if (!failed) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- see LogoMark. */
      <img
        src={WORDMARK_SRC}
        alt="SkillIn"
        height={height}
        onError={() => setFailed(true)}
        style={{
          display: 'block',
          height,
          width: 'auto',
          // Same transparent padding as the icon; scale so the two marks read
          // at the same optical weight when they sit side by side.
          transform: 'scale(1.18)',
          transformOrigin: 'left center',
          // The supplied wordmark is cream artwork. On a light surface it is
          // inverted to stay legible rather than disappearing.
          filter: tone === 'ink' ? 'invert(1) brightness(0.16)' : undefined,
        }}
      />
    );
  }

  return (
    <span
      style={{
        fontFamily: 'var(--font-display), Georgia, serif',
        fontStyle: 'italic',
        fontSize: height * 1.15,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color,
      }}
    >
      skillin
    </span>
  );
}

/**
 * Icon plus name, the lockup used in navigation.
 * The byline sits under the name so the credit reads as authorship.
 */
export function LogoLockup({
  size = 30,
  tone = 'ink',
  byline = true,
  className,
}: {
  size?: number;
  tone?: 'ink' | 'cream';
  byline?: boolean;
  className?: string;
}) {
  return (
    <span className={`lp-mark ${className ?? ''}`.trim()}>
      <LogoMark size={size} />
      <span className="lp-wordmark">
        <LogoWordmark height={size * 0.64} tone={tone} />
        {byline ? <span className="lp-byline">by Amish Sharma</span> : null}
      </span>
    </span>
  );
}
