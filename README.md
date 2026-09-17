# SkillIn

### by Amish Sharma

**What should I learn next?**

SkillIn reads your LinkedIn profile, works out what you have actually demonstrated,
compares it against what your target role needs, and builds the shortest
*prerequisite-safe* path between the two.

It is deliberately not a course catalogue. The distinction the product is built around:

> **Everywhere else:** "Here are the most popular AI courses this month."
>
> **SkillIn:** "You already know Python and Machine Learning. You want to be an AI
> Engineer. You are missing Deep Learning, and it is the only gap you are ready
> to close today."

---

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. **No API keys are required.** Click *Try demo* to
see the whole product, or upload a LinkedIn PDF to run your own profile through it.

---

## The flow

```
Landing → Upload LinkedIn PDF → Extraction → Profile review →
Career goal → Timeline → Weekly hours → Build my path → Dashboard
```

Nothing is typed by hand before the PDF is read. College, branch, skills,
projects and certifications are only ever *confirmed and corrected*, never
entered from scratch.

---

## Three experiences, one product

SkillIn deliberately has three visual personalities, because browsing, reviewing
your own progress and being sold to are three different jobs.

| | Surface | Personality |
| --- | --- | --- |
| **Landing** (`/`) | Cream shell around a dark panel | Editorial, serif display type, the product's own cards floating as the hero |
| **Dashboard** (`/app`) | Sage outside, cream shell, dark rail | Minimal, typographic, lots of whitespace, one lime accent |
| **Learn** (`/app/learn`) | Near-black, full bleed | Cinematic catalog, hero, horizontal rails, hover cards, detail pages |

The shell switches to the dark surface automatically on Learn routes, so the
seam between dashboard and catalog never shows.

---

## The catalog

The Learn section browses like a streaming service and ranks like a tutor.

**Every row is generated from your profile.** There is no "trending overall"
row anywhere, popularity is not an input to any of it:

- *Recommended for you*, ranked by the gap each one closes for your goal
- *Close your Deep Learning gap*, one row per skill the role needs and you lack
- *Because you know Python*, builds on a confirmed skill instead of repeating it
- *Best for AI Engineer* · *Free and open* · *From NPTEL* · *Straight from the source*
- *Not ready yet*, locked, each card naming the prerequisite you are missing
- *Continue learning* · *Your list*, from your real history

Prerequisite-unsafe resources are excluded from every unlocked row, which the
test suite asserts. Rows below the fold mount lazily, so the first paint is a
few rows rather than 200 cards.

A resource's detail page shows why it was recommended in your own evidence,
which prerequisites you have and lack, what you would gain, what it unlocks,
and where it sits in your roadmap.

---

## Course data

Two Coursera datasets are ingested by `scripts/ingest-coursera.mjs`:

```bash
node scripts/ingest-coursera.mjs <Coursera.csv> <coursera_1000_Courses>
#   rows read        3404 + 1000
#   dropped (skills) 925      ← no skill resolved to the taxonomy
#   duplicates       1083
#   written          2315     (546 with publisher cover images)
```

What the ingestion does **not** do:

- **No invented skills.** A course whose skills resolve to nothing in the
  115-skill taxonomy is dropped, not given plausible-looking tags.
- **No invented URLs.** Neither dataset contains course links, so entries point
  at Coursera's real search endpoint with the exact title as the query, and are
  flagged `linkKind: 'search'`. The UI says *"Find on Coursera"*, not
  *"Start learning"*, and explains why.
- **No false "Free".** Access is inferred from the product type: ordinary
  Courses are `audit` (watchable free), Specializations, Professional
  Certificates and Guided Projects are `paid`. Only the curated tier is `free`.

The catalog is two tiers and stays free-first: **116 curated free resources**
with verified URLs and real prerequisites come first, then the 2,315 imported
courses. Delete `data/catalog.generated.json` and the app still works on the
curated tier alone, a test asserts this.

The generated file is compact (short keys, enumerated levels, ids and
descriptions derived at read time): **627 KB raw, ~100 KB gzipped**, imported
only by the Learn route.

---

## Architecture

The rule that shapes the whole codebase: **deterministic code decides, AI only
phrases.**

