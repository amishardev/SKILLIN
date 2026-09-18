/**
 * Career goal profiles.
 *
 * Each role declares the canonical skills it needs and how much it needs them.
 * All career skill rules live here, never scattered through UI code, so a
 * role's definition can change without touching a component.
 */

import { skillName } from './skills';

export interface CareerSkillRequirement {
  skillId: string;
  /** How central this skill is to the role, 0-1. */
  weight: number;
  /** Required skills gate readiness; preferred ones only add upside. */
  required: boolean;
}

/**
 * How a field is actually learned.
 *
 * Roadmaps are sequenced differently per model, because the domains genuinely
 * differ. A designer builds a portfolio; an engineer builds systems; a
 * researcher builds a method. Forcing one shape on all three produces a plan
 * that is wrong for at least two of them.
 */
export type LearningModel = 'technical' | 'management' | 'creative' | 'research';

export interface CareerGoal {
  id: string;
  title: string;
  category: CareerCategoryId;
  description: string;
  skills: CareerSkillRequirement[];
  /** Skills expected before the role's core curriculum makes sense. */
  foundations: string[];
  demand: 'high' | 'very-high' | 'extreme';
  typicalRamp: string;
  /** Drives roadmap sequencing. Defaults to technical when absent. */
  learningModel?: LearningModel;
  /**
   * Set where the role is gated by a licence, a registration or a degree that
   * no amount of online study substitutes for. The UI states this plainly
   * rather than implying a roadmap is a route into a regulated profession.
   */
  credential?: string;
}

export type CareerCategoryId =
  | 'software-dev' | 'ai-ml-data' | 'cybersecurity' | 'infrastructure'
  | 'hardware-emerging' | 'product-business' | 'design-tech'
  | 'new-specialized' | 'research'
  // Business
  | 'management' | 'marketing' | 'finance' | 'people-ops' | 'operations'
  | 'entrepreneurship'
  // Creative
  | 'design' | 'film-media' | 'music' | 'writing' | 'photography'
  // Humanities and social sciences
  | 'psychology' | 'social-sciences' | 'humanities' | 'communication';

/**
 * Top level grouping.
 *
 * The categories below carry a `group`, so a new field (healthcare, law,
 * education) is added by appending a category and its roles. No UI component
 * knows any category by name.
 */
export type CareerGroupId = 'technology' | 'business' | 'creative' | 'humanities';

export const CAREER_GROUPS: { id: CareerGroupId; label: string }[] = [
  { id: 'technology', label: 'Technology' },
  { id: 'business', label: 'Business & Management' },
  { id: 'creative', label: 'Creative & Media' },
  { id: 'humanities', label: 'Humanities & Social Sciences' },
];

export const CAREER_CATEGORIES: { id: CareerCategoryId; label: string; group: CareerGroupId }[] = [
  { id: 'software-dev', label: 'Software & Development', group: 'technology' },
  { id: 'ai-ml-data', label: 'AI, ML & Data', group: 'technology' },
  { id: 'cybersecurity', label: 'Cybersecurity', group: 'technology' },
  { id: 'infrastructure', label: 'Infrastructure & Systems', group: 'technology' },
  { id: 'hardware-emerging', label: 'Hardware & Emerging Tech', group: 'technology' },
  { id: 'product-business', label: 'Product & Business-Tech', group: 'technology' },
  { id: 'design-tech', label: 'Design + Tech', group: 'technology' },
  { id: 'new-specialized', label: 'New / Specialized Tech', group: 'technology' },
  { id: 'research', label: 'Research', group: 'technology' },
  { id: 'management', label: 'Management & Strategy', group: 'business' },
  { id: 'marketing', label: 'Marketing & Growth', group: 'business' },
  { id: 'finance', label: 'Finance', group: 'business' },
  { id: 'people-ops', label: 'People & HR', group: 'business' },
  { id: 'operations', label: 'Operations & Supply Chain', group: 'business' },
  { id: 'entrepreneurship', label: 'Entrepreneurship', group: 'business' },
  { id: 'design', label: 'Design & Visual Arts', group: 'creative' },
  { id: 'film-media', label: 'Film & Media', group: 'creative' },
  { id: 'music', label: 'Music & Audio', group: 'creative' },
  { id: 'writing', label: 'Writing & Publishing', group: 'creative' },
  { id: 'photography', label: 'Photography', group: 'creative' },
  { id: 'psychology', label: 'Psychology', group: 'humanities' },
  { id: 'social-sciences', label: 'Social Sciences', group: 'humanities' },
  { id: 'humanities', label: 'Humanities', group: 'humanities' },
  { id: 'communication', label: 'Communication & Media Studies', group: 'humanities' },
];

/** Terse helper so role definitions stay readable. */
const req = (skillId: string, weight: number): CareerSkillRequirement => ({ skillId, weight, required: true });
const pref = (skillId: string, weight: number): CareerSkillRequirement => ({ skillId, weight, required: false });

