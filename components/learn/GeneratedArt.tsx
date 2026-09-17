'use client';

/**
 * Deterministic generated artwork.
 *
 * Used wherever a resource has no publisher image. Everything is derived from
 * the resource id, so a given course always looks the same and a row reads as a
 * designed set. Nothing here fetches or invents an external image.
 */
export default function GeneratedArt({
  seedId,
  glyph,
  /** Heroes get a larger, more open composition than a 268px card. */
  scale = 'card',
}: {
  seedId: string;
  glyph: string;
  scale?: 'card' | 'hero';
}) {
  const seed = hash(seedId);
  const rotation = (seed % 4) * 45;
  const hero = scale === 'hero';
  const uid = `${scale}-${seedId}`;

  return (
    <svg
      viewBox={hero ? '0 0 1200 500' : '0 0 320 180'}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <pattern
          id={`lines-${uid}`}
          width={hero ? 64 : 26}
          height={hero ? 64 : 26}
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${rotation})`}
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={hero ? 64 : 26}
            stroke="#ffffff"
            strokeOpacity={hero ? 0.05 : 0.045}
            strokeWidth="1"
          />
        </pattern>
        <radialGradient id={`glow-${uid}`} cx={hero ? '68%' : '72%'} cy={hero ? '34%' : '22%'}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity={hero ? 0.13 : 0.11} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="100%" height="100%" fill={`url(#lines-${uid})`} />
      <rect width="100%" height="100%" fill={`url(#glow-${uid})`} />

      {hero ? (
        <>
          {/* Two offset rings give the hero depth without competing with the
              headline, which sits in the scrimmed left third. */}
          <circle cx="880" cy="190" r="168" stroke="#ffffff" strokeOpacity="0.07" fill="none" />
          <circle cx="880" cy="190" r="254" stroke="#ffffff" strokeOpacity="0.045" fill="none" />
          <text x="880" y="268" fontSize="280" fill="#ffffff" fillOpacity="0.08" textAnchor="middle">
            {glyph}
          </text>
        </>
      ) : (
        <text
          x={230 + (seed % 24)}
          y="126"
          fontSize="104"
          fill="#ffffff"
          fillOpacity="0.09"
          textAnchor="middle"
        >
          {glyph}
        </text>
      )}
    </svg>
  );
}

/** Small deterministic hash so artwork never changes between loads. */
export function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