| Deterministic (always runs) | AI (optional enrichment) |
| --- | --- |
| PDF text extraction | Semantic profile extraction |
| LinkedIn structure parsing | Skill extraction from prose |
| Skill normalisation | Recommendation wording |
| Evidence weighting & skill vectors | Roadmap narrative |
| **Learned skill embeddings** | |
| Cosine similarity, skill gaps | |
| Prerequisite graph & topological sort | |
| Redundancy penalties, ranking | |
| Timeline allocation | |
| Streak & progress logic | |

Gemini never sees the ranking stage. It cannot change *what* is recommended or
in what order, only how the already-decided reasoning is worded. With no
`GEMINI_API_KEY` configured, deterministic prose is used and the product is
fully functional.

### Folder structure

```
app/
  page.tsx                  Landing
  goals/                    Public career explorer
  onboarding/               The upload → review → goal → pace flow
  app/                      The signed-in product (shell + pages)
    page.tsx                Dashboard
    learn/, learn/[id]/     Recommendations, catalog, resource detail
    roadmap/, projects/     Plan and portfolio work
    skills/, profile/       Skill map and editable profile
    activity/, settings/    Streak, history, plan changes
  api/
    profile/extract         PDF → structured profile
    streak                  The only writer of streak values
    activity                Read-only activity feed
  privacy/                  Privacy notice

components/
  ui/          Primitives (Card, Chip, Bar, EmptyState…)
  shell/       App shell, icon rail / bottom nav, immersive mode
  landing/     Hero product-preview composition
  onboarding/  Upload, analysis, review, career, pace steps
  dashboard/   Next move, streak, weekly progress, skill map
  learn/       Course card, cover art, rail, lazy rail, detail
  auth/        Sign in / sign up

lib/
  pdf/           extract.ts (unpdf), linkedin.ts (structure parser)
  profile/       Pipeline + AI merge with Zod validation
  ai/            Gemini client and prompt templates
  skills/        Evidence weighting, skill vectors, cosine similarity
  recommendation/ config, engine, prerequisites, quality
  embeddings/    Skill vector space, gap direction, nearest neighbours
  roadmap/       planner, weekly
  progress/      Derived progress from verified events
  streak/        Pure streak engine
  firebase/      config, auth, firestore (client), admin, store (server)
  client/        Session context
  analysis.ts    One pure function: profile + plan → everything shown

  catalog/       Merged catalog, dataset decoder, personalised rails
  client/        Session context

data/            skills, careers, resources, projects, demo
                 catalog.generated.json     ← built by the ingest script
                 embeddings.generated.json  ← built by the embeddings script
tests/           207 tests
scripts/         verify-resources, make-test-pdf, ingest-coursera,
                 build-embeddings
```

---

## Vector embeddings

Skills are embedded in a 32-dimensional space **learned from the catalog
itself**, so the recommender understands that two topics are related without
anyone ever declaring it.

```bash
npm run build:embeddings
#   documents        2493
#   skills           115
#   dimensions       32
#
#   transformers         → huggingface 0.95, fine-tuning 0.94, llm 0.77
#   penetration-testing  → digital-forensics 0.89, cybersecurity 0.85, network-security 0.73
#   pandas               → numpy 0.93, python 0.77, scikit-learn 0.65
#   kubernetes           → docker 0.74, gcp 0.72, ci-cd 0.60
```

Nothing in the codebase says transformers relate to Hugging Face. That fell out
of how the two co-occur across 2,493 courses, careers and projects.

**Method**, classical distributional semantics, the same family as LSA/GloVe:

1. Count how often each pair of skills appears in the same resource, damped by
   document length so a 12-skill course is weaker per-pair evidence than a
   3-skill one.
2. Convert counts to **PPMI**, which cancels out the fact that `python` is
   everywhere and `qiskit` is nowhere.
3. Factorise the symmetric PPMI matrix with a **Jacobi eigendecomposition** and
   keep the top 32 components.
4. L2-normalise.

Deterministic and dependency-free: 28 KB of vectors, no model download, no API
key, no network call, identical output every run.

### How it is used