export const CAREER_GOALS: CareerGoal[] = [
  // ══════════════ MANAGEMENT & STRATEGY ══════════════
  {
    id: 'business-analyst',
    title: 'Business Analyst',
    category: 'management',
    description: 'Turn how a business actually works into requirements, models and recommendations a team can act on.',
    demand: 'very-high',
    typicalRamp: '6-12 months',
    learningModel: 'management',
    foundations: ['business-fundamentals', 'spreadsheets'],
    skills: [
      req('business-analysis', 1.0), req('data-analysis', 0.85), req('sql', 0.80),
      req('spreadsheets', 0.85), req('business-fundamentals', 0.80),
      req('stakeholder-management', 0.75), req('communication', 0.80),
      req('data-visualization', 0.70), pref('critical-thinking', 0.70),
      pref('business-intelligence', 0.65), pref('operations-management', 0.50),
    ],
  },
  {
    id: 'management-consultant',
    title: 'Management Consultant',
    category: 'management',
    description: 'Diagnose a business problem, structure it, and argue a recommendation that survives a board room.',
    demand: 'high',
    typicalRamp: '12-24 months',
    learningModel: 'management',
    foundations: ['business-fundamentals', 'critical-thinking'],
    skills: [
      req('business-strategy', 1.0), req('critical-thinking', 0.90),
      req('financial-accounting', 0.80), req('market-research', 0.80),
      req('communication', 0.90), req('spreadsheets', 0.80),
      req('stakeholder-management', 0.80), req('business-fundamentals', 0.85),
      pref('economics', 0.65), pref('data-analysis', 0.65), pref('negotiation', 0.60),
    ],
  },
  {
    id: 'project-manager',
    title: 'Project Manager',
    category: 'management',
    description: 'Hold scope, time and people together so work that spans teams actually lands.',
    demand: 'high',
    typicalRamp: '6-12 months',
    learningModel: 'management',
    foundations: ['communication'],
    skills: [
      req('project-management', 1.0), req('stakeholder-management', 0.90),
      req('communication', 0.90), req('risk-management', 0.80),
      req('operations-management', 0.70), req('leadership', 0.75),
      req('time-management', 0.70), pref('agile', 0.70), pref('critical-thinking', 0.60),
    ],
  },
  {
    id: 'strategy-analyst',
    title: 'Strategy Analyst',
    category: 'management',
    description: 'Work out where a market is going and what the company should do about it, with evidence rather than instinct.',
    demand: 'high',
    typicalRamp: '9-18 months',
    learningModel: 'management',
    foundations: ['business-fundamentals', 'critical-thinking'],
    skills: [
      req('business-strategy', 0.95), req('market-research', 0.90), req('economics', 0.75),
      req('data-analysis', 0.80), req('financial-modelling', 0.70),
      req('critical-thinking', 0.85), req('communication', 0.80), req('spreadsheets', 0.75),
      pref('business-intelligence', 0.60),
    ],
  },

  // ══════════════ MARKETING & GROWTH ══════════════
  {
    id: 'marketing-manager',
    title: 'Marketing Manager',
    category: 'marketing',
    description: 'Own how a product reaches people: positioning, channels, budget and whether any of it worked.',
    demand: 'very-high',
    typicalRamp: '9-18 months',
    learningModel: 'management',
    foundations: ['marketing-fundamentals', 'communication'],
    skills: [
      req('marketing-fundamentals', 1.0), req('brand-strategy', 0.85),
      req('consumer-behaviour', 0.80), req('market-research', 0.85),
      req('digital-marketing', 0.85), req('marketing-analytics', 0.80),
      req('content-strategy', 0.75), req('communication', 0.85),
      req('leadership', 0.70), pref('seo', 0.65), pref('performance-marketing', 0.70),
      pref('business-strategy', 0.60),
    ],
  },
  {
    id: 'brand-manager',
    title: 'Brand Manager',
    category: 'marketing',
    description: 'Decide what a brand means, keep it consistent, and defend it when every team wants to bend it.',
    demand: 'high',
    typicalRamp: '9-18 months',
    learningModel: 'management',
    foundations: ['marketing-fundamentals'],
    skills: [
      req('brand-strategy', 1.0), req('marketing-fundamentals', 0.90),
      req('consumer-behaviour', 0.85), req('market-research', 0.80),
      req('content-strategy', 0.75), req('communication', 0.85),
      pref('brand-identity', 0.65), pref('marketing-analytics', 0.60),
    ],
  },
  {
    id: 'growth-manager',
    title: 'Growth Manager',
    category: 'marketing',
    description: 'Run experiments across acquisition, activation and retention, and keep the ones the data actually supports.',
    demand: 'very-high',
    typicalRamp: '9-18 months',
    learningModel: 'management',
    foundations: ['digital-marketing', 'data-analysis'],
    skills: [
      req('performance-marketing', 0.95), req('marketing-analytics', 0.90),
      req('digital-marketing', 0.90), req('product-analytics', 0.80),
      req('data-analysis', 0.80), req('sql', 0.65), req('consumer-behaviour', 0.70),
      req('content-strategy', 0.65), pref('seo', 0.65), pref('critical-thinking', 0.60),
    ],
  },
  {
    id: 'digital-marketing-specialist',
    title: 'Digital Marketing Specialist',
    category: 'marketing',
    description: 'Run the channels: search, social, email and paid, and report what each one returned.',
    demand: 'very-high',
    typicalRamp: '4-9 months',
    learningModel: 'management',
    foundations: ['marketing-fundamentals'],
    skills: [
      req('digital-marketing', 1.0), req('seo', 0.85), req('content-strategy', 0.80),
      req('marketing-analytics', 0.85), req('performance-marketing', 0.80),
      req('marketing-fundamentals', 0.80), req('copywriting', 0.65),
      pref('spreadsheets', 0.55),
    ],
  },
  {
    id: 'sales-manager',
    title: 'Sales Manager',
    category: 'marketing',
    description: 'Build a pipeline and a team that can work it, with forecasts that hold.',
    demand: 'high',
    typicalRamp: '9-18 months',
    learningModel: 'management',
    foundations: ['communication'],
    skills: [
      req('sales', 1.0), req('negotiation', 0.85), req('communication', 0.90),
      req('leadership', 0.80), req('market-research', 0.65),
      req('stakeholder-management', 0.75), req('spreadsheets', 0.60),
      pref('marketing-fundamentals', 0.55),
    ],
  },

  // ══════════════ FINANCE ══════════════
  {
    id: 'financial-analyst',
    title: 'Financial Analyst',
    category: 'finance',
    description: 'Model a business in numbers, then say plainly what the model implies.',
    demand: 'very-high',
    typicalRamp: '9-18 months',
    learningModel: 'management',
    foundations: ['financial-accounting', 'spreadsheets'],
    skills: [
      req('financial-accounting', 0.95), req('corporate-finance', 0.90),
      req('financial-modelling', 0.95), req('spreadsheets', 0.90),
      req('data-analysis', 0.75), req('economics', 0.70),
      req('communication', 0.75), pref('sql', 0.55), pref('risk-management', 0.60),
    ],
  },
  {
    id: 'investment-analyst',
    title: 'Investment Analyst',
    category: 'finance',
    description: 'Research securities and argue a position, with the downside stated as clearly as the upside.',
    demand: 'high',
    typicalRamp: '12-24 months',
    learningModel: 'management',
    foundations: ['financial-accounting', 'corporate-finance'],
    skills: [
      req('investment-analysis', 1.0), req('corporate-finance', 0.90),
      req('financial-modelling', 0.90), req('financial-accounting', 0.85),
      req('economics', 0.80), req('risk-management', 0.80),
      req('spreadsheets', 0.85), req('statistics', 0.65), pref('communication', 0.70),
    ],
  },

  // ══════════════ PEOPLE & HR ══════════════
  {
    id: 'hr-manager',
    title: 'HR Manager',
    category: 'people-ops',
    description: 'Run hiring, development and the policies that decide what working there is actually like.',
    demand: 'high',
    typicalRamp: '9-18 months',
    learningModel: 'management',
    foundations: ['human-resources', 'communication'],
    skills: [
      req('human-resources', 1.0), req('talent-acquisition', 0.80),
      req('organisational-behaviour', 0.85), req('leadership', 0.80),
      req('communication', 0.90), req('law-basics', 0.65),
      req('stakeholder-management', 0.70), pref('psychology', 0.60),
      pref('data-analysis', 0.50),
    ],
  },
  {
    id: 'talent-acquisition-specialist',
    title: 'Talent Acquisition Specialist',
    category: 'people-ops',
    description: 'Find, assess and close the people a team needs, without wasting anybody\'s time.',
    demand: 'high',
    typicalRamp: '4-9 months',
    learningModel: 'management',
    foundations: ['communication'],
    skills: [
      req('talent-acquisition', 1.0), req('human-resources', 0.80),
      req('communication', 0.90), req('negotiation', 0.70),
      req('organisational-behaviour', 0.65), pref('psychology', 0.55),
      pref('data-analysis', 0.45),
    ],
  },

  // ══════════════ OPERATIONS ══════════════
  {
    id: 'operations-manager',
    title: 'Operations Manager',
    category: 'operations',
    description: 'Make the machine run: process, capacity, cost and the reporting that shows whether it improved.',
    demand: 'high',
    typicalRamp: '9-18 months',
    learningModel: 'management',
    foundations: ['business-fundamentals'],
    skills: [
      req('operations-management', 1.0), req('project-management', 0.80),
      req('data-analysis', 0.75), req('spreadsheets', 0.80),
      req('leadership', 0.80), req('risk-management', 0.70),
      req('stakeholder-management', 0.70), pref('supply-chain', 0.65),
      pref('business-analysis', 0.60),
    ],
  },
  {
    id: 'supply-chain-manager',
    title: 'Supply Chain Manager',
    category: 'operations',
    description: 'Move goods through suppliers, inventory and logistics without tying up cash or missing demand.',
    demand: 'high',
    typicalRamp: '12-24 months',
    learningModel: 'management',
    foundations: ['operations-management'],
    skills: [
      req('supply-chain', 1.0), req('operations-management', 0.90),
      req('data-analysis', 0.75), req('spreadsheets', 0.80),
      req('risk-management', 0.75), req('negotiation', 0.70),
      req('project-management', 0.65), pref('business-analysis', 0.55),
    ],
  },

  // ══════════════ ENTREPRENEURSHIP ══════════════
  {
    id: 'founder',
    title: 'Founder',
    category: 'entrepreneurship',
    description: 'Find a problem worth solving, build something people want, and keep the company alive long enough to learn.',
    demand: 'high',
    typicalRamp: 'open-ended',
    learningModel: 'management',
    foundations: ['business-fundamentals'],
    skills: [
      req('entrepreneurship', 1.0), req('business-strategy', 0.85),
      req('marketing-fundamentals', 0.75), req('corporate-finance', 0.70),
      req('sales', 0.80), req('product-management', 0.75),
      req('communication', 0.85), req('leadership', 0.80),
      pref('financial-modelling', 0.60), pref('negotiation', 0.65),
      pref('market-research', 0.70),
    ],
  },

  // ══════════════ DESIGN & VISUAL ARTS ══════════════
  {
    id: 'graphic-designer',
    title: 'Graphic Designer',
    category: 'design',
    description: 'Solve problems with type, image and layout, and build a portfolio that shows you can do it repeatedly.',
    demand: 'high',
    typicalRamp: '6-12 months',
    learningModel: 'creative',
    foundations: ['design-fundamentals'],
    skills: [
      req('design-fundamentals', 1.0), req('typography', 0.90),
      req('colour-theory', 0.85), req('brand-identity', 0.85),
      req('adobe-creative', 0.85), req('portfolio-development', 0.90),
      pref('illustration', 0.60), pref('motion-design', 0.50),
      pref('design-thinking', 0.60),
    ],
  },
  {
    id: 'ux-ui-designer',
    title: 'UI/UX Designer',
    category: 'design',
    description: 'Design products people can actually use, and document the reasoning so the team can build it.',
    demand: 'very-high',
    typicalRamp: '6-12 months',
    learningModel: 'creative',
    foundations: ['design-fundamentals'],
    skills: [
      req('ui-design', 1.0), req('ux-research', 0.90), req('design-systems', 0.80),
      req('design-fundamentals', 0.85), req('typography', 0.70),
      req('design-thinking', 0.80), req('portfolio-development', 0.85),
      pref('colour-theory', 0.65), pref('product-analytics', 0.50),
      pref('accessibility', 0.60),
    ],
  },
  {
    id: 'art-director',
    title: 'Art Director',
    category: 'design',
    description: 'Set the visual direction for a campaign or a product, and hold it across everyone who touches the work.',
    demand: 'high',
    typicalRamp: '18-36 months',
    learningModel: 'creative',
    foundations: ['design-fundamentals', 'brand-identity'],
    skills: [
      req('design-fundamentals', 0.95), req('brand-identity', 0.95),
      req('typography', 0.85), req('colour-theory', 0.85),
      req('adobe-creative', 0.80), req('leadership', 0.75),
      req('communication', 0.85), req('portfolio-development', 0.80),
      pref('photography', 0.55), pref('motion-design', 0.55),
    ],
  },
  {
    id: 'illustrator',
    title: 'Illustrator',
    category: 'design',
    description: 'Draw for a brief: editorial, brand or narrative, with a recognisable voice and a body of work behind it.',
    demand: 'high',
    typicalRamp: '12-24 months',
    learningModel: 'creative',
    foundations: ['design-fundamentals'],
    skills: [
      req('illustration', 1.0), req('design-fundamentals', 0.85),
      req('colour-theory', 0.85), req('adobe-creative', 0.80),
      req('portfolio-development', 0.90), pref('typography', 0.50),
      pref('motion-design', 0.45), pref('art-history', 0.45),
    ],
  },
  {
    id: 'motion-designer',
    title: 'Motion Designer',
    category: 'design',
    description: 'Give design time and movement, for brand, product or screen.',
    demand: 'high',
    typicalRamp: '9-18 months',
    learningModel: 'creative',
    foundations: ['design-fundamentals'],
    skills: [
      req('motion-design', 1.0), req('design-fundamentals', 0.85),
      req('adobe-creative', 0.85), req('colour-theory', 0.70),
      req('portfolio-development', 0.85), pref('typography', 0.60),
      pref('sound-design', 0.45), pref('video-editing', 0.55),
    ],
  },

  // ══════════════ FILM & MEDIA ══════════════
  {
    id: 'film-editor',
    title: 'Film Editor',
    category: 'film-media',
    description: 'Shape footage into something that holds attention, and cut the parts you were fond of.',
    demand: 'high',
    typicalRamp: '9-18 months',
    learningModel: 'creative',
    foundations: ['video-editing'],
    skills: [
      req('video-editing', 1.0), req('videography', 0.70),
      req('sound-design', 0.65), req('portfolio-development', 0.85),
      req('design-fundamentals', 0.55), pref('motion-design', 0.55),
      pref('screenwriting', 0.45),
    ],
  },
  {
    id: 'filmmaker',
    title: 'Filmmaker',
    category: 'film-media',
    description: 'Take a film from script through shoot to cut, on whatever budget you actually have.',
    demand: 'high',
    typicalRamp: '18-36 months',
    learningModel: 'creative',
    foundations: ['videography'],
    skills: [
      req('videography', 1.0), req('screenwriting', 0.85),
      req('video-editing', 0.85), req('sound-design', 0.70),
      req('project-management', 0.60), req('portfolio-development', 0.90),
      pref('photography', 0.60), pref('creative-writing', 0.60),
    ],
  },
  {
    id: 'content-creator',
    title: 'Content Creator',
    category: 'film-media',
    description: 'Build an audience with work you publish yourself, and understand what actually made it land.',
    demand: 'very-high',
    typicalRamp: '6-18 months',
    learningModel: 'creative',
    foundations: ['communication'],
    skills: [
      req('content-strategy', 0.90), req('video-editing', 0.80),
      req('copywriting', 0.75), req('digital-marketing', 0.75),
      req('videography', 0.70), req('marketing-analytics', 0.65),
      req('portfolio-development', 0.70), pref('photography', 0.55),
      pref('sound-design', 0.45),
    ],
  },

  // ══════════════ MUSIC & AUDIO ══════════════
  {
    id: 'music-producer',
    title: 'Music Producer',
    category: 'music',
    description: 'Take a track from idea to finished master, and be able to do it again on a deadline.',
    demand: 'high',
    typicalRamp: '12-24 months',
    learningModel: 'creative',
    foundations: ['music-theory'],
    skills: [
      req('music-production', 1.0), req('mixing-mastering', 0.85),
      req('music-theory', 0.80), req('sound-design', 0.75),
      req('portfolio-development', 0.85), pref('creative-writing', 0.40),
    ],
  },
  {
    id: 'sound-designer',
    title: 'Sound Designer',
    category: 'music',
    description: 'Build the audio world of a film, a game or a product, down to sounds nobody consciously notices.',
    demand: 'high',
    typicalRamp: '12-24 months',
    learningModel: 'creative',
    foundations: ['sound-design'],
    skills: [
      req('sound-design', 1.0), req('mixing-mastering', 0.80),
      req('music-production', 0.70), req('music-theory', 0.55),
      req('portfolio-development', 0.80), pref('video-editing', 0.45),
    ],
  },

  // ══════════════ WRITING & PUBLISHING ══════════════
  {
    id: 'copywriter',
    title: 'Copywriter',
    category: 'writing',
    description: 'Write the words that sell, explain or persuade, and know which job each piece is doing.',
    demand: 'very-high',
    typicalRamp: '4-12 months',
    learningModel: 'creative',
    foundations: ['creative-writing'],
    skills: [
      req('copywriting', 1.0), req('creative-writing', 0.80),
      req('content-strategy', 0.80), req('marketing-fundamentals', 0.70),
      req('editing-proofreading', 0.75), req('portfolio-development', 0.85),
      pref('consumer-behaviour', 0.60), pref('seo', 0.60),
    ],
  },
  {
    id: 'writer',
    title: 'Writer',
    category: 'writing',
    description: 'Build a body of work in fiction or long form, and finish things.',
    demand: 'high',
    typicalRamp: 'open-ended',
    learningModel: 'creative',
    foundations: ['creative-writing'],
    skills: [
      req('creative-writing', 1.0), req('editing-proofreading', 0.85),
      req('portfolio-development', 0.85), req('communication', 0.60),
      pref('literature', 0.55), pref('journalism', 0.45),
    ],
  },
  {
    id: 'editor',
    title: 'Editor',
    category: 'writing',
    description: 'Make other people\'s writing better without making it yours, and ship on schedule.',
    demand: 'high',
    typicalRamp: '12-24 months',
    learningModel: 'creative',
    foundations: ['editing-proofreading'],
    skills: [
      req('editing-proofreading', 1.0), req('creative-writing', 0.75),
      req('content-strategy', 0.75), req('communication', 0.80),
      req('project-management', 0.55), pref('journalism', 0.55),
    ],
  },
  {
    id: 'journalist',
    title: 'Journalist',
    category: 'writing',
    description: 'Find out what happened, check it, and write it so it holds up.',
    demand: 'high',
    typicalRamp: '12-24 months',
    learningModel: 'research',
    foundations: ['journalism'],
    skills: [
      req('journalism', 1.0), req('research-methods', 0.80),
      req('editing-proofreading', 0.75), req('communication', 0.85),
      req('critical-thinking', 0.85), req('law-basics', 0.55),
      pref('data-analysis', 0.50), pref('political-science', 0.50),
    ],
  },

  // ══════════════ PHOTOGRAPHY ══════════════
  {
    id: 'photographer',
    title: 'Photographer',
    category: 'photography',
    description: 'Shoot to a brief and to your own eye, and build a portfolio that gets you the next job.',
    demand: 'high',
    typicalRamp: '9-18 months',
    learningModel: 'creative',
    foundations: ['photography'],
    skills: [
      req('photography', 1.0), req('photo-editing', 0.90),
      req('colour-theory', 0.70), req('design-fundamentals', 0.65),
      req('portfolio-development', 0.90), pref('videography', 0.50),
      pref('adobe-creative', 0.70),
    ],
  },

  // ══════════════ PSYCHOLOGY ══════════════
  {
    id: 'psychology-researcher',
    title: 'Psychology Researcher',
    category: 'psychology',
    description: 'Design and run studies on how people think and behave, and report what the data supports.',
    demand: 'high',
    typicalRamp: '24-48 months',
    learningModel: 'research',
    credential: 'Research roles normally require a postgraduate degree. Clinical practice additionally requires licensure, which no online course substitutes for.',
    foundations: ['psychology', 'statistics'],
    skills: [
      req('psychology', 1.0), req('research-methods', 0.95),
      req('quantitative-research', 0.90), req('statistics', 0.85),
      req('qualitative-research', 0.75), req('academic-writing', 0.85),
      req('cognitive-psychology', 0.70), pref('data-analysis', 0.65),
      pref('critical-thinking', 0.75),
    ],
  },

  // ══════════════ SOCIAL SCIENCES ══════════════
  {
    id: 'ux-researcher',
    title: 'UX Researcher',
    category: 'social-sciences',
    description: 'Find out what users actually do, not what they say, and turn it into decisions a product team can use.',
    demand: 'very-high',
    typicalRamp: '9-18 months',
    learningModel: 'research',
    foundations: ['ux-research'],
    skills: [
      req('ux-research', 1.0), req('qualitative-research', 0.85),
      req('research-methods', 0.85), req('psychology', 0.70),
      req('communication', 0.85), req('quantitative-research', 0.65),
      req('statistics', 0.55), pref('design-thinking', 0.65),
      pref('product-analytics', 0.55),
    ],
  },
  {
    id: 'social-researcher',
    title: 'Social Researcher',
    category: 'social-sciences',
    description: 'Study how societies and institutions behave, with methods that stand up to review.',
    demand: 'high',
    typicalRamp: '24-48 months',
    learningModel: 'research',
    credential: 'Academic and policy research roles normally require a postgraduate degree.',
    foundations: ['sociology', 'research-methods'],
    skills: [
      req('sociology', 0.95), req('research-methods', 0.95),
      req('qualitative-research', 0.85), req('quantitative-research', 0.80),
      req('statistics', 0.75), req('academic-writing', 0.85),
      req('critical-thinking', 0.80), pref('political-science', 0.60),
      pref('data-analysis', 0.60),
    ],
  },
  {
    id: 'policy-analyst',
    title: 'Policy Analyst',
    category: 'social-sciences',
    description: 'Work out what a policy would actually do, and write the case for or against it.',
    demand: 'high',
    typicalRamp: '12-24 months',
    learningModel: 'research',
    foundations: ['political-science'],
    skills: [
      req('political-science', 1.0), req('research-methods', 0.85),
      req('economics', 0.75), req('data-analysis', 0.75),
      req('academic-writing', 0.80), req('critical-thinking', 0.85),
      req('communication', 0.85), pref('statistics', 0.65),
      pref('law-basics', 0.60),
    ],
  },

  // ══════════════ HUMANITIES ══════════════
  {
    id: 'historian',
    title: 'Historian',
    category: 'humanities',
    description: 'Work from sources to an argument about the past that other historians can check.',
    demand: 'high',
    typicalRamp: '24-48 months',
    learningModel: 'research',
    credential: 'Academic posts normally require a doctorate.',
    foundations: ['history'],
    skills: [
      req('history', 1.0), req('research-methods', 0.90),
      req('academic-writing', 0.90), req('critical-thinking', 0.85),
      req('qualitative-research', 0.70), pref('cultural-studies', 0.60),
      pref('philosophy', 0.50), pref('linguistics', 0.40),
    ],
  },
  {
    id: 'art-historian',
    title: 'Art Historian',
    category: 'humanities',
    description: 'Read objects and images in their context, and write about what they meant and to whom.',
    demand: 'high',
    typicalRamp: '24-48 months',
    learningModel: 'research',
    credential: 'Curatorial and academic posts normally require a postgraduate degree.',
    foundations: ['art-history'],
    skills: [
      req('art-history', 1.0), req('history', 0.75),
      req('research-methods', 0.85), req('academic-writing', 0.90),
      req('critical-thinking', 0.80), req('cultural-studies', 0.70),
      pref('design-fundamentals', 0.45), pref('philosophy', 0.50),
    ],
  },
  {
    id: 'philosopher',
    title: 'Philosophy Researcher',
    category: 'humanities',
    description: 'Make arguments precise enough to be wrong, and then find out whether they are.',
    demand: 'high',
    typicalRamp: '24-48 months',
    learningModel: 'research',
    credential: 'Academic posts normally require a doctorate.',
    foundations: ['philosophy'],
    skills: [
      req('philosophy', 1.0), req('critical-thinking', 0.95),
      req('academic-writing', 0.90), req('research-methods', 0.80),
      req('discrete-math', 0.45), pref('history', 0.55),
      pref('linguistics', 0.50), pref('political-science', 0.50),
    ],
  },
  {
    id: 'cultural-researcher',
    title: 'Cultural Researcher',
    category: 'humanities',
    description: 'Study how culture is made and circulated, across media, institutions and everyday life.',
    demand: 'high',
    typicalRamp: '18-36 months',
    learningModel: 'research',
    foundations: ['cultural-studies'],
    skills: [
      req('cultural-studies', 1.0), req('research-methods', 0.85),
      req('qualitative-research', 0.85), req('academic-writing', 0.85),
      req('critical-thinking', 0.80), pref('sociology', 0.70),
      pref('history', 0.60), pref('linguistics', 0.50),
    ],
  },
  {
    id: 'language-specialist',
    title: 'Language Specialist',
    category: 'humanities',
    description: 'Work professionally between languages, in translation, localisation or teaching.',
    demand: 'high',
    typicalRamp: '12-36 months',
    learningModel: 'creative',
    foundations: ['linguistics'],
    skills: [
      req('linguistics', 0.95), req('communication', 0.85),
      req('editing-proofreading', 0.80), req('academic-writing', 0.65),
      req('cultural-studies', 0.65), pref('teaching', 0.60),
      pref('creative-writing', 0.55),
    ],
  },

  // ══════════════ COMMUNICATION ══════════════
  {
    id: 'communication-specialist',
    title: 'Communication Specialist',
    category: 'communication',
    description: 'Say what an organisation means clearly, to the people who need to hear it, including when the news is bad.',
    demand: 'high',
    typicalRamp: '9-18 months',
    learningModel: 'management',
    foundations: ['communication'],
    skills: [
      req('communication', 1.0), req('content-strategy', 0.85),
      req('copywriting', 0.75), req('editing-proofreading', 0.75),
      req('stakeholder-management', 0.80), req('marketing-fundamentals', 0.65),
      req('risk-management', 0.55), pref('journalism', 0.50),
      pref('psychology', 0.50),
    ],
  },

  // ══════════════ AI, ML & DATA ══════════════
  {
    id: 'generative-ai-engineer',
    title: 'Generative AI Engineer',
    category: 'ai-ml-data',
    description: 'Build products on top of large language models, retrieval systems, agents, and evaluation pipelines that hold up in production.',
    demand: 'extreme',
    typicalRamp: '6-12 months',
    foundations: ['python', 'machine-learning'],
    skills: [
      req('python', 0.95), req('llm', 1.0), req('transformers', 0.95), req('rag', 0.95),
      req('prompt-engineering', 0.90), req('vector-db', 0.85), req('deep-learning', 0.85),
      req('nlp', 0.80), req('model-evaluation', 0.80), req('huggingface', 0.75),
      req('machine-learning', 0.80), pref('langchain', 0.70), pref('ai-agents', 0.70),
      pref('mlops', 0.70), pref('fine-tuning', 0.65), pref('docker', 0.55), pref('rest-api', 0.55),
    ],
  },
  {
    id: 'ml-engineer',
    title: 'Machine Learning Engineer',
    category: 'ai-ml-data',
    description: 'Train, evaluate and ship machine learning models that survive contact with real traffic and real data drift.',
    demand: 'extreme',
    typicalRamp: '9-18 months',
    foundations: ['python', 'statistics'],
    skills: [
      req('python', 0.95), req('machine-learning', 0.95), req('deep-learning', 0.90),
      req('pytorch', 0.80), req('mlops', 0.80), req('statistics', 0.75),
      req('linear-algebra', 0.70), req('model-evaluation', 0.80), req('feature-engineering', 0.75),
      req('scikit-learn', 0.70), pref('tensorflow', 0.65), pref('docker', 0.65),
      pref('sql', 0.60), pref('aws', 0.55), pref('testing', 0.50),
    ],
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    category: 'ai-ml-data',
    description: 'Turn messy data into decisions, framing questions, building models, and communicating what the numbers actually support.',
    demand: 'very-high',
    typicalRamp: '6-12 months',
    foundations: ['python', 'statistics'],
    skills: [
      req('python', 0.90), req('statistics', 0.95), req('machine-learning', 0.85),
      req('data-analysis', 0.90), req('pandas', 0.85), req('sql', 0.85),
      req('data-visualization', 0.80), req('probability', 0.75), req('feature-engineering', 0.70),
      pref('numpy', 0.65), pref('scikit-learn', 0.70), pref('r', 0.40),
      pref('product-analytics', 0.50), pref('deep-learning', 0.45),
    ],
  },
  {
    id: 'data-engineer',
    title: 'Data Engineer',
    category: 'ai-ml-data',
    description: 'Build the pipelines and warehouses everyone else depends on, reliable, observable, and cheap to run.',
    demand: 'very-high',
    typicalRamp: '8-14 months',
    foundations: ['python', 'sql'],
    skills: [
      req('sql', 0.95), req('python', 0.85), req('data-engineering', 0.95),
      req('big-data', 0.80), req('data-warehousing', 0.80), req('dbms', 0.75),
      req('linux', 0.60), req('ci-cd', 0.60), pref('docker', 0.65),
      pref('aws', 0.65), pref('nosql', 0.55), pref('terraform', 0.50), pref('observability', 0.50),
    ],
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    category: 'ai-ml-data',
    description: 'Answer business questions with data, clean it, query it, visualize it, and make the finding impossible to misread.',
    demand: 'high',
    typicalRamp: '3-8 months',
    foundations: ['sql'],
    skills: [
      req('sql', 0.95), req('data-analysis', 0.95), req('data-visualization', 0.90),
      req('statistics', 0.75), req('business-intelligence', 0.80), req('pandas', 0.65),
      pref('python', 0.60), pref('product-analytics', 0.55), pref('data-warehousing', 0.40),
    ],
  },
  {
    id: 'mlops-engineer',
    title: 'MLOps Engineer',
    category: 'ai-ml-data',
    description: 'Own the path from notebook to production, training pipelines, model registries, monitoring, and rollback that works at 3am.',
    demand: 'very-high',
    typicalRamp: '9-15 months',
    foundations: ['python', 'machine-learning'],
    skills: [
      req('mlops', 1.0), req('python', 0.85), req('docker', 0.90), req('kubernetes', 0.80),
      req('ci-cd', 0.85), req('machine-learning', 0.75), req('observability', 0.75),
      req('linux', 0.70), req('model-evaluation', 0.70), pref('terraform', 0.65),
      pref('aws', 0.65), pref('testing', 0.60), pref('sre', 0.55),
    ],
  },
  {
    id: 'nlp-engineer',
    title: 'NLP Engineer',
    category: 'ai-ml-data',
    description: 'Build systems that read and write language, classification, extraction, retrieval, and generation.',
    demand: 'very-high',
    typicalRamp: '8-14 months',
    foundations: ['python', 'machine-learning'],
    skills: [
      req('nlp', 1.0), req('python', 0.90), req('transformers', 0.90), req('deep-learning', 0.85),
      req('huggingface', 0.80), req('machine-learning', 0.80), req('model-evaluation', 0.75),
      req('pytorch', 0.70), pref('llm', 0.70), pref('linear-algebra', 0.55), pref('mlops', 0.50),
    ],
  },
  {
    id: 'computer-vision-engineer',
    title: 'Computer Vision Engineer',
    category: 'ai-ml-data',
    description: 'Teach machines to interpret images and video, detection, segmentation, tracking, and the deployment constraints they bring.',
    demand: 'high',
    typicalRamp: '9-15 months',
    foundations: ['python', 'machine-learning'],
    skills: [
      req('computer-vision', 1.0), req('deep-learning', 0.90), req('python', 0.90),
      req('pytorch', 0.80), req('opencv', 0.80), req('machine-learning', 0.75),
      req('linear-algebra', 0.65), req('model-evaluation', 0.70),
      pref('tensorflow', 0.55), pref('mlops', 0.50), pref('signal-processing', 0.40),
    ],
  },
  {
    id: 'ai-engineer',
    title: 'AI Engineer',
    category: 'ai-ml-data',
    description: 'Ship AI features inside real products, model selection, orchestration, latency budgets, and evaluation that reflects users.',
    demand: 'extreme',
    typicalRamp: '6-12 months',
    foundations: ['python'],
    skills: [
      req('python', 0.90), req('llm', 0.90), req('machine-learning', 0.80),
      req('deep-learning', 0.80), req('rest-api', 0.75), req('prompt-engineering', 0.80),
      req('rag', 0.75), req('model-evaluation', 0.80), req('mlops', 0.70),
      pref('docker', 0.65), pref('vector-db', 0.65), pref('system-design', 0.60), pref('testing', 0.55),
    ],
  },

  // ══════════════ SOFTWARE & DEVELOPMENT ══════════════
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    category: 'software-dev',
    description: 'Build interfaces people actually enjoy using, fast, accessible, and maintainable past the first release.',
    demand: 'high',
    typicalRamp: '4-10 months',
    foundations: ['html', 'css'],
    skills: [
      req('javascript', 0.95), req('react', 0.90), req('html', 0.85), req('css', 0.90),
      req('typescript', 0.80), req('rest-api', 0.70), req('accessibility', 0.70),
      req('testing', 0.65), req('git', 0.75), pref('nextjs', 0.70),
      pref('web-performance', 0.65), pref('design-systems', 0.55), pref('ui-design', 0.45),
    ],
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    category: 'software-dev',
    description: 'Design the services and data models behind the product, correctness first, then throughput.',
    demand: 'very-high',
    typicalRamp: '6-12 months',
    foundations: ['dsa'],
    skills: [
      req('rest-api', 0.90), req('sql', 0.85), req('dbms', 0.80), req('system-design', 0.85),
      req('dsa', 0.75), req('testing', 0.75), req('git', 0.75), req('linux', 0.65),
      pref('nodejs', 0.65), pref('python', 0.60), pref('docker', 0.70),
      pref('redis', 0.55), pref('nosql', 0.50), pref('graphql', 0.40),
    ],
  },
  {
    id: 'fullstack-developer',
    title: 'Full-Stack Developer',
    category: 'software-dev',
    description: 'Own a feature end to end, schema, API, interface, and the deploy that puts it in front of users.',
    demand: 'very-high',
    typicalRamp: '8-14 months',
    foundations: ['javascript'],
    skills: [
      req('javascript', 0.90), req('typescript', 0.80), req('react', 0.85), req('nodejs', 0.80),
      req('sql', 0.80), req('rest-api', 0.85), req('git', 0.80), req('html', 0.70),
      req('css', 0.70), req('testing', 0.70), pref('nextjs', 0.70),
      pref('docker', 0.60), pref('system-design', 0.65), pref('nosql', 0.45),
    ],
  },
  {
    id: 'mobile-developer',
    title: 'Mobile App Developer',
    category: 'software-dev',
    description: 'Build apps that feel native on the device, offline state, platform conventions, and store release discipline.',
    demand: 'high',
    typicalRamp: '6-12 months',
    foundations: ['javascript'],
    skills: [
      req('react-native', 0.85), req('javascript', 0.85), req('rest-api', 0.75),
      req('git', 0.70), req('testing', 0.60), pref('typescript', 0.70),
      pref('flutter', 0.50), pref('android', 0.55), pref('ios', 0.50), pref('ui-design', 0.45),
    ],
  },
  {
    id: 'game-developer',
    title: 'Game Developer',
    category: 'software-dev',
    description: 'Build interactive worlds, engine work, gameplay systems, and the performance budget that keeps frames steady.',
    demand: 'high',
    typicalRamp: '9-18 months',
    foundations: ['cpp'],
    skills: [
      req('game-dev', 1.0), req('cpp', 0.75), req('linear-algebra', 0.70),
      req('dsa', 0.65), req('git', 0.60), pref('csharp', 0.70),
      pref('computer-architecture', 0.35), pref('ar-vr', 0.40), pref('ui-design', 0.35),
    ],
  },
  {
    id: 'software-engineer',
    title: 'Software Engineer',
    category: 'software-dev',
    description: 'The generalist core, algorithms, design, testing, and the judgement to know which matters when.',
    demand: 'very-high',
    typicalRamp: '6-14 months',
    foundations: ['dsa'],
    skills: [
      req('dsa', 0.95), req('system-design', 0.80), req('git', 0.80), req('testing', 0.80),
      req('sql', 0.65), req('operating-systems', 0.60), req('rest-api', 0.65),
      pref('python', 0.60), pref('java', 0.50), pref('linux', 0.55),
      pref('computer-networks', 0.45), pref('agile', 0.45),
    ],
  },

  // ══════════════ INFRASTRUCTURE & SYSTEMS ══════════════
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    category: 'infrastructure',
    description: 'Shorten the loop between commit and production without lowering the bar for safety.',
    demand: 'very-high',
    typicalRamp: '8-14 months',
    foundations: ['linux'],
    skills: [
      req('ci-cd', 0.95), req('docker', 0.90), req('kubernetes', 0.85), req('linux', 0.85),
      req('terraform', 0.80), req('git', 0.80), req('observability', 0.75),
      req('computer-networks', 0.60), pref('aws', 0.75), pref('python', 0.55), pref('sre', 0.60),
    ],
  },
  {
    id: 'cloud-engineer',
    title: 'Cloud Engineer',
    category: 'infrastructure',
    description: 'Architect and run systems on cloud primitives, with an eye on blast radius and the monthly bill.',
    demand: 'very-high',
    typicalRamp: '8-14 months',
    foundations: ['linux', 'computer-networks'],
    skills: [
      req('aws', 0.90), req('terraform', 0.80), req('linux', 0.80), req('computer-networks', 0.75),
      req('docker', 0.75), req('system-design', 0.70), req('cloud-security', 0.70),
      req('ci-cd', 0.65), pref('kubernetes', 0.70), pref('gcp', 0.50),
      pref('azure', 0.45), pref('observability', 0.60),
    ],
  },
  {
    id: 'sre',
    title: 'Site Reliability Engineer',
    category: 'infrastructure',
    description: 'Make reliability a measurable engineering property · SLOs, error budgets, and blameless incident response.',
    demand: 'very-high',
    typicalRamp: '12-18 months',
    foundations: ['linux', 'computer-networks'],
    skills: [
      req('sre', 1.0), req('linux', 0.85), req('observability', 0.90), req('kubernetes', 0.80),
      req('distributed-systems', 0.80), req('computer-networks', 0.75), req('ci-cd', 0.70),
      req('system-design', 0.75), pref('python', 0.60), pref('terraform', 0.60), pref('aws', 0.60),
    ],
  },

  // ══════════════ CYBERSECURITY ══════════════
  {
    id: 'cybersecurity-engineer',
    title: 'Cybersecurity Engineer',
    category: 'cybersecurity',
    description: 'Defend real systems, threat modelling, hardening, detection, and response under pressure.',
    demand: 'very-high',
    typicalRamp: '9-18 months',
    foundations: ['computer-networks', 'linux'],
    skills: [
      req('cybersecurity', 1.0), req('network-security', 0.90), req('computer-networks', 0.85),
      req('linux', 0.80), req('cryptography', 0.70), req('app-security', 0.75),
      req('cloud-security', 0.65), pref('penetration-testing', 0.65),
      pref('python', 0.55), pref('digital-forensics', 0.50),
    ],
  },
  {
    id: 'penetration-tester',
    title: 'Penetration Tester',
    category: 'cybersecurity',
    description: 'Break systems with permission, then write the report that gets the holes fixed.',
    demand: 'high',
    typicalRamp: '9-18 months',
    foundations: ['computer-networks', 'linux'],
    skills: [
      req('penetration-testing', 1.0), req('network-security', 0.85), req('linux', 0.85),
      req('app-security', 0.85), req('computer-networks', 0.80), req('cybersecurity', 0.80),
      req('technical-writing', 0.60), pref('python', 0.65), pref('cryptography', 0.55),
    ],
  },
  {
    id: 'security-analyst',
    title: 'Security Operations Analyst',
    category: 'cybersecurity',
    description: 'Watch the signal, separate noise from intrusion, and drive incidents to closure.',
    demand: 'high',
    typicalRamp: '6-12 months',
    foundations: ['computer-networks'],
    skills: [
      req('cybersecurity', 0.90), req('network-security', 0.85), req('observability', 0.70),
      req('digital-forensics', 0.75), req('linux', 0.70), req('computer-networks', 0.80),
      pref('python', 0.50), pref('cloud-security', 0.55),
    ],
  },

  // ══════════════ HARDWARE & EMERGING ══════════════
  {
    id: 'embedded-engineer',
    title: 'Embedded Systems Engineer',
    category: 'hardware-emerging',
    description: 'Write the firmware that runs where there is no operating system to save you.',
    demand: 'high',
    typicalRamp: '9-15 months',
    foundations: ['c'],
    skills: [
      req('embedded-systems', 1.0), req('c', 0.95), req('computer-architecture', 0.75),
      req('operating-systems', 0.65), req('signal-processing', 0.55), req('git', 0.60),
      pref('cpp', 0.65), pref('iot', 0.60), pref('control-systems', 0.50), pref('linux', 0.55),
    ],
  },
  {
    id: 'robotics-engineer',
    title: 'Robotics Engineer',
    category: 'hardware-emerging',
    description: 'Close the loop between perception, planning and actuation on hardware that can hurt you.',
    demand: 'high',
    typicalRamp: '12-24 months',
    foundations: ['python', 'linear-algebra'],
    skills: [
      req('robotics', 1.0), req('control-systems', 0.85), req('python', 0.80),
      req('linear-algebra', 0.80), req('computer-vision', 0.70), req('cpp', 0.70),
      req('embedded-systems', 0.65), pref('reinforcement-learning', 0.45),
      pref('linux', 0.60), pref('signal-processing', 0.50),
    ],
  },
  {
    id: 'iot-engineer',
    title: 'IoT Engineer',
    category: 'hardware-emerging',
    description: 'Connect constrained devices to the cloud, power budgets, flaky links, and fleet updates.',
    demand: 'high',
    typicalRamp: '8-14 months',
    foundations: ['c'],
    skills: [
      req('iot', 1.0), req('embedded-systems', 0.85), req('computer-networks', 0.80),
      req('c', 0.75), req('linux', 0.65), req('cloud-security', 0.55),
      pref('python', 0.60), pref('aws', 0.55), pref('rest-api', 0.55),
    ],
  },

  // ══════════════ PRODUCT & BUSINESS-TECH ══════════════
  {
    // Kept under this id rather than renamed: learners already have it stored
    // as their goal, and an id is a promise to the data, not a label.
    id: 'product-manager',
    title: 'Product Manager',
    category: 'product-business',
    description: 'Decide what to build and why, from user research and data through to a roadmap the team can actually ship.',
    demand: 'very-high',
    typicalRamp: '9-18 months',
    learningModel: 'management',
    foundations: ['communication'],
    skills: [
      req('product-management', 1.0), req('product-analytics', 0.85),
      req('market-research', 0.80), req('ux-research', 0.75),
      req('stakeholder-management', 0.80), req('communication', 0.85),
      req('business-strategy', 0.70), req('data-analysis', 0.70),
      req('technical-writing', 0.65), req('agile', 0.70), req('sql', 0.60),
      pref('business-fundamentals', 0.65), pref('design-thinking', 0.60),
      pref('critical-thinking', 0.60), pref('leadership', 0.55),
      pref('system-design', 0.45), pref('data-visualization', 0.50),
    ],
  },
  {
    id: 'technical-writer',
    title: 'Technical Writer',
    category: 'product-business',
    description: 'Make complex systems understandable · API references, guides, and the docs people actually finish.',
    demand: 'high',
    typicalRamp: '4-9 months',
    foundations: ['communication'],
    skills: [
      req('technical-writing', 1.0), req('git', 0.70), req('rest-api', 0.70),
      req('html', 0.50), pref('python', 0.45), pref('accessibility', 0.45), pref('agile', 0.40),
    ],
  },

  // ══════════════ DESIGN + TECH ══════════════
  {
    id: 'ux-engineer',
    title: 'UX Engineer',
    category: 'design-tech',
    description: 'Live between design and engineering, prototypes, design systems, and interfaces that survive handoff.',
    demand: 'high',
    typicalRamp: '6-12 months',
    foundations: ['html', 'css'],
    skills: [
      req('ui-design', 0.90), req('css', 0.90), req('javascript', 0.85), req('react', 0.80),
      req('design-systems', 0.85), req('accessibility', 0.80), req('ux-research', 0.70),
      req('html', 0.80), pref('typescript', 0.60), pref('web-performance', 0.55),
    ],
  },
  {
    id: 'product-designer',
    title: 'Product Designer',
    category: 'design-tech',
    description: 'Shape the whole experience, research, interaction, and the visual system that ties it together.',
    demand: 'high',
    typicalRamp: '6-12 months',
    foundations: ['design-fundamentals'],
    skills: [
      req('ui-design', 1.0), req('ux-research', 0.90), req('design-systems', 0.80),
      req('accessibility', 0.70), req('product-analytics', 0.55),
      pref('html', 0.40), pref('css', 0.45), pref('product-management', 0.45),
    ],
  },

  // ══════════════ NEW / SPECIALIZED ══════════════
  {
    id: 'blockchain-developer',
    title: 'Blockchain Developer',
    category: 'new-specialized',
    description: 'Write contracts where bugs are permanent and public, security review is the job, not an afterthought.',
    demand: 'high',
    typicalRamp: '8-15 months',
    foundations: ['javascript'],
    skills: [
      req('blockchain', 1.0), req('smart-contracts', 0.95), req('solidity', 0.90),
      req('cryptography', 0.75), req('app-security', 0.75), req('javascript', 0.70),
      req('testing', 0.70), pref('typescript', 0.55), pref('rest-api', 0.50),
    ],
  },
  {
    id: 'quantum-engineer',
    title: 'Quantum Computing Engineer',
    category: 'new-specialized',
    description: 'Work at the edge of what hardware can do, algorithms, error mitigation, and honest benchmarking.',
    demand: 'high',
    typicalRamp: '12-24 months',
    foundations: ['linear-algebra', 'python'],
    skills: [
      req('quantum-computing', 1.0), req('linear-algebra', 0.95), req('python', 0.85),
      req('probability', 0.75), req('discrete-math', 0.70), req('research-methods', 0.60),
      pref('calculus', 0.55), pref('dsa', 0.50),
    ],
  },
  {
    id: 'bioinformatics-engineer',
    title: 'Bioinformatics Engineer',
    category: 'new-specialized',
    description: 'Apply computation to biological data, pipelines, statistics, and results a biologist can trust.',
    demand: 'high',
    typicalRamp: '9-18 months',
    foundations: ['python', 'statistics'],
    skills: [
      req('bioinformatics', 1.0), req('python', 0.90), req('statistics', 0.85),
      req('data-analysis', 0.80), req('machine-learning', 0.65), req('linux', 0.70),
      pref('r', 0.60), pref('big-data', 0.50), pref('data-visualization', 0.55),
    ],
  },

  // ══════════════ RESEARCH ══════════════
  {
    id: 'ai-researcher',
    title: 'AI Researcher',
    category: 'research',
    description: 'Push the state of the art, read deeply, reproduce honestly, and publish results that hold up.',
    demand: 'extreme',
    typicalRamp: '18-36 months',
    foundations: ['python', 'linear-algebra', 'machine-learning'],
    skills: [
      req('machine-learning', 0.95), req('deep-learning', 0.95), req('research-methods', 0.95),
      req('linear-algebra', 0.90), req('probability', 0.85), req('python', 0.90),
      req('pytorch', 0.85), req('transformers', 0.80), req('calculus', 0.75),
      req('model-evaluation', 0.80), req('technical-writing', 0.70),
      pref('reinforcement-learning', 0.55), pref('nlp', 0.55),
    ],
  },
];

export const CAREER_MAP: ReadonlyMap<string, CareerGoal> = new Map(CAREER_GOALS.map((c) => [c.id, c]));

export function getCareer(id: string): CareerGoal | undefined {
  return CAREER_MAP.get(id);
}

/** Display-ready skill requirements with resolved names. */
export function careerSkillsWithNames(career: CareerGoal) {
  return career.skills.map((s) => ({ ...s, skillName: skillName(s.skillId) }));
}

/** Case-insensitive search across title, description and required skill names. */
export function searchCareers(query: string): CareerGoal[] {
  const q = query.trim().toLowerCase();
  if (!q) return CAREER_GOALS;
  return CAREER_GOALS.filter((c) => {
    if (c.title.toLowerCase().includes(q)) return true;
    if (c.description.toLowerCase().includes(q)) return true;
    return c.skills.some((s) => skillName(s.skillId).toLowerCase().includes(q));
  });
}
