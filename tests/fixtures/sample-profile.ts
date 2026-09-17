/**

 * Demo profile (Student S001 from the product spec).

 *

 * This is seed *data* only. It is fed through exactly the same skill-vector,

 * recommendation and roadmap code as a real uploaded profile, there is no

 * demo-specific business logic anywhere in the app.

 */



import type { CareerPlan, StudentProfile } from '@/types';



export const DEMO_PROFILE: StudentProfile = {

  name: 'Aryan Mehta',

  email: 'aryan.mehta@example.com',

  location: 'Mumbai, Maharashtra, India',

  headline: 'Data Science undergraduate | Python, ML, NLP',

  summary:

    'Final-year Data Science student focused on applied machine learning and natural language processing. Comfortable taking a model from notebook to a deployed Flask service.',

  education: [

    {

      institution: 'Indian Institute of Technology Bombay',

      degree: 'Bachelor of Technology - BTech',

      branch: 'Data Science and Artificial Intelligence',

      startYear: 2021,

      endYear: 2025,

    },

  ],

  college: 'Indian Institute of Technology Bombay',

  degree: 'Bachelor of Technology - BTech',

  branch: 'Data Science and Artificial Intelligence',

  graduationYear: 2025,



  projects: [

    {

      id: 'proj-0',

      title: 'Twitter Sentiment Analysis',

      description:

        'Sentiment classifier over 100K tweets using TF-IDF features and logistic regression in Scikit-learn, reaching 87% accuracy. Preprocessing pipeline handled tokenization and stopword removal.',

      technologies: ['python', 'nlp', 'scikit-learn', 'machine-learning', 'feature-engineering'],

      skills: [],

      year: 2023,

    },

    {

      id: 'proj-1',

      title: 'Customer Churn Prediction',

      description:

        'End-to-end machine learning pipeline for telecom churn using XGBoost. Applied SMOTE for class imbalance and reached 0.91 AUC.',

      technologies: ['python', 'machine-learning', 'feature-engineering', 'pandas', 'model-evaluation'],

      skills: [],

      year: 2024,

    },

    {

      id: 'proj-2',

      title: 'College FAQ Chatbot',

      description:

        'Retrieval chatbot using cosine similarity over TF-IDF vectors, deployed as a Flask REST API on Render.',

      technologies: ['python', 'nlp', 'rest-api', 'python-web'],

      skills: [],

      year: 2024,

    },

  ],



  experience: [

    {

      id: 'exp-0',

      organization: 'Acme Analytics',

      role: 'Data Analyst Intern',

      description:

        'Wrote SQL queries for weekly business reporting across three product lines. Built Power BI dashboards used by the sales team. Automated a data cleaning pipeline in Python with Pandas.',

      technologies: ['sql', 'data-visualization', 'python', 'pandas', 'data-analysis'],

      skills: [],

      startDate: 'May 2024',

      endDate: 'August 2024',

      kind: 'internship',

    },

    {

      id: 'exp-1',

      organization: 'Nova Labs',

      role: 'Machine Learning Intern',

      description:

        'Trained a gradient boosting model for demand forecasting using Scikit-learn. Ran feature engineering experiments and documented evaluation metrics.',

      technologies: ['machine-learning', 'scikit-learn', 'feature-engineering', 'model-evaluation', 'python'],

      skills: [],

      startDate: 'December 2023',

      endDate: 'February 2024',

      kind: 'internship',

    },

  ],



  certificates: [

    { id: 'cert-0', title: 'Python for Data Science', issuer: 'IBM', year: 2023, skills: ['python', 'data-analysis'] },

    { id: 'cert-1', title: 'SQL for Data Analysis', issuer: 'Udacity', year: 2023, skills: ['sql'] },

  ],



  achievements: [

    { id: 'ach-0', title: 'Winner, Inter-College Hackathon', year: 2024 },

    { id: 'ach-1', title: "Dean's List", year: 2023 },

  ],



  declaredSkills: [

    { skillId: 'python', rawName: 'Python', confidence: 0.75, source: 'self', evidence: 'Listed in your LinkedIn Skills section', explicit: true },

    { skillId: 'machine-learning', rawName: 'Machine Learning', confidence: 0.75, source: 'self', evidence: 'Listed in your LinkedIn Skills section', explicit: true },

    { skillId: 'sql', rawName: 'SQL', confidence: 0.75, source: 'self', evidence: 'Listed in your LinkedIn Skills section', explicit: true },

    { skillId: 'nlp', rawName: 'Natural Language Processing', confidence: 0.75, source: 'self', evidence: 'Listed in your LinkedIn Skills section', explicit: true },

    { skillId: 'pandas', rawName: 'Pandas', confidence: 0.75, source: 'self', evidence: 'Listed in your LinkedIn Skills section', explicit: true },

    { skillId: 'statistics', rawName: 'Statistics', confidence: 0.7, source: 'academic', evidence: 'Part of your Data Science degree', explicit: true },

  ],



  source: 'demo',

  extractedAt: new Date('2026-09-01').toISOString(),

  aiAssisted: false,

};



/** The demo plan the spec describes: AI Engineer, 12 months, 10 hrs/week. */

export const DEMO_PLAN: CareerPlan = {

  careerGoalId: 'ai-engineer',

  timelineMonths: 12,

  weeklyHours: 10,

};



/**

 * Attach per-item skill evidence, mirroring what the extraction pipeline does

 * for an uploaded profile so the demo exercises identical code paths.

 */

export function demoProfile(): StudentProfile {

  return {

    ...DEMO_PROFILE,

    projects: DEMO_PROFILE.projects.map((p) => ({

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

    experience: DEMO_PROFILE.experience.map((e) => ({

      ...e,

      skills: e.technologies.map((skillId) => ({

        skillId,

        rawName: skillId,

        confidence: 0.9,

        source: e.kind,

        evidence: `Found in your internship at ${e.organization}`,

        explicit: true,

      })),

    })),

  };

}