The learner's **gap direction** is the centroid of the target role's
requirements weighted by *remaining deficit*, a skill already held contributes
nothing, so the vector points precisely at the work left to do. A resource's
affinity is its cosine against that direction, and it carries **12% of the
ranking weight**.

Where the explicit `skillGap` term can only reward an exact tag match, this
rewards subject-matter adjacency. It is visible in three places:

- the **"How this ranked"** panel on every resource, alongside every other term
- the **explanation**, when adjacency is what actually drove the pick:
  *"It isn't tagged with Large Language Models and Deep Learning, but it sits
  right beside them in the skill map built from how topics co-occur across the
  catalog."*
- **"Covers similar ground"** on the detail page, which is nearest-neighbour
  lookup in the embedding space rather than a tag intersection

### What was measured and rejected

A dedicated *"Next to your gap"* catalog row was built, measured and removed.
For a learner whose gaps are Deep Learning and MLOps, everything the embedding
places near those gaps is ML material they **already know** (redundancy ~100%),
and once the redundant entries are excluded the best remaining affinity is 0.34
- which in this catalog means *"Jenkins for Beginners"*. Either way the row
would have been bad, so it does not ship. The rationale is in
`lib/catalog/rails.ts`, and a test asserts the row stays absent.

The embedding earns its place inside the scorer, where it is balanced against
redundancy and the explicit gap. A test asserts that zeroing its weight changes
the top-6, if it did not, it would be decoration.

---

## How the recommendation engine works

Three models, combined.

**1. Content-based.** Cosine similarity between the learner's skill vector and a
resource's. Weighted at only **0.04**, on purpose. High overlap means the
resource resembles what you already know, which correlates with *redundancy* at
least as much as relevance. It breaks ties; it never drives the ranking.

**2. Skill-gap.** What fraction of the target role's *weighted deficit* does this
resource close? A well-made but irrelevant resource scores zero here.

**3. Hybrid.** The weighted combination, minus a redundancy penalty, gated by
prerequisite readiness. All weights live in `lib/recommendation/config.ts` and
are referenced nowhere else as literals.

```
score = 0.06·academic + 0.10·project + 0.10·experience + 0.04·certificateGap
      + 0.24·skillGap + 0.22·careerMatch + 0.02·similarity
      + 0.12·gapAffinity        ← the embedding term
      + 0.10·quality
      − 0.35·redundancy

(positive weights sum to 1.0, so `total` stays readable as a 0-1 score)
```

### Skill vectors use evidence combination, not overwriting

A skill claimed by an internship, two projects and a certificate should outrank
the same skill claimed once. Evidence combines with a **noisy-OR**:

```
P(skill) = 1 − Π(1 − strengthᵢ)
```

Two 0.85 project signals give 0.9775, not 1.7, corroboration helps, saturates,
and can never exceed 1. Source strength is configurable in `types/index.ts`:

| Evidence | Weight |
| --- | --- |
| Internship / work | 0.95 |
| Project | 0.85 |
| Certificate | 0.70 |
| Academic | 0.65 |
| Self-declared | 0.35 |

### The prerequisite engine really blocks

Skills form a directed graph built from the taxonomy *and* every resource's
declared prerequisites. The graph is **acyclic by construction**: an edge that
would close a loop is refused, so contradictory catalog data can never make the
planner non-terminating. Ordering uses Kahn's algorithm.

A resource whose prerequisites you lack is **excluded from recommendations
entirely**, not merely demoted, and surfaced separately as *"Not ready yet, learn Machine Learning first."* Recommending something you cannot start is worse
than recommending nothing.

### Redundancy

A learner with Python at 0.95 will never be shown "Python for Beginners" as a
next step. Mastery of a resource's skills is penalised, amplified for
beginner-level material. This is asserted in the test suite.

### Quality is not popularity

`lib/recommendation/quality.ts` scores publisher reliability (0.32), completeness
(0.15), recency (0.15), hands-on (0.20) and rating (0.18). Enrolment counts are
**not an input at all**, and a missing rating is treated as neutral rather than
bad, so official documentation can outrank a viral video course.

---

## The roadmap planner

Two constraints it genuinely enforces:

