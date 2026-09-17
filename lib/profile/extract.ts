import 'server-only';

import { z } from 'zod';
import { extractPdfText, sanitizePdfText, PdfExtractionError } from '@/lib/pdf/extract';
import { parseLinkedInText, extractSkillMentions } from '@/lib/pdf/linkedin';
import { generateJson, geminiAvailable } from '@/lib/ai/gemini';
import { profileExtractionPrompt } from '@/lib/ai/prompts';
import { normalizeSkill } from '@/data/skills';
import type { ExtractedSkill, StudentProfile } from '@/types';

/**
 * Profile extraction pipeline.
 *
 * PDF -> text -> deterministic parse -> (optional) Gemini enrichment -> merge.
 *
 * The deterministic parse is authoritative for anything it finds. Gemini may
 * only *fill gaps* and add skill evidence; it can never overwrite a field the
 * document plainly stated, which keeps hallucination out of the profile.
 */

// ── Schema for the model's response ────────────────────────────────────────

const aiEducation = z.object({
  institution: z.string().default(''),
  degree: z.string().default(''),
  branch: z.string().default(''),
  startYear: z.number().int().min(1900).max(2100).optional(),
  endYear: z.number().int().min(1900).max(2100).optional(),
});

const aiProject = z.object({
  title: z.string().default(''),
  description: z.string().default(''),
  technologies: z.array(z.string()).default([]),
});

const aiExperience = z.object({
  organization: z.string().default(''),
  role: z.string().default(''),
  description: z.string().default(''),
  technologies: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  kind: z.enum(['internship', 'work']).default('work'),
});

const aiSkill = z.object({
  name: z.string(),
  confidence: z.number().min(0).max(1).default(0.5),
  evidence: z.string().default(''),
  explicit: z.boolean().default(false),
  source: z
    .enum(['project', 'internship', 'work', 'certificate', 'academic', 'self'])
    .default('self'),
});

const aiProfileSchema = z.object({
  name: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  location: z.string().default(''),
  headline: z.string().default(''),
  summary: z.string().default(''),
  education: z.array(aiEducation).default([]),
  projects: z.array(aiProject).default([]),
  experience: z.array(aiExperience).default([]),
  certificates: z
    .array(z.object({ title: z.string(), issuer: z.string().default(''), year: z.number().optional() }))
    .default([]),
  achievements: z.array(z.object({ title: z.string(), year: z.number().optional() })).default([]),
  skills: z.array(aiSkill).default([]),
});

type AiProfile = z.infer<typeof aiProfileSchema>;

// ── Pipeline ───────────────────────────────────────────────────────────────

export interface ExtractionResult {
  profile: StudentProfile;
  meta: {
    totalPages: number;
    isLinkedIn: boolean;
    sectionsFound: string[];
    aiAssisted: boolean;
    /** Set when AI was configured but the call did not succeed. */
    aiFallback: boolean;
    characters: number;
  };
}

export async function extractProfileFromPdf(
  buffer: ArrayBuffer,
  source: 'linkedin-pdf' | 'resume-pdf',
): Promise<ExtractionResult> {
  const { text, totalPages } = await extractPdfText(buffer);
  const clean = sanitizePdfText(text);
  return extractProfileFromText(clean, source, totalPages);
}

export async function extractProfileFromText(
  clean: string,
  source: StudentProfile['source'],
  totalPages = 1,
): Promise<ExtractionResult> {
  const { profile: parsed, sectionsFound, isLinkedIn } = parseLinkedInText(clean, source);

  let aiAssisted = false;
  let aiFallback = false;
  let profile = parsed;

  if (geminiAvailable()) {
    const ai = await generateJson(profileExtractionPrompt(clean), (value) =>
      aiProfileSchema.parse(value),
    );
    if (ai) {
      profile = mergeProfiles(parsed, ai);
      aiAssisted = true;
    } else {
      aiFallback = true;
    }
  }

  // Attach per-item skill evidence regardless of which path produced the items.
  profile = attachItemSkills(profile);

  return {
    profile: { ...profile, aiAssisted },
    meta: {
      totalPages,
      isLinkedIn,
      sectionsFound,
      aiAssisted,
      aiFallback,
      characters: clean.length,
    },
  };
}

/**
 * Merge AI output into the deterministic parse.
 *
 * Rule: the deterministic value wins whenever it is non-empty. The model is
 * only consulted for fields the parser could not read, and for extra list
 * entries it did not find. This bounds the damage a hallucination can do.
 */
