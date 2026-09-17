import 'server-only';

/**
 * Reusable prompt templates.
 *
 * Every template carries the same non-negotiable instruction: extract only what
 * the source supports, and separate explicit statements from inference. The
 * model enriches the deterministic parse, it never replaces it, and it is
 * never allowed to decide rankings.
 */

const NO_INVENTION = `RULES
- Extract ONLY information supported by the supplied text.
- Never invent technologies, employers, degrees, dates or certifications.
- If a field is not present, omit it or use an empty value. Do not guess.
- Mark each skill as explicit (stated outright) or inferred (implied by context).
- Normalize obvious aliases: "ML" -> "Machine Learning", "React.js" -> "React".
- Return valid JSON only, matching the schema exactly. No prose, no markdown.`;

export function profileExtractionPrompt(documentText: string): string {
  return `You are a structured student-profile extraction engine.

${NO_INVENTION}

SCHEMA
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "headline": "string",
  "summary": "string",
  "education": [
    { "institution": "string", "degree": "string", "branch": "string",
      "startYear": 0, "endYear": 0 }
  ],
  "projects": [
    { "title": "string", "description": "string", "technologies": ["string"] }
  ],
  "experience": [
    { "organization": "string", "role": "string", "description": "string",
      "technologies": ["string"], "startDate": "string", "endDate": "string",
      "kind": "internship" | "work" }
  ],
  "certificates": [ { "title": "string", "issuer": "string", "year": 0 } ],
  "achievements": [ { "title": "string", "year": 0 } ],
  "skills": [
    { "name": "string", "confidence": 0.0, "evidence": "string", "explicit": true,
      "source": "project" | "internship" | "work" | "certificate" | "academic" | "self" }
  ]
}

PROFILE DOCUMENT
"""
${documentText.slice(0, 24000)}
"""`;
}

export function projectSkillsPrompt(title: string, description: string): string {
  return `You are a technical skill extraction engine.

${NO_INVENTION}

Given a project, extract only the technically defensible skills it demonstrates.
A skill is defensible if building the project genuinely required it.

SCHEMA
{
  "skills": [
    { "name": "string", "confidence": 0.0, "evidence": "string", "explicit": true }
  ]
}

PROJECT
Title: ${title}
Description: ${description.slice(0, 3000)}`;
}

export function resourceEnrichmentPrompt(
  title: string,
  description: string,
  url: string): string {
  return `You are a learning-resource classification engine.

${NO_INVENTION}
- Base your answer only on the supplied title, description and URL.

SCHEMA
{
  "skills": ["string"],
  "prerequisites": ["string"],
  "careerTags": ["string"],
  "level": "beginner" | "intermediate" | "advanced",
  "projectBased": true
}

RESOURCE
Title: ${title}
URL: ${url}
Description: ${description.slice(0, 2000)}`;
}

/**
 * Narrative explanation for a recommendation.
 *
 * Note the facts are supplied by the deterministic engine, the model only
 * phrases them. It cannot change what is recommended or in what order.
 */
export function explanationPrompt(input: {
  resourceTitle: string;
  careerTitle: string;
  youKnow: string[];
  youAreMissing: string[];
  unlocks: string[];
  evidence: string[];
}): string {
  return `You are a learning advisor explaining one recommendation.

The analysis below is already decided. Your only job is to phrase it clearly.
Do not add skills, courses or claims that are not listed here.

FACTS
- Learner's demonstrated skills: ${input.youKnow.join(', ') || 'none recorded'}
- Evidence for those skills: ${input.evidence.join('; ') || 'none recorded'}
- Target role: ${input.careerTitle}
- Gaps this resource closes: ${input.youAreMissing.join(', ') || 'none'}
- What it unlocks next: ${input.unlocks.join(', ') || 'further study'}
- Recommended resource: ${input.resourceTitle}

Write 2-3 sentences, addressed to the learner as "you". Be specific and concrete.
Reference their actual skills and evidence. No marketing language, no emoji,
no bullet points. Plain prose only.`;
}

/** Short, human summary of a generated roadmap. */
export function roadmapNarrativePrompt(input: {
  careerTitle: string;
  months: number;
  weeklyHours: number;
  stages: string[];
  startingSkills: string[];
}): string {
  return `You are a learning advisor summarising a study plan that has already been generated.

Do not change the plan. Do not add stages. Only describe what is listed.

PLAN
- Target role: ${input.careerTitle}
- Duration: ${input.months} months at ${input.weeklyHours} hours per week
- Learner already demonstrates: ${input.startingSkills.join(', ') || 'no recorded skills yet'}
- Stages in order: ${input.stages.join(' -> ')}

Write 2-3 sentences explaining why this sequence makes sense for this learner,
addressed as "you". Plain prose, no bullets, no emoji.`;
}