1. Nothing is scheduled before its prerequisites are scheduled, including
   **projects**, which are placed only once the plan has taught what they need.
2. Total hours never exceed `months × hoursPerWeek × 4.33`.

The plan **stops** when the best remaining candidate closes less than 3% of your
original deficit, rather than padding the calendar with marginal material. When
the budget cannot cover everything, the roadmap says so via `uncovered` instead
of silently compressing a 12-month curriculum into 3 months.

---

## The streak is locked

The spec requirement was that the frontend must never modify streak values. It
cannot.

- `lib/streak/engine.ts` is pure and is the **only** place a streak is computed.
- The client POSTs *what happened*, never a streak number, never a timestamp.
  The server uses its own clock.
- Only qualifying actions count. A login, a page view, a save or a profile edit
  never advances a streak (enforced at the API boundary and in the engine).
- Two events on the same local day advance it once.
- Day boundaries use `Intl` in the learner's timezone, so UTC+5:30 and UTC+5:45
  and DST transitions all behave correctly.
- A stale streak is projected to 0 on read rather than displayed as current.
- One missed day may be covered by a grace day; grace days accrue every 14 days
  and cap at 2.

With `FIREBASE_SERVICE_ACCOUNT_KEY` set, `firestore.rules` denies *all* client
writes to `learning_streaks`, `progress`, `learning_activity` and
`recommendations`, the Admin SDK bypasses rules, so the server is the only
writer. Without it the streak is still computed server-side, but cannot be made
tamper-proof; the UI states which mode it is in.

Progress is likewise **derived** from verified events, never submitted. Session
minutes are clamped to 4 hours so a replayed request cannot inflate totals.

---

## Data

| | Count | Notes |
| --- | --- | --- |
| Canonical skills | 115 | With alias normalisation (`ML` → `Machine Learning`) |
| Career goals | 32 | Across 9 fields, each with weighted skill requirements |
| Curated resources | 116 | **All free**, links verified, real prerequisites |
| Imported courses | 2,315 | From your Coursera datasets, 546 with cover images |
| Project templates | 31 | Prerequisite-gated, with stated portfolio outcomes |

Sources: official documentation (42), NPTEL (9), Kaggle, Google, Hugging Face,
freeCodeCamp, MIT/Stanford/Harvard, OWASP, W3C, open textbooks and others. No
single publisher dominates.

**Every curated URL is verified reachable.** `npm run verify:resources` fetches
all 116 and reports dead links separately from bot-blocked ones:

```bash
npm run verify:resources
#   OK        109
#   BLOCKED     7   (reachable, rejects non-browser clients)
#   DEAD        0
```

---

## Onboarding and returning users

The landing page's entry points do not guess. `StartButton` waits for the auth
listener to resolve, then routes:

| State | Destination |
| --- | --- |
| Signed out | `/auth/register` |
| Signed in, profile and plan stored | `/app` |
| Signed in, either missing | `/onboarding`, resumed at the right step |

If a click lands before the listener has resolved, the click is held and the
motion logo covers the wait. Nothing routes on an assumption, so a returning
learner is never asked to create the account they are already signed into.

**Resume comes from the data, not from a step counter.** A stored profile means
the CV is read and confirmed; a stored plan means the goal and pace are chosen.
Deriving the step from the documents cannot drift from the documents, needs no
extra writes, and works on a second device for free. The profile is saved the
moment it is confirmed rather than at the end of the flow, so closing the tab
after the review step does not lose it.

### The continue action

`OnboardingContinue` is the single way forward on every step. It docks to the
bottom of the viewport rather than sitting at the end of the content: the career
list is fifteen screens of cards, and a CTA after the last one is a CTA you have
to go looking for. It appears only once the step's requirement is met, carries
the current choice in its label, and closes behind the first click so a double
tap cannot write two profiles or two plans.

Measured: a 72px bar on desktop, right-aligned inside the content column; 98px
on a phone with a full-width button and `env(safe-area-inset-bottom)`. Steps
carry matching bottom padding so the bar never covers the last card.

---

## The motion logo

