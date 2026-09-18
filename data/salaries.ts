import raw from './salaries.generated.json';

/**
 * Role salary averages, where a defensible one was actually verified.
 *
 * Two things about this data are worth stating plainly, because both affect
 * what the product is allowed to claim.
 *
 * First, 35 of the 74 rows carry `no_verified_average` and say so themselves:
 * "keep salary hidden". Those roles show nothing. A blank is honest; a guess
 * dressed as a figure is not.
 *
 * Second, the generated file also carries `average_salary_lpa`, which is the
 * source figure plus a flat one lakh adjustment made as a product decision.
 * This module reads `source_average_salary_lpa` instead, because the figure is
 * displayed next to the name of the site it came from, and attributing a number
 * to Indeed or Salary.com that neither of them published would misrepresent
 * them. If the adjusted figure is wanted, it is one field change here, but the
 * citation would then have to go.
 */

export interface RoleSalary {
  careerId: string;
  /** Annual average in lakh rupees, as published by the source. */
  averageLpa: number;
  /**
   * The figure the product shows: the source average plus a flat SkillIn
   * adjustment. It is not what any source reports, so it is never attributed to
   * one and never called an average.
   */
  displayLpa: number;
  /** Size of that adjustment, so the UI can say what it added. */
  adjustmentLpa: number;
  source: string;
  sourceUrl: string;
  /** ISO date the source was last checked. */
  lastUpdated: string;
}

interface SalaryRow {
  job_id: string;
  average_salary_lpa: number | null;
  source_average_salary_lpa: number | null;
  display_salary_lpa: number | null;
  salary_adjustment_lpa: number | null;
  salary_source: string | null;
  salary_source_url: string | null;
  salary_last_updated: string | null;
  data_status: string;
}

/**
 * The salary file names a few roles differently from the career taxonomy.
 * Mapped explicitly rather than matched loosely, so a future rename fails
 * visibly in the taxonomy test instead of silently hiding a salary.
 */
const ID_ALIASES: Record<string, string> = {
  'machine-learning-engineer': 'ml-engineer',
  'full-stack-developer': 'fullstack-developer',
  'mobile-app-developer': 'mobile-developer',
  'site-reliability-engineer': 'sre',
  'security-operations-analyst': 'security-analyst',
  'embedded-systems-engineer': 'embedded-engineer',
  'quantum-computing-engineer': 'quantum-engineer',
  'technical-product-manager': 'product-manager',
};

const SALARIES = new Map<string, RoleSalary>();

for (const row of raw as SalaryRow[]) {
  const average = row.source_average_salary_lpa;
  // Everything must be present. A figure with no source is not usable here.
  if (average === null || !row.salary_source || !row.salary_source_url) continue;

  const careerId = ID_ALIASES[row.job_id] ?? row.job_id;
  const adjustment = row.salary_adjustment_lpa ?? 0;
  SALARIES.set(careerId, {
    careerId,
    averageLpa: Math.round(average * 100) / 100,
    displayLpa: row.display_salary_lpa ?? Math.round((average + adjustment) * 10) / 10,
    adjustmentLpa: adjustment,
    source: row.salary_source,
    sourceUrl: row.salary_source_url,
    lastUpdated: row.salary_last_updated ?? 'unknown',
  });
}

/** The verified average for a role, or undefined when none was established. */
export function roleSalary(careerId: string): RoleSalary | undefined {
  return SALARIES.get(careerId);
}

/** How many roles have a figure, for the taxonomy test and for reporting. */
export const salaryCoverage = SALARIES.size;
