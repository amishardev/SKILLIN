# Brand assets

Drop the two supplied logo files here, with exactly these names:

| File | What it is |
| --- | --- |
| `skillin-icon.png` | The square app icon: dark rounded tile with the cream `s` |
| `skillin-wordmark.png` | The script `skillin` wordmark, cream on transparent |

`components/brand/Logo.tsx` picks them up automatically. Transparent PNG or SVG
both work; if you use SVG, change the two `*_SRC` constants in that file to
`.svg`.

**Nothing breaks if these files are absent.** `LogoMark` and `LogoWordmark`
detect the failed load and fall back to drawing the same mark with the display
serif already loaded on the page, so the app always renders a finished logo.

A cream wordmark is inverted automatically when it sits on a light surface, so
one file covers both the cream landing page and the dark catalog.

| `skillin-app-icon.png` | The icon with its transparent padding trimmed, referenced by the web manifest |

### The tab icon

`app/favicon.ico`, `app/icon.png` and `app/apple-icon.png` are generated from
`skillin-icon.png` by trimming its transparent padding and squaring the result,
so the mark fills the box at 16px instead of sitting in the middle of it. Next.js
picks all three up by filename and emits the link tags, and `app/manifest.ts`
covers the installed-app icon. Regenerate them if the artwork changes; there is
no other favicon in the project.