`components/brand/MotionLogo.tsx` animates the supplied wordmark rather than a
redrawing of it. The artwork is sliced into thirty vertical columns, each one the
same PNG at a different background offset, and each column runs the same
keyframes on a small time offset. That sends one wave travelling left to right
through the connected cursive: the "s" leads, the middle follows, the "n"
finishes. Columns lift, compress and shear slightly as the wave passes, so the
stroke behaves like a ribbon.

Nothing is redrawn and nothing is permanently deformed. At rest the columns line
up into the untouched logo, which is also where every cycle ends.

Two numbers hold it together:

- **Seam budget.** The vertical step between two neighbouring columns is the
  wave amplitude divided by the column count, scaled by their phase difference.
  At thirty columns that step stays under half a pixel at loader size, so the
  stroke reads as continuous. Twenty columns showed a visible break at the k.
- **Loop seam.** Each column rests from 80% of its own 3.6s cycle. The slowest
  column starts 0.58s late, so it reaches rest at 3.46s, before the first column
  restarts at 3.6s. Every column is at rest across the loop boundary, so there
  is no jump and no reset flash.

It is CSS transforms on plain elements: no video, no GIF, no Lottie, no new
dependency. `prefers-reduced-motion` stops the animation and leaves the logo
standing still.

### Where it is used

Only where the wait is a real wait. `useSlowLoad` holds it back until loading has
run past 600ms, so a cached Firebase session resolves without a flash of loader,
and it exits the instant loading ends.

| State | Treatment |
| --- | --- |
| App boot, auth and first data load | `variant="fullscreen"`, "Loading SkillIn" |
| PDF read and profile extraction | `variant="loader"` inside the drop zone |
| Saving, bookmarking, small writes | Nothing. Those are not waits |

---

## Accounts and data ownership

There is no demo mode and no anonymous state. Every personalised route is behind
Firebase Authentication, and the shell gates in order: signed out goes to
`/auth/login`, signed in without a profile goes to `/onboarding`, and only a
signed-in user with a profile and a plan reaches the app. Nothing renders from
local state in between.

**Firestore is the source of truth.** `localStorage` is a cache for a signed-in
session so a reload paints immediately; it is never read as a second account.
Sign in on a laptop and then a phone and the same uid loads the same profile,
plan, roadmap, saved resources, progress and streak. Signing out clears every
piece of in-memory and cached state without touching what is in Firestore, so
signing in as somebody else cannot show the previous person's data.

The removed demo mode let a signed-out visitor use the entire product out of
`localStorage`, which made a browser rather than an account the thing that held
your work. Its sample profile now lives in `tests/fixtures/sample-profile.ts`,
used only by the test suite, and nothing under `app/` or `components/` may
import it.

---

## Database

Firebase Auth (email/password + Google) and Firestore. Every document is keyed by
`uid`; no collection spans users, which is what makes the rules simple enough to
trust.

| Collection | Client access |
| --- | --- |
| `users`, `profiles`, `plans`, `roadmaps`, `saved_resources` | read + write own |
| `learning_streaks`, `progress`, `learning_activity`, `recommendations` | **read only** |

Deploy the rules:

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

`firebase.json` and `.firebaserc` in the repo root point at the project, so the
deploy needs no extra arguments.

### "Missing or insufficient permissions"

This is Firestore refusing a write, and it means one thing: the rules in
`firestore.rules` have not been deployed, so the project is still running the
default locked mode that denies every client read and write. Run the deploy
above. Two other causes worth ruling out if it persists:

- the signed-in `uid` does not match the document path (all documents are keyed
  by `uid`, by design)
- the write targets a server-only collection (`learning_streaks`, `progress`,
  `learning_activity`, `recommendations`); those are written by the Admin SDK
  only, which is the point of the locked streak

The app does not lose your work when this happens. `lib/firebase/firestore.ts`
recognises a permission rejection, raises `StorageUnavailableError` instead of
crashing, and the session layer keeps writing to `localStorage` first, so the
product stays usable and reports honestly that it is not saving to the account.

The catalog (skills, careers, resources, projects) ships as static data, so it
needs no database read at all.

---

## Environment variables

All optional, see `.env.example`.

