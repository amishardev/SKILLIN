import { describe, it, expect } from 'vitest';
import {
  parseLinkedInText,
  splitSections,
  extractSkillMentions,
  looksLikeLinkedInExport,
} from '@/lib/pdf/linkedin';
import { LINKEDIN_EXPORT_TEXT } from './fixtures/linkedin-export';

describe('LinkedIn export detection', () => {
  it('recognises a real export', () => {
    expect(looksLikeLinkedInExport(LINKEDIN_EXPORT_TEXT)).toBe(true);
  });

  it('does not claim an arbitrary resume is a LinkedIn export', () => {
    expect(looksLikeLinkedInExport('John Doe\nSoftware Engineer\nSkills: Python')).toBe(false);
  });
});

describe('splitSections', () => {
  const sections = splitSections(LINKEDIN_EXPORT_TEXT);

  it('finds the sidebar and main-column sections', () => {
    expect(Object.keys(sections)).toEqual(
      expect.arrayContaining(['contact', 'top skills', 'experience', 'education', 'projects']),
    );
  });

  it('strips repeated page furniture', () => {
    const all = Object.values(sections).flat().join('\n');
    expect(all).not.toMatch(/page \d+ of \d+/i);
  });
});

describe('extractSkillMentions', () => {
  it('matches multi-word skills', () => {
    expect(extractSkillMentions('worked on natural language processing tasks')).toContain('nlp');
  });

  it('normalizes aliases to canonical ids', () => {
    const found = extractSkillMentions('Used sklearn and ML on the project');
    expect(found).toContain('scikit-learn');
    expect(found).toContain('machine-learning');
  });

  it('invents nothing for unrelated prose', () => {
    expect(extractSkillMentions('Organised the annual cultural festival')).toEqual([]);
  });
});

describe('parseLinkedInText', () => {
  const { profile, isLinkedIn } = parseLinkedInText(LINKEDIN_EXPORT_TEXT, 'linkedin-pdf');

  it('flags the document as a LinkedIn export', () => {
    expect(isLinkedIn).toBe(true);
  });

  it('reads identity from the document', () => {
    expect(profile.name).toBe('Aryan Mehta');
    expect(profile.email).toBe('aryan.mehta@example.com');
  });

  it('reads education including degree and branch', () => {
    expect(profile.education.length).toBeGreaterThanOrEqual(1);
    const iit = profile.education[0];
    expect(iit.institution).toBe('Indian Institute of Technology Bombay');
    expect(iit.branch).toMatch(/Data Science/i);
    expect(iit.startYear).toBe(2021);
    expect(iit.endYear).toBe(2025);
  });

  it('reads both experience entries and classifies internships', () => {
    expect(profile.experience.length).toBe(2);
    expect(profile.experience.every((e) => e.kind === 'internship')).toBe(true);
    expect(profile.experience[0].organization).toBe('Acme Analytics');
    expect(profile.experience[0].role).toBe('Data Analyst Intern');
  });

  it('pulls canonical skills out of experience descriptions', () => {
    const tech = profile.experience.flatMap((e) => e.technologies);
    expect(tech).toContain('sql');
    expect(tech).toContain('pandas');
  });

  it('reads projects with their technologies', () => {
    expect(profile.projects.length).toBeGreaterThanOrEqual(3);
    const titles = profile.projects.map((p) => p.title);
    expect(titles).toContain('Twitter Sentiment Analysis');

    const allTech = profile.projects.flatMap((p) => p.technologies);
    expect(allTech).toContain('scikit-learn');
  });

  it('reads declared skills from the Top Skills sidebar', () => {
    const ids = profile.declaredSkills.map((s) => s.skillId);
    expect(ids).toContain('python');
    expect(ids).toContain('machine-learning');
    expect(ids).toContain('nlp');
  });

  it('reads certifications and honors', () => {
    expect(profile.certificates.length).toBeGreaterThanOrEqual(2);
    expect(profile.achievements.length).toBeGreaterThanOrEqual(2);
  });

  it('marks the profile as not AI-assisted when parsed deterministically', () => {
    expect(profile.aiAssisted).toBe(false);
    expect(profile.source).toBe('linkedin-pdf');
  });

  it('reads the identity block that sits above Summary', () => {
    expect(profile.location).toBe('Mumbai, Maharashtra, India');
    expect(profile.headline).toMatch(/Data Science undergraduate/);
    expect(profile.summary).toBeTruthy();
  });

  it('leaves absent fields empty rather than inventing them', () => {
    // The fixture contains no publications, patents or explicit GPA.
    const withoutPhone = LINKEDIN_EXPORT_TEXT.replace('+91 98765 43210', '');
    const { profile: p } = parseLinkedInText(withoutPhone, 'linkedin-pdf');
    expect(p.phone).toBeUndefined();
    expect(p.education.every((e) => e.grade === undefined)).toBe(true);
  });

  it('falls back to the profile slug when no name line is present', () => {
    const noIdentity = LINKEDIN_EXPORT_TEXT.replace('\nAryan Mehta\n', '\n');
    const { profile: p } = parseLinkedInText(noIdentity, 'linkedin-pdf');
    // The slug is the only evidence left, so we use all of it rather than
    // guessing which trailing word is a disambiguator and which is a surname.
    // The user corrects this on the review screen.
    expect(p.name).toMatch(/^Aryan Mehta/);
  });
});
