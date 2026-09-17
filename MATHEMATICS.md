# The mathematics of SkillIn

Every number this product shows can be traced back to the PDF you uploaded.
This document is that trace, written out.

There is no neural network here, no training loop, no gradient descent. The
whole system is classical mathematics, most of it settled before 1980:
probability, information theory, linear algebra, graph theory and a greedy
optimiser. That is a deliberate choice, and the reason for it is the last
section of this document.

All numbers in the worked examples are real output from the pipeline, not
illustrations.

---

## Contents

1. [The problem](#1-the-problem)
2. [Combining evidence: noisy-OR](#2-combining-evidence-noisy-or)
3. [Measuring the gap: subtraction](#3-measuring-the-gap-subtraction)
4. [Learning what skills mean: PMI](#4-learning-what-skills-mean-pmi)
5. [Compressing meaning: eigendecomposition](#5-compressing-meaning-eigendecomposition)
6. [Comparing direction: cosine similarity](#6-comparing-direction-cosine-similarity)
7. [Ordering the path: graph theory](#7-ordering-the-path-graph-theory)
8. [Ranking: convex combination](#8-ranking-convex-combination)
9. [Diversity: a redundancy penalty](#9-diversity-a-redundancy-penalty)
10. [Planning the roadmap: greedy selection](#10-planning-the-roadmap-greedy-selection)
11. [Readiness: a stated heuristic](#11-readiness-a-stated-heuristic)
12. [A full worked example](#12-a-full-worked-example)
13. [What was measured and rejected](#13-what-was-measured-and-rejected)
14. [Why this maths and not a model](#14-why-this-maths-and-not-a-model)

---

## 1. The problem

A learner uploads a LinkedIn PDF and names a target role. The product answers
one question: **what should I learn next?**

Stated formally, given

- a profile $P$ of education, experience, projects and certifications,
- a target role $R$ with required skill levels,
- a catalog $C$ of 2,431 learning resources,

produce an ordered sequence of resources from $C$ that closes the distance
between $P$ and $R$, subject to the constraint that no resource is scheduled
before its prerequisites are met.

Six pieces of mathematics do this. Each section below names one, shows where it
fires, and shows why the obvious alternative was wrong.

---

## 2. Combining evidence: noisy-OR

### The problem

A skill can be evidenced several times in one profile. "Python" might appear in
a self-declared skills list, in a project description, in an internship, and on
a certificate. Each is a separate, imperfect signal. How do they combine into
one confidence score?

### Why the obvious answers fail

**Taking the maximum** throws away information: four pieces of evidence should
say more than one.

**Taking the average** is actively wrong. Three signals of strength 0.7 would
average to 0.7, exactly the same as one signal of 0.7. Adding evidence would
never increase confidence, which is the opposite of what evidence does.

**Summing** breaks the scale immediately: three signals of 0.7 sum to 2.1, and
a confidence of 210% means nothing.

### The model

Treat each piece of evidence as an independent cause that could produce the
observation. Ask the inverted question: what is the probability that **no**
cause fires?

$$P(\text{skill}) = 1 - \prod_{i=1}^{n}(1 - s_i)$$

where $s_i \in [0,1]$ is the strength of the $i$-th piece of evidence.

```ts
export function combineEvidence(strengths: number[]): number {
  let complement = 1;
  for (const s of strengths) complement *= 1 - clamp01(s);
  return clamp01(1 - complement);
}
```

### Why it behaves correctly

It is **monotonic**: adding evidence never decreases the score.

It **saturates**: the product of numbers below 1 approaches 0, so the result
approaches 1 without ever reaching it. No amount of evidence produces certainty.

It has **diminishing returns**: the first piece of evidence moves the score far
more than the fifth. This is the right shape for correlated evidence, and
profile evidence is heavily correlated, since someone who lists Python probably
also used it in a project.

### Worked

Three independent signals of strength 0.7:

$$1 - (0.3)^3 = 1 - 0.027 = 0.9730$$

Real output from the pipeline:

```
Python              score=0.998   evidence = self + project + internship + certificate
Machine Learning    score=0.989   evidence = self + project + internship
Feature Engineering score=0.986   evidence = project + internship
```

Four signals beat three, three beat two, and nothing reaches 1.0.

**Where:** `lib/skills/vector.ts`

---

## 3. Measuring the gap: subtraction

### The model

A career goal is a list of required skill levels. The learner's profile produces
a skill vector: a map from skill id to a confidence score in $[0,1]$.

The gap for each skill is elementwise:

$$\text{gap}(s) = \max\bigl(0,\; w_s - c_s\bigr)$$

where $w_s$ is the level the role requires and $c_s$ is the learner's current
level. Status follows from thresholds:

$$\text{status}(s) = \begin{cases}
\text{confirmed} & c_s \geq 0.55 \\
\text{developing} & 0.15 < c_s < 0.55 \\
\text{missing} & c_s \leq 0.15
\end{cases}$$

```ts
const current = levelOf(vector, skillId);
const gap = Math.max(0, weight - current);
```

### Why it is deliberately this simple

This is the one place where a more sophisticated method would be worse.

Cosine similarity between a profile vector and a role vector would produce a
single number like 0.73. That number is not actionable and not explainable. A
learner cannot do anything with it.

Subtraction produces "Deep Learning: you have 0%, the role needs 80%". That is a
sentence a person can act on, and it is exactly as accurate.

The system uses vector similarity elsewhere, where the question genuinely is
about direction. Here the question is about **magnitude per skill**, and
subtraction answers it.

### Worked

```
Large Language Models   need=0.90  have=0.00  gap=0.90  missing
Deep Learning           need=0.80  have=0.00  gap=0.80  missing
Prompt Engineering      need=0.80  have=0.00  gap=0.80  missing
Python                  need=0.80  have=1.00  gap=0.00  confirmed
```

**Where:** `lib/recommendation/engine.ts`, `computeSkillGaps`

---

## 4. Learning what skills mean: PMI

### The problem

The system needs to know that `pandas` and `numpy` are related, and that
`pandas` and `kubernetes` are not. Nobody wrote that down. It has to come from
the data.

### Why counting fails

The obvious approach is to count how often two skills appear in the same course.
This fails immediately because of frequency bias.

"Python" appears in a large fraction of the catalog. By raw co-occurrence count,
Python is the closest relative of almost every skill, which is useless. The
count is high because Python is everywhere, not because of any relationship.

### The model

Pointwise Mutual Information asks whether two things co-occur **more than chance
would predict**, given how common each one is individually:

$$\text{PMI}(x,y) = \log\frac{P(x,y)}{P(x)\,P(y)}$$

The denominator is what the joint probability would be if $x$ and $y$ were
independent. So the ratio is "observed over expected", and the logarithm makes
it symmetric around zero:

- $\text{PMI} > 0$: they co-occur more than chance. A real association.
- $\text{PMI} = 0$: exactly as often as chance. No information.
- $\text{PMI} < 0$: less than chance.

Negative values are noisy in sparse data, so they are clipped, giving **Positive
PMI**:

$$\text{PPMI}(x,y) = \max\bigl(0,\; \text{PMI}(x,y)\bigr)$$

```js
const pmi = Math.log((cooc[i][j] * pairTotal) / (rowSum[i] * rowSum[j]));
ppmi[i][j] = pmi > 0 ? pmi : 0;
```

Python's ubiquity now cancels out: it appears in the numerator and in the
denominator, so its high raw counts stop dominating.

One detail: a skill that co-occurs with nothing would get an all-zero row and a
meaningless vector. The diagonal is anchored so isolated skills still receive a
usable, if lonely, position.

**Where:** `scripts/build-embeddings.mjs`

---

## 5. Compressing meaning: eigendecomposition

### The problem

After PPMI, each of the 115 skills has a row of 115 numbers: its relationship to
every other skill. That matrix is large, mostly zero, and noisy.

Most of those 115 numbers are not independent facts. If a skill relates strongly
to `numpy`, it almost certainly relates to `pandas` too. The real structure has
far fewer degrees of freedom than 115.

### The model

The PPMI matrix $M$ is real and symmetric, because "x co-occurs with y" is the
same statement as "y co-occurs with x". The **spectral theorem** guarantees that
any real symmetric matrix can be orthogonally diagonalised:

$$M = Q \Lambda Q^{T}$$

where $Q$ is orthogonal and $\Lambda$ is diagonal, holding the eigenvalues.

Keep the $K = 32$ eigenvectors with the largest eigenvalues, scale them, and
each skill becomes a point in 32-dimensional space. This is the same idea as
PCA: the top components carry the structure, the rest carry noise.

### Why Jacobi

The implementation uses the **cyclic Jacobi method**, which repeatedly applies
rotations that zero out the largest off-diagonal element until the matrix is
diagonal.

Jacobi is asymptotically slower than Lanczos or a randomised SVD. For a 115x115
matrix it finishes in milliseconds, and it is exact and simple enough to verify
by reading it. For a build step that runs occasionally, correctness and clarity
beat speed. That trade is stated in the source.

### Normalisation

Each vector is finally L2-normalised:

$$\hat{v} = \frac{v}{\lVert v \rVert}$$

Every skill now sits on the unit sphere, which makes cosine similarity a plain
dot product and removes any effect of how common a skill is from the comparison.

### What came out

Nothing in the system was ever told these relationships:

```
transformers        →  huggingface 0.95, fine-tuning 0.94, llm 0.77
pandas              →  numpy 0.93, python 0.77, scikit-learn 0.65
kubernetes          →  docker 0.74, gcp 0.72, ci-cd 0.60
penetration-testing →  digital-forensics 0.89, cybersecurity 0.85
```

They are a consequence of 2,431 courses and two equations.

**Where:** `scripts/build-embeddings.mjs`, output in `data/embeddings.generated.json`

---

## 6. Comparing direction: cosine similarity

### The model

$$\cos(\theta) = \frac{\mathbf{a} \cdot \mathbf{b}}{\lVert \mathbf{a} \rVert \, \lVert \mathbf{b} \rVert}$$

Because every vector is already L2-normalised, the denominator is 1 and this
reduces to the dot product.

```ts
return dot / (Math.sqrt(na) * Math.sqrt(nb));
```

Cosine measures the angle between two vectors and ignores their magnitude. For
relatedness that is exactly right: whether two skills point the same way should
not depend on how often either appears.

### Measured

```
cos(pandas, numpy)      =  0.929
cos(llm, rag)           =  0.943
cos(pandas, kubernetes) = -0.009
```

Two data tools point almost the same way. A data tool and an orchestration tool
are orthogonal, which is the geometric statement of "unrelated".

### The gap direction vector

This is where the embeddings earn their place. The skill gaps from section 3 are
turned into a single direction: a **centroid of skill embeddings, weighted by
remaining deficit**.

$$\mathbf{g} = \frac{\sum_{s} \text{gap}(s) \cdot \hat{v}_s}{\left\lVert \sum_{s} \text{gap}(s) \cdot \hat{v}_s \right\rVert}$$

```ts
export function gapEmbedding(gaps) {
  return combine(gaps.map((g) => [g.skillId, g.gap]));
}
```

A skill you are missing badly pulls the direction hard. A skill you already have
has gap 0 and contributes nothing. The result is a unit vector meaning "this is
the direction you need to travel".

A resource's affinity is then its cosine with that direction, clamped at zero
because an anti-correlated resource is simply irrelevant rather than harmful:

$$\text{gapAffinity}(r) = \max\bigl(0,\; \cos(\hat{v}_r,\, \mathbf{g})\bigr)$$

### Why this is not redundant with section 3

The explicit `skillGap` term is set intersection: does this resource teach
skills that are literally on my missing list?

`gapAffinity` is softer. A resource that never lists `llm` but teaches
`transformers` and `fine-tuning` still points the right way, because those
skills sit near `llm` in the learned space. The embedding catches what exact
matching misses.

The explicit term carries twice the weight (0.24 against 0.12). The soft term
assists; it does not decide.

**Where:** `lib/embeddings/index.ts`

---

## 7. Ordering the path: graph theory

### The model

Prerequisites form a **directed acyclic graph**. An edge $a \rightarrow b$ means
$a$ must be learned before $b$.

The graph is kept acyclic **by construction**: when an edge is added, it is
rejected if it would close a loop. This is stronger than detecting cycles later,
because an invalid state is never reachable.

Ordering uses **Kahn's algorithm**:

1. Compute the in-degree of every node within the requested set.
2. Repeatedly emit any node with in-degree 0.
3. Decrement the in-degree of its successors.

The result is a total order consistent with the partial order the edges define.

```ts
const inDegree = new Map<string, number>();
```

### Handling reality

Real curricula occasionally contain cycles: two resources each list the other's
skill as a prerequisite. A naive topological sort either loops forever or
silently drops nodes.

Here, cycles are detected with an **iterative depth-first search using node
colouring** (iterative rather than recursive, so a deep graph cannot overflow
the stack). When Kahn's algorithm terminates with nodes still holding non-zero
in-degree, the remainder is appended in a stable, deterministic order, and the
caller is told a cycle was broken.

Transitive prerequisites use a visited-set guarded traversal, so a cycle
terminates rather than recursing forever.

### Worked

```
LLM → Prompt Engineering → RAG → Model Evaluation → Vector DB → REST APIs → MLOps
```

RAG comes after LLM because RAG depends on it. Nothing hardcoded this order; it
falls out of the graph.

**Where:** `lib/recommendation/prerequisites.ts`

---

## 8. Ranking: convex combination

### The model

Each resource is scored on nine signals and combined linearly:

$$\text{score}(r) = \sum_{i=1}^{9} w_i f_i(r) \quad \text{subject to} \quad \sum_i w_i = 1,\; w_i \geq 0$$

This is a **convex combination**. Because the weights are non-negative and sum
to exactly 1, and each $f_i \in [0,1]$, the score is guaranteed to lie in
$[0,1]$.

| Signal | Weight | What it measures |
| --- | --- | --- |
| `skillGap` | 0.24 | How much of the role's deficit this closes |
| `careerMatch` | 0.22 | Alignment with the target role |
| `gapAffinity` | 0.12 | Direction in the learned skill space |
| `projectMatch` | 0.10 | Overlap with skills shown in projects |
| `experienceMatch` | 0.10 | Overlap with skills shown in work |
| `quality` | 0.10 | Publisher reliability, rating, recency |
| `academicMatch` | 0.06 | Overlap with the degree |
| `certificateGap` | 0.04 | Certification value |
| `similarity` | 0.02 | Raw content-based similarity |

### Why linear and not learned

A linear model with fixed weights is **fully decomposable**. Any score can be
broken into the contribution of each term, which means every recommendation can
be explained exactly rather than approximately.

A learned ranker would need labelled data that does not exist here, would vary
between runs, and could not answer "why is this first?" with anything better
than a feature attribution estimate.

### Quality is not popularity

The `quality` term deliberately excludes popularity:

| Component | Weight |
| --- | --- |
| Source reliability | 0.32 |
| Project-based | 0.20 |
| Rating | 0.18 |
| Recency | 0.15 |
| Completeness | 0.15 |

The largest component is publisher reliability, assigned independently of
audience size, so a first-party documentation site can score as highly as a
channel with ten million subscribers. This is the main structural defence
against the popularity bias the product exists to avoid.

### Prerequisite gating

Prerequisite readiness is **not** a weighted term. It is a hard gate: a resource
whose prerequisites are unmet is excluded from every unlocked row, regardless of
how well it scores. A high score on something you cannot start is worse than
useless, so it is a constraint, not a penalty.

**Where:** `lib/recommendation/config.ts`, `lib/recommendation/engine.ts`

---

## 9. Diversity: a redundancy penalty

### The problem

Maximising relevance alone produces a degenerate list. If a learner's biggest
gap is Deep Learning, the ten highest-scoring resources will all be Deep
Learning introductions. Each is individually optimal and the set is useless.

### The model

Subtract a penalty proportional to how much of a resource the learner has
already mastered:

$$\text{final}(r) = \text{score}(r) - \lambda \cdot \text{redundancy}(r), \qquad \lambda = 0.35$$

$$\text{redundancy}(r) = \frac{1}{|S_r|}\sum_{s \in S_r} \begin{cases} 1 & c_s \geq 0.75 \\ c_s / 0.75 & \text{otherwise} \end{cases}$$

Mastery above the threshold counts as fully redundant; below it, partially.

```ts
masteredWeight += level >= REDUNDANCY_MASTERY_THRESHOLD
  ? 1
  : level / REDUNDANCY_MASTERY_THRESHOLD;
```

This is the same structure as **Maximal Marginal Relevance** from information
retrieval: relevance minus a similarity-to-what-you-already-have term.

It is why a strong Python programmer is never handed "Python for Beginners",
even though that resource matches their profile almost perfectly.

**Where:** `lib/recommendation/engine.ts`, `redundancyPenalty`

---

## 10. Planning the roadmap: greedy selection

### The model

Given a time budget $B$ (from the chosen timeline and weekly hours), select an
ordered set of resources. At each step pick the resource with the highest
marginal gain per hour, then update the projected skill vector as if it had been
completed:

$$c_s \leftarrow \max\bigl(c_s,\; 0.85\bigr) \quad \text{for each } s \text{ taught}$$

0.85 is the level a completed resource is assumed to confer.

### A bug worth recording

The first version normalised marginal gain against the **remaining** deficit:

$$\text{value} = \frac{\text{marginalGain}}{\text{remainingDeficit}}$$

This is wrong, and subtly so. As the plan fills up, the remaining deficit shrinks
as fast as the numerator does, so every late addition looks proportionally
valuable. The symptom was a twelve month roadmap padded with duplicate guides.

The fix was to fix the denominator:

$$\text{value} = \frac{\text{marginalGain}}{\text{initialDeficit}}$$

```ts
// would make every late addition look valuable, because the denominator
// shrinks as fast as the numerator.
const initialDeficit = totalDeficit(input.vector, career);
```

The lesson generalises: when normalising a greedy objective, the denominator
must be fixed at the start, or the ratio measures progress against a moving
target.

### Scheduling under constraints

Projects are placed only once their prerequisites have been taught by an earlier
milestone. The planner tracks an `acquired` vector as it schedules and refuses
to place a project before the skills it needs appear in it. An earlier version
scheduled an Image Classifier project in week 3 while Deep Learning was taught in
month 4.

**Where:** `lib/roadmap/planner.ts`

---

## 11. Readiness: a stated heuristic

Career readiness is a weighted average of four components:

$$\text{readiness} = 0.5\,S + 0.2\,P + 0.15\,E + 0.15\,Q$$

where

$$S = \frac{1}{|R|}\sum_{s \in R} \min\left(1, \frac{c_s}{w_s}\right), \qquad
P = \min\left(1, \frac{n_{\text{projects}}}{3}\right)$$

$$E = \min\left(1, \frac{\text{months}}{12}\right), \qquad
Q = \frac{1}{|F|}\sum_{f \in F} \min\left(1, \frac{c_f}{0.6}\right)$$

$R$ is the set of required skills, $F$ the role's foundations. Three projects
and twelve months of experience are treated as saturating their components.

This is a **heuristic, not a measurement**, and the product says so: the figure
carries the tooltip "a measure of your progress toward this role, not a hiring
prediction". The clamps and weights are judgement calls, and naming them as such
is more honest than presenting the output as an objective score.

**Where:** `lib/recommendation/engine.ts`, `computeCareerReadiness`

---

## 12. A full worked example

Real output. Profile: a final-year Data Science student, two internships, three
projects, three certificates. Target: AI Engineer.

**Step 1, evidence combined (noisy-OR):**

```
Python              0.998   self + project + internship + certificate
Machine Learning    0.989   self + project + internship
Feature Engineering 0.986   project + internship
```

**Step 2, gaps (subtraction):**

```
Large Language Models   need 0.90   have 0.00   gap 0.90   missing
Deep Learning           need 0.80   have 0.00   gap 0.80   missing
Prompt Engineering      need 0.80   have 0.00   gap 0.80   missing
```

**Step 3, gap direction:** those deficits become weights on skill embeddings,
summed and normalised into a single unit vector.

**Step 4, prerequisite order (Kahn):**

```
LLM → Prompt Engineering → RAG → Model Evaluation → Vector DB → REST APIs → MLOps
```

**Step 5, scoring.** Top result: **OpenAI Cookbook**, total **0.4256**

| Signal | Value | Weight | Contribution |
| --- | ---: | ---: | ---: |
| careerMatch | 0.601 | 0.22 | 0.1323 |
| gapAffinity | 0.904 | 0.12 | 0.1084 |
| skillGap | 0.383 | 0.24 | 0.0919 |
| quality | 0.876 | 0.10 | 0.0876 |
| certificateGap | 1.000 | 0.04 | 0.0400 |
| projectMatch | 0.250 | 0.10 | 0.0250 |
| experienceMatch | 0.250 | 0.10 | 0.0250 |
| similarity | 0.149 | 0.02 | 0.0030 |
| academicMatch | 0.000 | 0.06 | 0.0000 |
| **redundancy** | 0.250 | −0.35 | **−0.0875** |
| | | | **0.4256** |

Skills gained: `llm`, `prompt-engineering`, `rag`. All three were on the missing
list from step 2. `gapAffinity` of 0.904 says the resource points almost exactly
along the gap direction from step 3. The redundancy penalty fires because the
resource also covers `model-evaluation`, which this learner already has.

Every one of those numbers can be followed back to the PDF.

---

## 13. What was measured and rejected

A section on what did **not** work, because a method that was never tested
against an alternative has not been justified.

### The embedding-only rail

A recommendation row was built driven purely by `gapAffinity`, the idea being
that the learned space alone could surface resources that exact matching missed.

It was measured. The top card scored **0 out of 100** with **100% redundancy**.
Excluding redundant entries, the best affinity was **0.34**, for "Jenkins for
Beginners" offered to an AI Engineer.

The feature was removed. The embeddings remain as a 0.12-weighted signal
alongside explicit matching, which is where they demonstrably help. A soft
semantic signal is a good assistant and a bad decision-maker.

### Averaging evidence

Rejected before implementation, for the reason in section 2: it is not monotonic
in the number of observations, which contradicts what evidence means.

### Cosine similarity for gaps

Rejected in favour of subtraction. It produces a number that is neither
actionable nor explainable, and no more accurate.

### Popularity as a quality signal

Excluded by design. Popularity measures what is good for the average person,
and the entire premise of the product is that the average person is not you.

---

## 14. Why this maths and not a model

Every method above is closed-form, deterministic and decomposable. That was the
constraint the architecture was built around, and it has three consequences.

**Reproducibility.** The same profile and goal produce the same roadmap, today
and in a year. A large language model asked to rank would produce a different
ordering on each call, and no amount of temperature tuning makes that a
guarantee.

**Explainability, exactly rather than approximately.** Any score decomposes into
its nine contributions. Any contribution decomposes into its inputs. The chain
"0.4256 → gapAffinity 0.904 → embeddings → PPMI → co-occurrence counts → 2,431
courses" is complete, with no step where the answer is "the model decided".

**Auditability of failure.** The roadmap padding bug in section 10 was findable
because the objective function is written down. In a learned ranker the same
symptom is a data problem, a loss problem or an architecture problem, and
telling them apart is research.

### Where AI is used

An LLM (Gemini) is used for exactly two things: enriching profile extraction
from unstructured prose, and phrasing explanations for decisions that have
already been made.

**It never sees the ranking stage.** It cannot change what is recommended or in
what order. With no API key configured, the product is fully functional and the
explanations fall back to deterministic prose.

This is the load-bearing claim of the architecture: *deterministic code decides,
AI only phrases.*

---

## Summary

| Field | Concept | Where |
| --- | --- | --- |
| Probability | Noisy-OR, complement rule, independence | Evidence combination |
| Information theory | PMI, PPMI | Learning skill relatedness |
| Linear algebra | Spectral theorem, Jacobi eigendecomposition, L2 norm | Embedding construction |
| Vector spaces | Cosine similarity, weighted centroid | Gap direction, affinity |
| Graph theory | DAG, Kahn's topological sort, DFS cycle detection, transitive closure | Prerequisite ordering |
| Optimisation | Convex combination, greedy selection, MMR-style diversity | Ranking and roadmap |

No neural networks. No training. No gradients. 207 tests assert the behaviour
described here.

---

*SkillIn, by Amish Sharma. Source: [github.com/amishardev/SKILLIN](https://github.com/amishardev/SKILLIN)*