| Variable | Without it |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Falls back to the bundled project |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Streak computed server-side but not rule-locked |
| `GEMINI_API_KEY` | Deterministic parser and prose only |
| `GEMINI_MODEL` | Defaults to `gemini-2.0-flash` (free tier) |
| `YOUTUBE_API_KEY` | Curated catalog only |

Placeholder values like `your_gemini_api_key` are detected and treated as absent.

---

## Commands

```bash
npm run dev               # Dev server
npm run build             # Production build
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm test                  # 207 tests
npm run verify:resources  # Check every curated URL resolves
npm run ingest:coursera   # Rebuild the imported catalog from the CSVs
npm run build:embeddings  # Rebuild the skill vector space
npm run check:dashes      # Fail if an em or en dash crept back in
```

---

## Testing

207 tests, covering the behaviours that actually matter:

- **PDF pipeline**, a real generated PDF through real extraction to a structured
  profile; rejects non-PDFs, empty files and image-only scans with specific reasons
- **Parsing**, identity, education, both internships, exact project titles;
  asserts the identity block never leaks into achievements or skills
- **Skill vectors**, evidence combines rather than overwrites, never exceeds 1
- **Redundancy**, *a strong Python student never gets beginner Python as a top step*
- **Prerequisites**, blocked resources are excluded; the real catalog graph is acyclic
- **Roadmap**, no resource *or project* scheduled before its prerequisites; budget
  respected; adapts to timeline and weekly hours; no duplicate padding
- **Streak**, login never counts; two events in a day count once; timezone and DST
  handled; grace days; stale streaks project to zero
- **Analysis**, every one of the 32 careers produces a valid roadmap
- **Catalog**, imported rows carry only canonical skills and real career ids;
  no paid course is ever labelled free; dataset links are always searches, never
  fabricated deep links; the curated tier stands alone without the dataset
- **Rails**, every row is personalised and carries a reason; no unlocked row
  contains a prerequisite-unsafe resource; completed resources never reappear;
  a different goal produces different rows
- **Embeddings**, the learned space clusters AI, security, frontend, data and
  infrastructure correctly; vectors are unit-length and deterministic; the gap
  direction points at what is missing rather than what is held; zeroing the
  embedding weight changes the recommendations

---

## Responsive layout

The three experiences share one set of breakpoints, declared once in
`app/globals.css`:

| Width | What changes |
| --- | --- |
| `> 1280px` | Full layout: 76px icon rail, three-column grids, 40px gutter |
| `1024, 1280px` | Gutters tighten, grids stay three wide |
| `768, 1024px` | Three-column grids become two; the rail keeps its icons |
| `640, 768px` | Two columns become one; gutter drops to 20px |
| `<= 640px` | Phone layout, see below |
| `<= 380px` | Tighter type and padding for the smallest handsets |

### Full bleed, and one width system

The shell takes the viewport less a small margin, up to 1920px: about 1432px at
1440 and 1912px at 1920. There is no nested container anywhere, and the only
`max-width` left in the app is on prose, for line length.

The rail is sticky and exactly one viewport tall, so it follows the page instead
of running out partway down it. That needed the shell to stop clipping: a
`overflow: clip` ancestor is a scroll container, and a sticky child of a
container that never scrolls never sticks. The page itself scrolls normally,
which is the point. Density comes from the layout, never from hiding content.

### Viewport model

`--shell-margin` is 16px on a desktop and 8px on a phone, and the shell is
`min-height: calc(100dvh - margin * 2)` with `margin: <margin> auto`. `auto` is
on the inline axis only: the shell is top aligned, never vertically centred, and
nothing in the tree uses `align-items: center` on the root. Measured at 1440x900
that is 16px of sage above the app and 16px below it, and at 390x844 it is 8px.
`dvh` rather than `vh` so mobile browser chrome does not throw the calculation
off.

`PageSkeleton` mirrors this layout (header, strip, two columns) rather than
being a short stack. A skeleton shorter than the page it stands in for leaves a
block of dead space inside a full height shell, which reads as broken rather
than as loading.

### Dashboard information architecture

Header, context strip, answer beside status, dense secondary row:

