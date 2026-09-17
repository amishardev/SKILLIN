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
}

export type CareerCategoryId =
  | 'software-dev' | 'ai-ml-data' | 'cybersecurity' | 'infrastructure'
  | 'hardware-emerging' | 'product-business' | 'design-tech'
  | 'new-specialized' | 'research';

export const CAREER_CATEGORIES: { id: CareerCategoryId; label: string }[] = [
  { id: 'software-dev', label: 'Software & Development' },
  { id: 'ai-ml-data', label: 'AI, ML & Data' },
  { id: 'cybersecurity', label: 'Cybersecurity' },
  { id: 'infrastructure', label: 'Infrastructure & Systems' },
  { id: 'hardware-emerging', label: 'Hardware & Emerging Tech' },
  { id: 'product-business', label: 'Product & Business-Tech' },
  { id: 'design-tech', label: 'Design + Tech' },
  { id: 'new-specialized', label: 'New / Specialized Tech' },
  { id: 'research', label: 'Research' },
];

/** Terse helper so role definitions stay readable. */
const req = (skillId: string, weight: number): CareerSkillRequirement => ({ skillId, weight, required: true });
const pref = (skillId: string, weight: number): CareerSkillRequirement => ({ skillId, weight, required: false });

export const CAREER_GOALS: CareerGoal[] = [
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
    id: 'product-manager',
    title: 'Technical Product Manager',
    category: 'product-business',
    description: 'Decide what to build and why, grounded in evidence, constrained by what engineering can actually ship.',
    demand: 'high',
    typicalRamp: '6-12 months',
    foundations: [],
    skills: [
      req('product-management', 1.0), req('product-analytics', 0.85), req('data-analysis', 0.75),
      req('technical-writing', 0.75), req('agile', 0.70), req('sql', 0.65),
      req('ux-research', 0.65), pref('system-design', 0.50), pref('data-visualization', 0.55),
    ],
  },
  {
    id: 'technical-writer',
    title: 'Technical Writer',
    category: 'product-business',
    description: 'Make complex systems understandable · API references, guides, and the docs people actually finish.',
    demand: 'high',
    typicalRamp: '4-9 months',
    foundations: [],
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
    foundations: [],
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