export function mergeProfiles(base: StudentProfile, ai: AiProfile): StudentProfile {
  const pick = (deterministic: string | undefined, fromAi: string): string | undefined =>
    deterministic && deterministic.trim() ? deterministic : fromAi.trim() || undefined;

  const education = base.education.length
    ? base.education
    : ai.education
        .filter((e) => e.institution.trim())
        .map((e) => ({
          institution: e.institution.trim(),
          degree: e.degree.trim(),
          branch: e.branch.trim(),
          startYear: e.startYear,
          endYear: e.endYear,
        }));

  const projects = base.projects.length
    ? base.projects
    : ai.projects
        .filter((p) => p.title.trim())
        .map((p, i) => ({
          id: `proj-${i}`,
          title: p.title.trim(),
          description: p.description.trim(),
          technologies: normalizeMany(p.technologies),
          skills: [],
        }));

  const experience = base.experience.length
    ? base.experience
    : ai.experience
        .filter((e) => e.organization.trim() || e.role.trim())
        .map((e, i) => ({
          id: `exp-${i}`,
          organization: e.organization.trim(),
          role: e.role.trim(),
          description: e.description.trim(),
          technologies: normalizeMany(e.technologies),
          skills: [],
          startDate: e.startDate,
          endDate: e.endDate,
          kind: /intern/i.test(e.role) ? ('internship' as const) : e.kind,
        }));

  const certificates = base.certificates.length
    ? base.certificates
    : ai.certificates
        .filter((c) => c.title.trim())
        .map((c, i) => ({
          id: `cert-${i}`,
          title: c.title.trim(),
          issuer: c.issuer.trim(),
          year: c.year,
          skills: extractSkillMentions(c.title),
        }));

  const achievements = base.achievements.length
    ? base.achievements
    : ai.achievements
        .filter((a) => a.title.trim())
        .map((a, i) => ({ id: `ach-${i}`, title: a.title.trim(), year: a.year }));

  // Skills are additive: AI-found evidence joins what the sidebar declared,
  // and the vector builder combines them rather than letting either overwrite.
  const aiSkills: ExtractedSkill[] = ai.skills
    .map((s) => ({
      skillId: normalizeSkill(s.name),
      rawName: s.name,
      confidence: s.confidence,
      source: s.source,
      evidence: s.evidence || 'Identified in your profile',
      explicit: s.explicit,
    }))
    .filter((s) => s.skillId !== null);

  const latest = education[0];

  return {
    ...base,
    name: pick(base.name, ai.name) ?? '',
    email: pick(base.email, ai.email),
    phone: pick(base.phone, ai.phone),
    location: pick(base.location, ai.location),
    headline: pick(base.headline, ai.headline),
    summary: pick(base.summary, ai.summary),
    education,
    college: pick(base.college, latest?.institution ?? ''),
    degree: pick(base.degree, latest?.degree ?? ''),
    branch: pick(base.branch, latest?.branch ?? ''),
    graduationYear: base.graduationYear ?? latest?.endYear,
    projects,
    experience,
    certificates,
    achievements,
    declaredSkills: [...base.declaredSkills, ...aiSkills],
  };
}

/** Canonicalize a raw technology list, dropping anything unrecognised. */
function normalizeMany(raw: string[]): string[] {
  const out = new Set<string>();
  for (const item of raw) {
    const id = normalizeSkill(item);
    if (id) out.add(id);
  }
  return [...out];
}

/**
 * Give every project and experience its own skill evidence, so the review
 * screen can show "Found in your project" against a specific item.
 */
function attachItemSkills(profile: StudentProfile): StudentProfile {
  return {
    ...profile,
    projects: profile.projects.map((p) => ({
      ...p,
      skills: p.technologies.map((skillId) => ({
        skillId,
        rawName: skillId,
        confidence: 0.85,
        source: 'project' as const,
        evidence: `Found in your project "${p.title}"`,
        explicit: true,
      })),
    })),
    experience: profile.experience.map((e) => ({
      ...e,
      skills: e.technologies.map((skillId) => ({
        skillId,
        rawName: skillId,
        confidence: 0.9,
        source: e.kind,
        evidence: `Found in your ${e.kind === 'internship' ? 'internship' : 'role'} at ${e.organization}`,
        explicit: true,
      })),
    })),
  };
}

export { PdfExtractionError };