```
HEADER        98px   name, goal, Continue Learning
STRIP        108px   background | goal | pace
BOARD               next move, skill analysis   (1.8fr)
                    streak, readiness, totals, also worth, build next  (0.9fr)
```

It is one grid, not two stacked sections. When the hero and the status column
were separate sections, the shorter column left dead space until the next
section began, so the gap under "your next move" was larger than the gap between
any two cards. Two continuous columns give one 16px rhythm everywhere.

At 1440x900 that puts the goal, the context, the next move with its three skill
groups, the streak, all four readiness metrics and the start of the skill
analysis above the fold. What it cost:

- the pill navigation went. It repeated the icon rail on desktop and the bottom
  bar on a phone, so it was a third copy of the same links
- the display-size heading dropped to the `title-xl` step, clamped by viewport
- the week-by-week chart moved to Activity, "not covered in this timeline" moved
  to Skills, and the standalone skill-map card was deleted once the dashboard
  and the Skills page each showed the same six rows
- the streak became one line: flame, count, week. 168px to 65px
- "Your next move" has a `compact` mode that drops the reasoning paragraph,
  which is the first thing behind its own "Why this?" link anyway. 571px to 378px

The density primitives are in `globals.css` and are used everywhere: `.rows` for
a list of facts, `.meter-row` for label / bar / figure on one line, `.line-row`
for a name and a number, `.strip` for the context cards.

### One design system, two surfaces

The dashboard is cream and the catalog is dark, and that is a mode, not a second
design system. Both resolve the same token roles:

| Role | Light | Catalog |
| --- | --- | --- |
| Canvas | `#F5F6F1` | `#0B0C0D` |
| Card | `#ECEFEA` | `#17191D` |
| Raised card | `#FFFFFF` | `#202225` |
| Text | `#17191D` | `#F5F6F1` |
| Muted | `#71808A` | `#A5ADB2` |
| Line | `#DDE1DA` | `#2A2D31` |
| Accent | `#E8FF45` | `#E8FF45` |

Type scale, spacing steps, radii, icon set (Lucide), button variants and the
navigation are shared outright. `--skeleton-base` and `--skeleton-sheen` are
tokens too, so a skeleton loading on the catalog is a dark skeleton rather than
cream blocks from a different application.

In the catalog the rail sits flush against the canvas with a hairline border
instead of floating as a rounded tile on cream. The cream gutter beside it was a
real bug: `learn.css` is imported at the top of `globals.css`, so
`.shell-immersive` lost to `.shell` on source order and the catalog was painting
on a cream shell. It is `.shell.shell-immersive` now.

### The catalog does not scroll sideways on a desktop

Netflix's visual language is worth borrowing. Its rows of content hidden behind
a pair of arrows are not, and they were the main thing making this page tiring.

`CourseRail` reads the resolved `grid-template-columns` from its own track and
renders exactly one row: six cards at 1440, three at 823, four to five in
between. Cards past the first row are not rendered rather than hidden, so
nothing invisible sits in the tab order, and a "Show N more" button expands the
row in place. Nothing hijacks the wheel; there is no `onWheel` handler anywhere
in the catalog.

At 640px and below the track becomes a flex rail again, because one card per row
would make the page enormously long. Cards are 74vw capped at 230px so the next
one peeks in, and the rail is the only element on the page that scrolls
sideways.

The hover detail now sits over the cover rather than below the card. It used to
be a slab that appeared detached from the course and covered the row beneath it.

### Skill map density

A confirmed skill is one row: name, current against required, a bar, and the
evidence types that back it as plain tags rather than chips. 57px a skill, in
two columns on a desktop. Missing skills carry no evidence, so they are a
two-column grid of 34px cells. On a phone both collapse to one column, because
two columns at 390px is 140px a column.

### Coming soon, with nothing invented

Hackathons and Jobs exist in the navigation and have real pages that say what
the feature will do and show nothing else. No sample organisers, dates, salaries
or URLs: a placeholder that looks like data is worse than an empty page, because
someone will act on it. `types/index.ts` carries the `Opportunity` shape those
pages will be built against.

On a phone the bottom bar holds five destinations, so Projects, Hackathons,
Jobs, Profile and Settings are reachable through `/app/more`, linked from the
phone header.

The catalog is deliberately exempt: it is a long document by design, so it keeps
block flow and scrolls normally inside the frame.

The phone layout is a recomposition, not a scaled-down desktop:

- the icon rail leaves the left edge and becomes a fixed bottom navigation of
  five destinations (Home, Skills, Learn, Roadmap, Activity), 70px tall plus
  `env(safe-area-inset-bottom)`, with a lime indicator above the active item
- the rail's remaining items (the logo, profile, settings, sign out) move into a
  sticky top header, so the bottom bar stays at five
- the roadmap's skill chain turns from a wrapping horizontal row into a vertical
  sequence
- category filters and the dashboard's section pills scroll on one row instead
  of stacking three deep
- catalog cards narrow to 168px so a second card peeks in and the rail reads as
  scrollable; the desktop hover card is dropped, since touch has no hover
- the course detail CTA leaves the hero and docks above the bottom navigation
- every interactive target is at least 44px, and every input is at least 16px,
  which is what stops iOS zooming the page on focus

Headings use `clamp()` tuned per level rather than one global scale, and
`html`/`body` clamp horizontal overflow so a single wide child can never produce
a sideways scroll. Verified at 375, 390, 393, 412, 430, 768, 1024 and 1440 with
no horizontal overflow on any route.

### Radii

One scale, used everywhere: 18px small, 22px medium, 26px large, 32px for the
desktop shell, 22px on a phone. They live as `--r-sm` through `--r-shell` so a
component never invents its own.

### Brand marks

`components/brand/Logo.tsx` exposes `LogoMark`, `LogoWordmark` and `LogoLockup`.
The artwork lives in `public/brand/` (`skillin-icon.png`, the dark tile with the
cream `s`; `skillin-wordmark.png`, the script wordmark). The cream wordmark is
inverted automatically on light surfaces, so one file serves both the cream
dashboard and the dark catalog. If either file is missing, the component detects
the failed load and draws the same mark from the display serif already on the
page, so the app never renders a broken image.

### No em dashes

The product contains no em or en dash characters. `npm run check:dashes` walks
every source file and fails on one, so it stays that way.

---

## On the Netflix-clone reference

The supplied repository was inspected before any code was written. It turned out
to contain nothing reusable:

- **No LICENSE**, so it is all-rights-reserved by default.
- It ships **Netflix's own copyrighted assets** (`logo.png`, marketing imagery).
- Its README advertises auth, browsing, search, trailers and "My List", but the
  actual `N/` folder is a **228-line static marketing page** with a 59-line FAQ
  accordion. There are no rails, hover cards, detail modal, search, data layer
  or React.

So no code was taken from it, and none of Netflix's branding or assets appear
anywhere here. The catalog interactions, rails, hover cards, cinematic detail,
lazy mounting, are built from scratch against SkillIn's own data model.

---

## Deploying to Vercel

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. Add environment variables (Settings → Environment Variables). None are required
   to get a working deploy.
3. In the Firebase console → Authentication → Settings → **Authorized domains**,
   add your Vercel domain so Google sign-in works.
4. Deploy. Free tier throughout: Vercel Hobby, Firebase Spark, Gemini free tier.

---

## Privacy

Your uploaded PDF is read in memory to extract text and is **never written to
disk or storage**. Only the structured profile you confirm is saved, against your
own account. Export or permanently delete everything from Settings. Full notice
at `/privacy`.

---

## What is real, and what is seeded

**Real**, PDF extraction, skill normalisation and vectors, gap analysis,
prerequisite gating, redundancy, ranking, explanations, roadmap and weekly
planning, project gating, progress, streak, auth, persistence, search, filters,
save, export, delete.

**Seeded**, the catalog of skills, careers, resources and projects, and the demo
profile. Seed data is data only: the demo runs through exactly the same engine as
an uploaded profile, with no demo-specific code path anywhere.

**Architected but not built**, the `opportunities` shape (hackathons,
internships, jobs, competitions) described in the spec, and live YouTube
discovery behind `YOUTUBE_API_KEY`. Neither is stubbed into the UI; there are no
dead buttons.
