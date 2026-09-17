/**
 * Learning resource catalog, free-first.
 *
 * Every URL here points at a canonical landing page for a resource that is
 * free to access. Nothing in this file is a guessed deep link: entries use the
 * publisher's stable course/doc root, which is what `scripts/verify-resources.ts`
 * checks. `qualityScore` is *computed* (see lib/resources/quality.ts) rather
 * than hardcoded, so ranking can never collapse into "most popular wins".
 */

export type ResourceType =
  | 'course' | 'playlist' | 'lecture-series' | 'tutorial'
  | 'documentation' | 'book' | 'project' | 'practice';

export type ResourceLevel = 'beginner' | 'intermediate' | 'advanced';

/** Where the entry came from, so the UI can be honest about provenance. */
export type ResourceStatus = 'curated' | 'dataset' | 'live' | 'demo';

/**
 * How much of a resource you can actually reach without paying.
 *
 * `free`, fully open (documentation, NPTEL, freeCodeCamp, open books).
 * `audit`, the material can be viewed free, but a certificate costs.
 * `paid`, gated. Never labelled "Free" anywhere in the UI.
 */
export type ResourceAccess = 'free' | 'audit' | 'paid';

/**
 * Whether `url` opens the resource itself or a search for it.
 *
 * The imported datasets carry no course URLs, so those entries link to the
 * provider's real search endpoint. The UI says "Find on Coursera" rather than
 * implying a direct link we do not have.
 */
export type ResourceLinkKind = 'direct' | 'search';

export interface LearningResource {
  id: string;
  title: string;
  provider: string;
  /** Platform family, used for source-reliability scoring and bias monitoring. */
  source: string;
  url: string;
  description: string;
  type: ResourceType;
  level: ResourceLevel;
  estimatedHours: number;
  /** Canonical skill ids taught. */
  skills: string[];
  /** Canonical skill ids assumed before starting. */
  prerequisites: string[];
  careerTags: string[];
  projectBased: boolean;
  language: string;
  isFree: boolean;
  access: ResourceAccess;
  linkKind: ResourceLinkKind;
  /** 16:9 cover image. Absent entries fall back to a generated cover. */
  thumbnail?: string;
  /** Public rating where the platform publishes one. Absent is not penalised. */
  rating?: number;
  /** Number of ratings behind `rating`, for transparency, never for ranking. */
  ratingCount?: number;
  /** Broad dataset subject, used only to label catalog rows. */
  subject?: string;
  lastVerified: string;
  status: ResourceStatus;
}

/** Defaults keep the catalog readable; only meaningful fields are written out. */
type ResourceInput =
  Omit<LearningResource,
    'language' | 'isFree' | 'access' | 'linkKind' | 'status' | 'lastVerified' | 'projectBased'>
  & Partial<Pick<LearningResource,
    'language' | 'isFree' | 'access' | 'linkKind' | 'status' | 'lastVerified' | 'projectBased'>>;

const VERIFIED_ON = '2026-09-17';

function r(input: ResourceInput): LearningResource {
  return {
    language: 'English',
    isFree: true,
    access: 'free',
    linkKind: 'direct',
    projectBased: false,
    status: 'curated',
    lastVerified: VERIFIED_ON, ...input,
  };
}

export const RESOURCES: LearningResource[] = [
  // ═══════════════════════ FOUNDATIONS: PROGRAMMING ═══════════════════════
  r({
    id: 'py-official-tutorial', title: 'The Python Tutorial', provider: 'Python Software Foundation',
    source: 'Official Docs', url: 'https://docs.python.org/3/tutorial/',
    description: 'The canonical introduction to Python from the language authors: data structures, modules, classes, standard library and errors.',
    type: 'documentation', level: 'beginner', estimatedHours: 25,
    skills: ['python'], prerequisites: [],
    careerTags: ['ml-engineer', 'data-scientist', 'generative-ai-engineer', 'ai-engineer', 'backend-developer'],
  }),
  r({
    id: 'py4e', title: 'Python for Everybody', provider: 'Dr. Charles Severance, University of Michigan',
    source: 'Open Book', url: 'https://www.py4e.com/',
    description: 'Free textbook, lecture videos and auto-graded exercises taking you from zero to data handling, web APIs and databases in Python.',
    type: 'book', level: 'beginner', estimatedHours: 40, projectBased: true, rating: 4.8,
    skills: ['python', 'sql'], prerequisites: [],
    careerTags: ['data-analyst', 'data-scientist', 'software-engineer'],
  }),
  r({
    id: 'fcc-scientific-python', title: 'Scientific Computing with Python', provider: 'freeCodeCamp',
    source: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/scientific-computing-with-python/',
    description: 'Python through practical computing problems, data structures, OOP, regex and five certification projects.',
    type: 'course', level: 'beginner', estimatedHours: 50, projectBased: true,
    skills: ['python', 'dsa'], prerequisites: [],
    careerTags: ['data-scientist', 'software-engineer', 'ml-engineer'],
  }),
  r({
    id: 'kaggle-python', title: 'Kaggle Learn: Python', provider: 'Kaggle',
    source: 'Kaggle', url: 'https://www.kaggle.com/learn/python',
    description: 'Short, hands-on Python track with in-browser exercises, aimed at getting to data work quickly.',
    type: 'course', level: 'beginner', estimatedHours: 5, projectBased: true,
    skills: ['python'], prerequisites: [],
    careerTags: ['data-analyst', 'data-scientist'],
  }),
  r({
    id: 'cs50x', title: 'CS50x: Introduction to Computer Science', provider: 'Harvard University',
    source: 'Harvard', url: 'https://cs50.harvard.edu/x/',
    description: 'Harvard’s flagship CS introduction: C, memory, algorithms, data structures, then Python and web. Rigorous and free to audit.',
    type: 'course', level: 'beginner', estimatedHours: 100, projectBased: true, rating: 4.9,
    skills: ['c', 'python', 'dsa', 'sql'], prerequisites: [],
    careerTags: ['software-engineer', 'backend-developer', 'fullstack-developer'],
  }),
  r({
    id: 'eloquent-js', title: 'Eloquent JavaScript', provider: 'Marijn Haverbeke',
    source: 'Open Book', url: 'https://eloquentjavascript.net/',
    description: 'A complete, free JavaScript book covering the language, the browser and Node, with exercises in every chapter.',
    type: 'book', level: 'beginner', estimatedHours: 45, projectBased: true,
    skills: ['javascript'], prerequisites: [],
    careerTags: ['frontend-developer', 'fullstack-developer'],
  }),
  r({
    id: 'mdn-learn', title: 'MDN Learn Web Development', provider: 'Mozilla',
    source: 'Official Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
    description: 'Mozilla’s structured path through HTML, CSS, JavaScript, accessibility and tooling, the reference the industry actually uses.',
    type: 'documentation', level: 'beginner', estimatedHours: 80,
    skills: ['html', 'css', 'javascript', 'accessibility'], prerequisites: [],
    careerTags: ['frontend-developer', 'fullstack-developer', 'ux-engineer'],
  }),
  r({
    id: 'ts-handbook', title: 'The TypeScript Handbook', provider: 'Microsoft',
    source: 'Official Docs', url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
    description: 'Official guide to the type system: narrowing, generics, modules and the compiler options that matter.',
    type: 'documentation', level: 'intermediate', estimatedHours: 18,
    skills: ['typescript'], prerequisites: ['javascript'],
    careerTags: ['frontend-developer', 'fullstack-developer', 'ux-engineer'],
  }),
  r({
    id: 'rust-book', title: 'The Rust Programming Language', provider: 'Rust Team',
    source: 'Official Docs', url: 'https://doc.rust-lang.org/book/',
    description: 'The official Rust book: ownership, borrowing, lifetimes and fearless concurrency, with worked projects.',
    type: 'book', level: 'intermediate', estimatedHours: 50, projectBased: true,
    skills: ['rust'], prerequisites: ['c'],
    careerTags: ['software-engineer', 'backend-developer'],
  }),
  r({
    id: 'go-tour', title: 'A Tour of Go', provider: 'Google',
    source: 'Official Docs', url: 'https://go.dev/tour/',
    description: 'Interactive introduction to Go: syntax, methods, interfaces and goroutines, runnable in the browser.',
    type: 'tutorial', level: 'beginner', estimatedHours: 10, projectBased: true,
    skills: ['go'], prerequisites: [],
    careerTags: ['backend-developer', 'devops-engineer', 'sre'],
  }),
  r({
    id: 'java-tutorial', title: 'Java Tutorials', provider: 'Oracle',
    source: 'Official Docs', url: 'https://dev.java/learn/',
    description: 'Official Java learning path covering language basics, collections, streams and concurrency.',
    type: 'documentation', level: 'beginner', estimatedHours: 40,
    skills: ['java'], prerequisites: [],
    careerTags: ['software-engineer', 'backend-developer', 'mobile-developer'],
  }),

  // ═══════════════════════ CORE CS ═══════════════════════
  r({
    id: 'nptel-dsa', title: 'Data Structures and Algorithms', provider: 'NPTEL / IIT',
    source: 'NPTEL', url: 'https://nptel.ac.in/courses/106102064',
    description: 'IIT lecture series on core data structures and algorithm design, with proofs and complexity analysis.',
    type: 'lecture-series', level: 'intermediate', estimatedHours: 60,
    skills: ['dsa'], prerequisites: [],
    careerTags: ['software-engineer', 'backend-developer', 'fullstack-developer'],
  }),
  r({
    id: 'mit-6006', title: 'MIT 6.006: Introduction to Algorithms', provider: 'MIT',
    source: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/',
    description: 'Full MIT algorithms course with lecture videos, notes and problem sets, sorting, graphs, dynamic programming.',
    type: 'lecture-series', level: 'advanced', estimatedHours: 80, rating: 4.8,
    skills: ['dsa', 'discrete-math'], prerequisites: ['python'],
    careerTags: ['software-engineer', 'ai-researcher', 'backend-developer'],
  }),
  r({
    id: 'nptel-os', title: 'Operating Systems', provider: 'NPTEL / IIT',
    source: 'NPTEL', url: 'https://nptel.ac.in/courses/106105214',
    description: 'Processes, scheduling, memory management, file systems and concurrency from an IIT lecture series.',
    type: 'lecture-series', level: 'intermediate', estimatedHours: 50,
    skills: ['operating-systems'], prerequisites: ['c'],
    careerTags: ['software-engineer', 'sre', 'embedded-engineer', 'cybersecurity-engineer'],
  }),
  r({
    id: 'nptel-networks', title: 'Computer Networks and Internet Protocol', provider: 'NPTEL / IIT',
    source: 'NPTEL', url: 'https://nptel.ac.in/courses/106105183',
    description: 'Layered networking from physical to application, TCP/IP internals, routing and congestion control.',
    type: 'lecture-series', level: 'intermediate', estimatedHours: 50,
    skills: ['computer-networks'], prerequisites: [],
    careerTags: ['cybersecurity-engineer', 'cloud-engineer', 'sre', 'penetration-tester'],
  }),
  r({
    id: 'nptel-dbms', title: 'Database Management System', provider: 'NPTEL / IIT',
    source: 'NPTEL', url: 'https://nptel.ac.in/courses/106105175',
    description: 'Relational model, normalization, query processing, transactions and concurrency control.',
    type: 'lecture-series', level: 'intermediate', estimatedHours: 45,
    skills: ['dbms', 'sql'], prerequisites: [],
    careerTags: ['backend-developer', 'data-engineer', 'data-analyst'],
  }),
  r({
    id: 'postgres-tutorial', title: 'PostgreSQL Tutorial', provider: 'PostgreSQL Global Development Group',
    source: 'Official Docs', url: 'https://www.postgresql.org/docs/current/tutorial.html',
    description: 'Official hands-on introduction to SQL with PostgreSQL: tables, joins, views, transactions and window functions.',
    type: 'documentation', level: 'beginner', estimatedHours: 12,
    skills: ['sql', 'dbms'], prerequisites: [],
    careerTags: ['data-analyst', 'data-engineer', 'backend-developer'],
  }),
  r({
    id: 'sqlbolt', title: 'SQLBolt: Interactive SQL Lessons', provider: 'SQLBolt',
    source: 'SQLBolt', url: 'https://sqlbolt.com/',
    description: 'Short interactive SQL lessons with an in-browser database, the fastest way from zero to joins and aggregates.',
    type: 'practice', level: 'beginner', estimatedHours: 6, projectBased: true,
    skills: ['sql'], prerequisites: [],
    careerTags: ['data-analyst', 'data-scientist', 'data-engineer'],
  }),
  r({
    id: 'system-design-primer', title: 'The System Design Primer', provider: 'Donne Martin',
    source: 'GitHub', url: 'https://github.com/donnemartin/system-design-primer',
    description: 'Open-source guide to designing large-scale systems: caching, sharding, load balancing, CAP and worked interview problems.',
    type: 'book', level: 'advanced', estimatedHours: 40,
    skills: ['system-design', 'distributed-systems', 'redis'], prerequisites: ['rest-api'],
    careerTags: ['backend-developer', 'software-engineer', 'sre', 'cloud-engineer'],
  }),
  r({
    id: 'mit-6824', title: 'MIT 6.824: Distributed Systems', provider: 'MIT',
    source: 'MIT', url: 'https://pdos.csail.mit.edu/6.824/',
    description: 'Graduate distributed systems course, replication, consensus, Raft and fault tolerance, with labs in Go.',
    type: 'lecture-series', level: 'advanced', estimatedHours: 90, projectBased: true,
    skills: ['distributed-systems', 'system-design', 'go'], prerequisites: ['operating-systems'],
    careerTags: ['sre', 'backend-developer', 'cloud-engineer'],
  }),
  r({
    id: 'git-book', title: 'Pro Git', provider: 'Scott Chacon & Ben Straub',
    source: 'Official Docs', url: 'https://git-scm.com/book/en/v2',
    description: 'The complete Git book: branching models, rebasing, internals and recovery when things go wrong.',
    type: 'book', level: 'beginner', estimatedHours: 15,
    skills: ['git'], prerequisites: [],
    careerTags: ['software-engineer', 'devops-engineer', 'fullstack-developer'],
  }),
  r({
    id: 'missing-semester', title: 'The Missing Semester of Your CS Education', provider: 'MIT',
    source: 'MIT', url: 'https://missing.csail.mit.edu/',
    description: 'Shell, scripting, editors, version control, debugging and security hygiene, the tooling no course teaches.',
    type: 'lecture-series', level: 'beginner', estimatedHours: 12,
    skills: ['linux', 'git', 'testing'], prerequisites: [],
    careerTags: ['software-engineer', 'devops-engineer', 'sre'],
  }),

  // ═══════════════════════ MATH ═══════════════════════
  r({
    id: 'mit-1806', title: 'MIT 18.06: Linear Algebra', provider: 'MIT',
    source: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/',
    description: 'Gilbert Strang’s legendary linear algebra course, the matrix intuition every ML practitioner needs.',
    type: 'lecture-series', level: 'intermediate', estimatedHours: 60, rating: 4.9,
    skills: ['linear-algebra'], prerequisites: [],
    careerTags: ['ml-engineer', 'ai-researcher', 'computer-vision-engineer', 'quantum-engineer'],
  }),
  r({
    id: '3b1b-linalg', title: 'Essence of Linear Algebra', provider: '3Blue1Brown',
    source: 'YouTube', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab',
    description: 'Visual series building geometric intuition for vectors, matrices, determinants and eigenvectors.',
    type: 'playlist', level: 'beginner', estimatedHours: 4, rating: 4.9,
    skills: ['linear-algebra'], prerequisites: [],
    careerTags: ['ml-engineer', 'ai-researcher', 'data-scientist'],
  }),
  r({
    id: '3b1b-calculus', title: 'Essence of Calculus', provider: '3Blue1Brown',
    source: 'YouTube', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr',
    description: 'Derivatives, integrals and the chain rule built from visual first principles, the backbone of backpropagation.',
    type: 'playlist', level: 'beginner', estimatedHours: 4, rating: 4.9,
    skills: ['calculus'], prerequisites: [],
    careerTags: ['ml-engineer', 'ai-researcher'],
  }),
  r({
    id: 'seeing-theory', title: 'Seeing Theory: Probability and Statistics', provider: 'Brown University',
    source: 'Brown', url: 'https://seeing-theory.brown.edu/',
    description: 'Interactive visual introduction to probability, distributions, inference and regression.',
    type: 'tutorial', level: 'beginner', estimatedHours: 6,
    skills: ['probability', 'statistics'], prerequisites: [],
    careerTags: ['data-scientist', 'data-analyst', 'ml-engineer'],
  }),
  r({
    id: 'khan-statistics', title: 'Statistics and Probability', provider: 'Khan Academy',
    source: 'Khan Academy', url: 'https://www.khanacademy.org/math/statistics-probability',
    description: 'Full statistics curriculum: distributions, sampling, confidence intervals, hypothesis testing and regression.',
    type: 'course', level: 'beginner', estimatedHours: 40,
    skills: ['statistics', 'probability'], prerequisites: [],
    careerTags: ['data-analyst', 'data-scientist', 'product-manager'],
  }),

  // ═══════════════════════ MACHINE LEARNING ═══════════════════════
  r({
    id: 'google-ml-crash', title: 'Machine Learning Crash Course', provider: 'Google',
    source: 'Google', url: 'https://developers.google.com/machine-learning/crash-course',
    description: 'Google’s practical ML introduction: loss, gradient descent, generalization, feature crosses and fairness.',
    type: 'course', level: 'beginner', estimatedHours: 20, projectBased: true, rating: 4.6,
    skills: ['machine-learning', 'model-evaluation'], prerequisites: ['python'],
    careerTags: ['ml-engineer', 'data-scientist', 'ai-engineer'],
  }),
  r({
    id: 'sklearn-user-guide', title: 'Scikit-learn User Guide', provider: 'Scikit-learn',
    source: 'Official Docs', url: 'https://scikit-learn.org/stable/user_guide.html',
    description: 'Reference and tutorials for classical ML: pipelines, model selection, cross-validation and every estimator.',
    type: 'documentation', level: 'intermediate', estimatedHours: 25,
    skills: ['scikit-learn', 'machine-learning', 'model-evaluation'], prerequisites: ['python'],
    careerTags: ['ml-engineer', 'data-scientist'],
  }),
  r({
    id: 'kaggle-intro-ml', title: 'Kaggle Learn: Intro to Machine Learning', provider: 'Kaggle',
    source: 'Kaggle', url: 'https://www.kaggle.com/learn/intro-to-machine-learning',
    description: 'Build and validate your first models in the browser, decision trees, random forests and underfitting.',
    type: 'course', level: 'beginner', estimatedHours: 3, projectBased: true,
    skills: ['machine-learning', 'scikit-learn'], prerequisites: ['python'],
    careerTags: ['data-scientist', 'ml-engineer'],
  }),
  r({
    id: 'kaggle-feature-eng', title: 'Kaggle Learn: Feature Engineering', provider: 'Kaggle',
    source: 'Kaggle', url: 'https://www.kaggle.com/learn/feature-engineering',
    description: 'Mutual information, target encoding, clustering features and PCA applied to real competition data.',
    type: 'course', level: 'intermediate', estimatedHours: 5, projectBased: true,
    skills: ['feature-engineering', 'machine-learning'], prerequisites: ['pandas'],
    careerTags: ['data-scientist', 'ml-engineer'],
  }),
  r({
    id: 'nptel-ml', title: 'Introduction to Machine Learning', provider: 'NPTEL / IIT Madras',
    source: 'NPTEL', url: 'https://nptel.ac.in/courses/106106139',
    description: 'Rigorous ML lecture series covering supervised and unsupervised learning with the underlying mathematics.',
    type: 'lecture-series', level: 'intermediate', estimatedHours: 60,
    skills: ['machine-learning', 'statistics'], prerequisites: ['linear-algebra'],
    careerTags: ['ml-engineer', 'data-scientist', 'ai-researcher'],
  }),
  r({
    id: 'statquest-ml', title: 'StatQuest: Machine Learning', provider: 'Josh Starmer',
    source: 'YouTube', url: 'https://www.youtube.com/playlist?list=PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF',
    description: 'Clear, slow explanations of every classical ML algorithm and the statistics underneath it.',
    type: 'playlist', level: 'beginner', estimatedHours: 15, rating: 4.9,
    skills: ['machine-learning', 'statistics', 'model-evaluation'], prerequisites: [],
    careerTags: ['data-scientist', 'ml-engineer', 'data-analyst'],
  }),
  r({
    id: 'made-with-ml', title: 'Made With ML', provider: 'Goku Mohandas',
    source: 'Made With ML', url: 'https://madewithml.com/',
    description: 'Design, develop, deploy and iterate on production ML systems, testing, CI/CD and monitoring included.',
    type: 'course', level: 'advanced', estimatedHours: 45, projectBased: true,
    skills: ['mlops', 'testing', 'ci-cd', 'model-evaluation'],
    prerequisites: ['python', 'machine-learning'],
    careerTags: ['mlops-engineer', 'ml-engineer', 'ai-engineer'],
  }),

  // ═══════════════════════ DEEP LEARNING ═══════════════════════
  r({
    id: 'd2l', title: 'Dive into Deep Learning', provider: 'D2L.ai',
    source: 'Open Book', url: 'https://d2l.ai/',
    description: 'Interactive deep learning book with runnable code in PyTorch, TensorFlow and JAX, maths and implementation side by side.',
    type: 'book', level: 'intermediate', estimatedHours: 80, projectBased: true, rating: 4.7,
    skills: ['deep-learning', 'pytorch', 'computer-vision', 'nlp'],
    prerequisites: ['python', 'linear-algebra'],
    careerTags: ['ml-engineer', 'ai-researcher', 'computer-vision-engineer', 'nlp-engineer'],
  }),
  r({
    id: 'fastai-part1', title: 'Practical Deep Learning for Coders', provider: 'fast.ai',
    source: 'fast.ai', url: 'https://course.fast.ai/',
    description: 'Top-down deep learning: train and deploy working models in lesson one, then descend into the theory.',
    type: 'course', level: 'intermediate', estimatedHours: 70, projectBased: true, rating: 4.8,
    skills: ['deep-learning', 'pytorch', 'computer-vision', 'nlp', 'machine-learning'],
    prerequisites: ['python'],
    careerTags: ['ml-engineer', 'ai-engineer', 'computer-vision-engineer'],
  }),
  r({
    id: 'pytorch-tutorials', title: 'PyTorch Tutorials', provider: 'PyTorch / Linux Foundation',
    source: 'Official Docs', url: 'https://pytorch.org/tutorials/',
    description: 'Official tutorials from tensors and autograd through training loops, distributed training and deployment.',
    type: 'documentation', level: 'intermediate', estimatedHours: 30, projectBased: true,
    skills: ['pytorch', 'deep-learning'], prerequisites: ['python'],
    careerTags: ['ml-engineer', 'ai-researcher', 'nlp-engineer', 'computer-vision-engineer'],
  }),
  r({
    id: 'tf-tutorials', title: 'TensorFlow Tutorials', provider: 'Google',
    source: 'Official Docs', url: 'https://www.tensorflow.org/tutorials',
    description: 'Official Keras and TensorFlow guides covering classification, transfer learning and model serving.',
    type: 'documentation', level: 'intermediate', estimatedHours: 25, projectBased: true,
    skills: ['tensorflow', 'deep-learning'], prerequisites: ['python'],
    careerTags: ['ml-engineer', 'computer-vision-engineer'],
  }),
  r({
    id: 'karpathy-zero-to-hero', title: 'Neural Networks: Zero to Hero', provider: 'Andrej Karpathy',
    source: 'YouTube', url: 'https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ',
    description: 'Build backpropagation, then a language model, then GPT itself, from scratch, line by line, in Python.',
    type: 'playlist', level: 'advanced', estimatedHours: 25, projectBased: true, rating: 5.0,
    skills: ['deep-learning', 'transformers', 'llm', 'pytorch'],
    prerequisites: ['python', 'calculus'],
    careerTags: ['generative-ai-engineer', 'ai-researcher', 'nlp-engineer', 'ml-engineer'],
  }),
  r({
    id: 'cs231n', title: 'CS231n: Deep Learning for Computer Vision', provider: 'Stanford University',
    source: 'Stanford', url: 'https://cs231n.stanford.edu/',
    description: 'Stanford’s computer vision course, CNNs, training dynamics, detection, segmentation and visualization.',
    type: 'lecture-series', level: 'advanced', estimatedHours: 80, projectBased: true, rating: 4.9,
    skills: ['computer-vision', 'deep-learning', 'pytorch'],
    prerequisites: ['python', 'linear-algebra', 'machine-learning'],
    careerTags: ['computer-vision-engineer', 'ai-researcher', 'ml-engineer'],
  }),
  r({
    id: 'opencv-docs', title: 'OpenCV-Python Tutorials', provider: 'OpenCV',
    source: 'Official Docs', url: 'https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html',
    description: 'Classical vision fundamentals: filtering, contours, feature detection, camera calibration and video analysis.',
    type: 'documentation', level: 'intermediate', estimatedHours: 20, projectBased: true,
    skills: ['opencv', 'computer-vision'], prerequisites: ['python'],
    careerTags: ['computer-vision-engineer', 'robotics-engineer'],
  }),

  // ═══════════════════════ NLP / TRANSFORMERS / LLM ═══════════════════════
  r({
    id: 'hf-nlp-course', title: 'Hugging Face NLP Course', provider: 'Hugging Face',
    source: 'Hugging Face', url: 'https://huggingface.co/learn/nlp-course',
    description: 'Transformers end to end: tokenizers, fine-tuning, datasets and sharing models on the Hub.',
    type: 'course', level: 'intermediate', estimatedHours: 30, projectBased: true, rating: 4.8,
    skills: ['transformers', 'nlp', 'huggingface', 'fine-tuning', 'pytorch'],
    prerequisites: ['python', 'deep-learning'],
    careerTags: ['nlp-engineer', 'generative-ai-engineer', 'ai-engineer', 'ml-engineer'],
  }),
  r({
    id: 'hf-llm-course', title: 'Hugging Face LLM Course', provider: 'Hugging Face',
    source: 'Hugging Face', url: 'https://huggingface.co/learn/llm-course',
    description: 'Working with large language models: architectures, fine-tuning strategies, alignment and evaluation.',
    type: 'course', level: 'advanced', estimatedHours: 30, projectBased: true,
    skills: ['llm', 'fine-tuning', 'huggingface', 'model-evaluation'],
    prerequisites: ['deep-learning', 'transformers'],
    careerTags: ['generative-ai-engineer', 'nlp-engineer', 'ai-engineer'],
  }),
  r({
    id: 'hf-agents-course', title: 'Hugging Face AI Agents Course', provider: 'Hugging Face',
    source: 'Hugging Face', url: 'https://huggingface.co/learn/agents-course',
    description: 'Build agentic systems: tool use, planning loops, multi-step reasoning and agent evaluation.',
    type: 'course', level: 'advanced', estimatedHours: 25, projectBased: true,
    skills: ['ai-agents', 'prompt-engineering', 'model-evaluation'],
    prerequisites: ['python', 'llm'],
    careerTags: ['generative-ai-engineer', 'ai-engineer'],
  }),
  r({
    id: 'cs224n', title: 'CS224n: NLP with Deep Learning', provider: 'Stanford University',
    source: 'Stanford', url: 'https://web.stanford.edu/class/cs224n/',
    description: 'Stanford’s NLP course, word vectors, attention, transformers, pretraining and modern LLM methods.',
    type: 'lecture-series', level: 'advanced', estimatedHours: 80, rating: 4.9,
    skills: ['nlp', 'transformers', 'deep-learning', 'llm'],
    prerequisites: ['python', 'machine-learning', 'linear-algebra'],
    careerTags: ['nlp-engineer', 'ai-researcher', 'generative-ai-engineer'],
  }),
  r({
    id: 'illustrated-transformer', title: 'The Illustrated Transformer', provider: 'Jay Alammar',
    source: 'Blog', url: 'https://jalammar.github.io/illustrated-transformer/',
    description: 'The clearest visual explanation of self-attention, multi-head attention and the encoder-decoder stack.',
    type: 'tutorial', level: 'intermediate', estimatedHours: 3,
    skills: ['transformers', 'nlp'], prerequisites: ['deep-learning'],
    careerTags: ['nlp-engineer', 'generative-ai-engineer', 'ai-researcher'],
  }),
  r({
    id: 'langchain-docs', title: 'LangChain Documentation', provider: 'LangChain',
    source: 'Official Docs', url: 'https://python.langchain.com/docs/introduction/',
    description: 'Compose LLM applications: chains, retrievers, memory, tools and agent orchestration.',
    type: 'documentation', level: 'intermediate', estimatedHours: 18, projectBased: true,
    skills: ['langchain', 'rag', 'llm', 'ai-agents'], prerequisites: ['python'],
    careerTags: ['generative-ai-engineer', 'ai-engineer'],
  }),
  r({
    id: 'llamaindex-docs', title: 'LlamaIndex Documentation', provider: 'LlamaIndex',
    source: 'Official Docs', url: 'https://docs.llamaindex.ai/en/stable/',
    description: 'Data framework for RAG: ingestion, chunking, indexing, retrieval strategies and response synthesis.',
    type: 'documentation', level: 'intermediate', estimatedHours: 15, projectBased: true,
    skills: ['rag', 'vector-db', 'llm', 'langchain'], prerequisites: ['python'],
    careerTags: ['generative-ai-engineer', 'ai-engineer'],
  }),
  r({
    id: 'chroma-docs', title: 'Chroma Vector Database Docs', provider: 'Chroma',
    source: 'Official Docs', url: 'https://docs.trychroma.com/',
    description: 'Open-source embedding database: collections, embedding functions, metadata filtering and persistence.',
    type: 'documentation', level: 'intermediate', estimatedHours: 6, projectBased: true,
    skills: ['vector-db', 'rag'], prerequisites: ['python'],
    careerTags: ['generative-ai-engineer', 'ai-engineer'],
  }),
  r({
    id: 'openai-cookbook', title: 'OpenAI Cookbook', provider: 'OpenAI',
    source: 'GitHub', url: 'https://cookbook.openai.com/',
    description: 'Practical recipes for LLM applications: embeddings, function calling, evaluation and retrieval patterns.',
    type: 'tutorial', level: 'intermediate', estimatedHours: 12, projectBased: true,
    skills: ['llm', 'prompt-engineering', 'rag', 'model-evaluation'], prerequisites: ['python'],
    careerTags: ['generative-ai-engineer', 'ai-engineer'],
  }),
  r({
    id: 'anthropic-prompt-docs', title: 'Prompt Engineering Overview', provider: 'Anthropic',
    source: 'Official Docs', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview',
    description: 'Systematic prompt design: clear instructions, examples, chain of thought, and evaluating prompt changes.',
    type: 'documentation', level: 'beginner', estimatedHours: 5,
    skills: ['prompt-engineering', 'llm'], prerequisites: [],
    careerTags: ['generative-ai-engineer', 'ai-engineer', 'product-manager'],
  }),
  r({
    id: 'dair-prompt-guide', title: 'Prompt Engineering Guide', provider: 'DAIR.AI',
    source: 'Prompting Guide', url: 'https://www.promptingguide.ai/',
    description: 'Open reference covering prompting techniques, reasoning strategies, RAG patterns and known failure modes.',
    type: 'documentation', level: 'beginner', estimatedHours: 8,
    skills: ['prompt-engineering', 'llm', 'rag'], prerequisites: [],
    careerTags: ['generative-ai-engineer', 'ai-engineer'],
  }),

  // ═══════════════════════ RL ═══════════════════════
  r({
    id: 'spinning-up', title: 'Spinning Up in Deep RL', provider: 'OpenAI',
    source: 'OpenAI', url: 'https://spinningup.openai.com/en/latest/',
    description: 'Educational RL resource: policy gradients, actor-critic, PPO, with clean reference implementations.',
    type: 'course', level: 'advanced', estimatedHours: 40, projectBased: true,
    skills: ['reinforcement-learning', 'python'],
    prerequisites: ['deep-learning', 'probability'],
    careerTags: ['ai-researcher', 'robotics-engineer', 'ml-engineer'],
  }),
  r({
    id: 'hf-rl-course', title: 'Hugging Face Deep RL Course', provider: 'Hugging Face',
    source: 'Hugging Face', url: 'https://huggingface.co/learn/deep-rl-course',
    description: 'Hands-on deep reinforcement learning · Q-learning through PPO, training agents in real environments.',
    type: 'course', level: 'advanced', estimatedHours: 30, projectBased: true,
    skills: ['reinforcement-learning', 'pytorch'],
    prerequisites: ['python', 'deep-learning'],
    careerTags: ['ai-researcher', 'robotics-engineer'],
  }),

  // ═══════════════════════ DATA ═══════════════════════
  r({
    id: 'pandas-docs', title: 'Pandas User Guide', provider: 'pandas',
    source: 'Official Docs', url: 'https://pandas.pydata.org/docs/user_guide/index.html',
    description: 'Official guide to indexing, reshaping, merging, groupby, time series and performance in pandas.',
    type: 'documentation', level: 'beginner', estimatedHours: 15,
    skills: ['pandas', 'data-analysis'], prerequisites: ['python'],
    careerTags: ['data-analyst', 'data-scientist', 'ml-engineer'],
  }),
  r({
    id: 'numpy-absolute-basics', title: 'NumPy: The Absolute Basics for Beginners', provider: 'NumPy',
    source: 'Official Docs', url: 'https://numpy.org/doc/stable/user/absolute_beginners.html',
    description: 'Arrays, broadcasting, indexing and vectorized computation, the substrate under every Python ML library.',
    type: 'documentation', level: 'beginner', estimatedHours: 6,
    skills: ['numpy'], prerequisites: ['python'],
    careerTags: ['data-scientist', 'ml-engineer'],
  }),
  r({
    id: 'kaggle-pandas', title: 'Kaggle Learn: Pandas', provider: 'Kaggle',
    source: 'Kaggle', url: 'https://www.kaggle.com/learn/pandas',
    description: 'Hands-on data manipulation: indexing, grouping, renaming, combining and handling missing values.',
    type: 'course', level: 'beginner', estimatedHours: 4, projectBased: true,
    skills: ['pandas', 'data-analysis'], prerequisites: ['python'],
    careerTags: ['data-analyst', 'data-scientist'],
  }),
  r({
    id: 'kaggle-data-viz', title: 'Kaggle Learn: Data Visualization', provider: 'Kaggle',
    source: 'Kaggle', url: 'https://www.kaggle.com/learn/data-visualization',
    description: 'Choose and build the right chart, line, bar, scatter, distribution, using Seaborn on real datasets.',
    type: 'course', level: 'beginner', estimatedHours: 4, projectBased: true,
    skills: ['data-visualization', 'data-analysis'], prerequisites: ['python'],
    careerTags: ['data-analyst', 'data-scientist', 'product-manager'],
  }),
  r({
    id: 'kaggle-sql', title: 'Kaggle Learn: Intro to SQL', provider: 'Kaggle',
    source: 'Kaggle', url: 'https://www.kaggle.com/learn/intro-to-sql',
    description: 'SELECT, GROUP BY, JOIN and window functions practised against real BigQuery datasets.',
    type: 'course', level: 'beginner', estimatedHours: 4, projectBased: true,
    skills: ['sql', 'data-analysis'], prerequisites: [],
    careerTags: ['data-analyst', 'data-engineer', 'data-scientist'],
  }),
  r({
    id: 'spark-docs', title: 'Apache Spark Programming Guide', provider: 'Apache Software Foundation',
    source: 'Official Docs', url: 'https://spark.apache.org/docs/latest/sql-programming-guide.html',
    description: 'Distributed data processing with Spark SQL and DataFrames, partitioning, joins and tuning.',
    type: 'documentation', level: 'advanced', estimatedHours: 20,
    skills: ['big-data', 'data-engineering'], prerequisites: ['python', 'sql'],
    careerTags: ['data-engineer', 'mlops-engineer'],
  }),
  r({
    id: 'dbt-fundamentals', title: 'dbt Documentation', provider: 'dbt Labs',
    source: 'Official Docs', url: 'https://docs.getdbt.com/docs/introduction',
    description: 'Analytics engineering with dbt: models, tests, snapshots and building a documented warehouse layer.',
    type: 'documentation', level: 'intermediate', estimatedHours: 12, projectBased: true,
    skills: ['data-engineering', 'data-warehousing', 'testing'], prerequisites: ['sql'],
    careerTags: ['data-engineer', 'data-analyst'],
  }),
  r({
    id: 'airflow-docs', title: 'Apache Airflow Tutorial', provider: 'Apache Software Foundation',
    source: 'Official Docs', url: 'https://airflow.apache.org/docs/apache-airflow/stable/tutorial/index.html',
    description: 'Author, schedule and monitor data pipelines as code · DAGs, operators, sensors and backfills.',
    type: 'documentation', level: 'intermediate', estimatedHours: 12, projectBased: true,
    skills: ['data-engineering'], prerequisites: ['python'],
    careerTags: ['data-engineer', 'mlops-engineer'],
  }),

  // ═══════════════════════ WEB ═══════════════════════
  r({
    id: 'fcc-responsive', title: 'Responsive Web Design Certification', provider: 'freeCodeCamp',
    source: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
    description: 'Build real responsive layouts with HTML and CSS, flexbox, grid, accessibility and five certification projects.',
    type: 'course', level: 'beginner', estimatedHours: 60, projectBased: true, rating: 4.7,
    skills: ['html', 'css', 'accessibility'], prerequisites: [],
    careerTags: ['frontend-developer', 'fullstack-developer', 'ux-engineer'],
  }),
  r({
    id: 'fcc-js-algos', title: 'JavaScript Algorithms and Data Structures', provider: 'freeCodeCamp',
    source: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/',
    description: 'JavaScript fundamentals through to algorithms, OOP and functional programming, with certification projects.',
    type: 'course', level: 'beginner', estimatedHours: 80, projectBased: true, rating: 4.7,
    skills: ['javascript', 'dsa'], prerequisites: [],
    careerTags: ['frontend-developer', 'fullstack-developer'],
  }),
  r({
    id: 'fcc-backend', title: 'Back End Development and APIs', provider: 'freeCodeCamp',
    source: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/',
    description: 'Node, Express, MongoDB and REST API design, finishing with five deployed microservice projects.',
    type: 'course', level: 'intermediate', estimatedHours: 60, projectBased: true,
    skills: ['nodejs', 'rest-api', 'nosql'], prerequisites: ['javascript'],
    careerTags: ['backend-developer', 'fullstack-developer'],
  }),
  r({
    id: 'react-learn', title: 'React: Learn', provider: 'Meta',
    source: 'Official Docs', url: 'https://react.dev/learn',
    description: 'The official React tutorial and guide: components, state, effects, refs and the rules of hooks.',
    type: 'documentation', level: 'intermediate', estimatedHours: 20, projectBased: true, rating: 4.8,
    skills: ['react'], prerequisites: ['javascript'],
    careerTags: ['frontend-developer', 'fullstack-developer', 'ux-engineer'],
  }),
  r({
    id: 'nextjs-learn', title: 'Next.js Learn Course', provider: 'Vercel',
    source: 'Official Docs', url: 'https://nextjs.org/learn',
    description: 'Build and deploy a full-stack dashboard: routing, data fetching, streaming, auth and accessibility.',
    type: 'course', level: 'intermediate', estimatedHours: 16, projectBased: true,
    skills: ['nextjs', 'typescript', 'rest-api'], prerequisites: ['react'],
    careerTags: ['frontend-developer', 'fullstack-developer'],
  }),
  r({
    id: 'fullstack-open', title: 'Full Stack Open', provider: 'University of Helsinki',
    source: 'University of Helsinki', url: 'https://fullstackopen.com/en/',
    description: 'Deep, project-driven course on React, Node, GraphQL, TypeScript, testing and CI, free and university-graded.',
    type: 'course', level: 'intermediate', estimatedHours: 150, projectBased: true, rating: 4.9,
    skills: ['react', 'nodejs', 'typescript', 'graphql', 'testing', 'ci-cd', 'nosql'],
    prerequisites: ['javascript'],
    careerTags: ['fullstack-developer', 'frontend-developer', 'backend-developer'],
  }),
  r({
    id: 'odin-project', title: 'The Odin Project: Full Stack JavaScript', provider: 'The Odin Project',
    source: 'The Odin Project', url: 'https://www.theodinproject.com/paths/full-stack-javascript',
    description: 'Open-source full curriculum from HTML to deployed full-stack apps, built around a portfolio of real projects.',
    type: 'course', level: 'beginner', estimatedHours: 200, projectBased: true, rating: 4.8,
    skills: ['html', 'css', 'javascript', 'nodejs', 'git', 'testing', 'rest-api'],
    prerequisites: [],
    careerTags: ['fullstack-developer', 'frontend-developer'],
  }),
  r({
    id: 'web-dev-vitals', title: 'web.dev: Performance', provider: 'Google',
    source: 'Google', url: 'https://web.dev/explore/learn-core-web-vitals',
    description: 'Measure and fix real user performance · LCP, INP, CLS, and the loading patterns that move them.',
    type: 'documentation', level: 'intermediate', estimatedHours: 10,
    skills: ['web-performance', 'css'], prerequisites: ['javascript'],
    careerTags: ['frontend-developer', 'ux-engineer'],
  }),
  r({
    id: 'a11y-web-fundamentals', title: 'Web Accessibility Initiative Tutorials', provider: 'W3C',
    source: 'W3C', url: 'https://www.w3.org/WAI/tutorials/',
    description: 'Official W3C guidance on accessible pages, forms, tables, images and navigation patterns.',
    type: 'documentation', level: 'intermediate', estimatedHours: 10,
    skills: ['accessibility', 'css'], prerequisites: ['html'],
    careerTags: ['frontend-developer', 'ux-engineer', 'product-designer'],
  }),
  r({
    id: 'fastapi-docs', title: 'FastAPI Documentation', provider: 'Sebastián Ramírez',
    source: 'Official Docs', url: 'https://fastapi.tiangolo.com/tutorial/',
    description: 'Build typed, validated, documented Python APIs, dependency injection, async, auth and testing.',
    type: 'documentation', level: 'intermediate', estimatedHours: 14, projectBased: true,
    skills: ['python-web', 'rest-api', 'testing'], prerequisites: ['python'],
    careerTags: ['backend-developer', 'ai-engineer', 'mlops-engineer'],
  }),
  r({
    id: 'django-tutorial', title: 'Django Tutorial', provider: 'Django Software Foundation',
    source: 'Official Docs', url: 'https://docs.djangoproject.com/en/stable/intro/tutorial01/',
    description: 'Build a database-backed web application with Django: models, views, admin, forms and tests.',
    type: 'documentation', level: 'intermediate', estimatedHours: 15, projectBased: true,
    skills: ['python-web', 'sql', 'testing'], prerequisites: ['python'],
    careerTags: ['backend-developer', 'fullstack-developer'],
  }),
  r({
    id: 'graphql-learn', title: 'Introduction to GraphQL', provider: 'GraphQL Foundation',
    source: 'Official Docs', url: 'https://graphql.org/learn/',
    description: 'Schemas, queries, mutations, resolvers and the design tradeoffs against REST.',
    type: 'documentation', level: 'intermediate', estimatedHours: 8,
    skills: ['graphql'], prerequisites: ['rest-api'],
    careerTags: ['backend-developer', 'fullstack-developer'],
  }),

  // ═══════════════════════ MOBILE ═══════════════════════
  r({
    id: 'react-native-docs', title: 'React Native Documentation', provider: 'Meta',
    source: 'Official Docs', url: 'https://reactnative.dev/docs/getting-started',
    description: 'Cross-platform mobile development with React, components, navigation, native modules and performance.',
    type: 'documentation', level: 'intermediate', estimatedHours: 20, projectBased: true,
    skills: ['react-native', 'javascript'], prerequisites: ['react'],
    careerTags: ['mobile-developer', 'fullstack-developer'],
  }),
  r({
    id: 'flutter-docs', title: 'Flutter Documentation', provider: 'Google',
    source: 'Official Docs', url: 'https://docs.flutter.dev/get-started/learn-flutter',
    description: 'Widgets, state management, layout and platform channels for building Flutter apps.',
    type: 'documentation', level: 'intermediate', estimatedHours: 25, projectBased: true,
    skills: ['flutter'], prerequisites: [],
    careerTags: ['mobile-developer'],
  }),
  r({
    id: 'android-basics', title: 'Android Basics with Compose', provider: 'Google',
    source: 'Google', url: 'https://developer.android.com/courses/android-basics-compose/course',
    description: 'Official Android course using Jetpack Compose, layouts, navigation, data persistence and architecture.',
    type: 'course', level: 'beginner', estimatedHours: 60, projectBased: true,
    skills: ['android', 'kotlin'], prerequisites: [],
    careerTags: ['mobile-developer'],
  }),

  // ═══════════════════════ DEVOPS / CLOUD ═══════════════════════
  r({
    id: 'docker-get-started', title: 'Docker Get Started Guide', provider: 'Docker',
    source: 'Official Docs', url: 'https://docs.docker.com/get-started/',
    description: 'Images, containers, volumes, networking and Compose, the official hands-on introduction.',
    type: 'documentation', level: 'beginner', estimatedHours: 10, projectBased: true,
    skills: ['docker', 'linux'], prerequisites: [],
    careerTags: ['devops-engineer', 'mlops-engineer', 'backend-developer', 'cloud-engineer'],
  }),
  r({
    id: 'k8s-tutorials', title: 'Kubernetes Tutorials', provider: 'Cloud Native Computing Foundation',
    source: 'Official Docs', url: 'https://kubernetes.io/docs/tutorials/',
    description: 'Official Kubernetes walkthroughs: pods, deployments, services, config, secrets and stateful workloads.',
    type: 'documentation', level: 'advanced', estimatedHours: 25, projectBased: true,
    skills: ['kubernetes'], prerequisites: ['docker'],
    careerTags: ['devops-engineer', 'sre', 'cloud-engineer', 'mlops-engineer'],
  }),
  r({
    id: 'gh-actions-docs', title: 'GitHub Actions Documentation', provider: 'GitHub',
    source: 'Official Docs', url: 'https://docs.github.com/en/actions',
    description: 'Build CI/CD pipelines: workflows, matrix builds, caching, environments and deployment gates.',
    type: 'documentation', level: 'intermediate', estimatedHours: 10, projectBased: true,
    skills: ['ci-cd', 'testing'], prerequisites: ['git'],
    careerTags: ['devops-engineer', 'mlops-engineer', 'sre'],
  }),
  r({
    id: 'terraform-tutorials', title: 'Terraform Tutorials', provider: 'HashiCorp',
    source: 'HashiCorp', url: 'https://developer.hashicorp.com/terraform/tutorials',
    description: 'Infrastructure as code: providers, state, modules, workspaces and safe production workflows.',
    type: 'tutorial', level: 'intermediate', estimatedHours: 15, projectBased: true,
    skills: ['terraform', 'aws', 'ci-cd'], prerequisites: [],
    careerTags: ['devops-engineer', 'cloud-engineer', 'sre'],
  }),
  r({
    id: 'sre-book', title: 'Google SRE Book', provider: 'Google',
    source: 'Google', url: 'https://sre.google/sre-book/table-of-contents/',
    description: 'The book that defined SRE, SLOs, error budgets, toil, on-call, and postmortems without blame.',
    type: 'book', level: 'advanced', estimatedHours: 30,
    skills: ['sre', 'observability', 'distributed-systems'], prerequisites: ['linux'],
    careerTags: ['sre', 'devops-engineer', 'cloud-engineer'],
  }),
  r({
    id: 'prometheus-docs', title: 'Prometheus Documentation', provider: 'Cloud Native Computing Foundation',
    source: 'Official Docs', url: 'https://prometheus.io/docs/introduction/overview/',
    description: 'Metrics collection and alerting: exporters, PromQL, recording rules and alertmanager.',
    type: 'documentation', level: 'intermediate', estimatedHours: 10,
    skills: ['observability', 'sre'], prerequisites: ['linux'],
    careerTags: ['sre', 'devops-engineer'],
  }),
  r({
    id: 'linux-journey', title: 'Linux Journey', provider: 'Linux Journey',
    source: 'Linux Journey', url: 'https://linuxjourney.com/',
    description: 'Structured, free path through the Linux command line, permissions, processes, networking and kernel basics.',
    type: 'course', level: 'beginner', estimatedHours: 15,
    skills: ['linux'], prerequisites: [],
    careerTags: ['devops-engineer', 'sre', 'cybersecurity-engineer', 'penetration-tester'],
  }),
  r({
    id: 'aws-skill-builder', title: 'AWS Cloud Practitioner Essentials', provider: 'Amazon Web Services',
    source: 'AWS', url: 'https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/',
    description: 'Free foundational AWS course: compute, storage, networking, security, pricing and the shared responsibility model.',
    type: 'course', level: 'beginner', estimatedHours: 10,
    skills: ['aws', 'cloud-security'], prerequisites: [],
    careerTags: ['cloud-engineer', 'devops-engineer'],
  }),
  r({
    id: 'gcp-cloud-docs', title: 'Google Cloud Architecture Framework', provider: 'Google',
    source: 'Official Docs', url: 'https://cloud.google.com/architecture/framework',
    description: 'Design principles for reliability, security, cost and performance on Google Cloud.',
    type: 'documentation', level: 'advanced', estimatedHours: 12,
    skills: ['gcp', 'system-design', 'cloud-security'], prerequisites: [],
    careerTags: ['cloud-engineer', 'devops-engineer'],
  }),

  // ═══════════════════════ SECURITY ═══════════════════════
  r({
    id: 'owasp-top-ten', title: 'OWASP Top 10', provider: 'OWASP Foundation',
    source: 'OWASP', url: 'https://owasp.org/www-project-top-ten/',
    description: 'The canonical list of web application security risks, with causes, examples and prevention for each.',
    type: 'documentation', level: 'intermediate', estimatedHours: 8,
    skills: ['app-security', 'cybersecurity'], prerequisites: [],
    careerTags: ['cybersecurity-engineer', 'penetration-tester', 'backend-developer', 'blockchain-developer'],
  }),
  r({
    id: 'owasp-wstg', title: 'OWASP Web Security Testing Guide', provider: 'OWASP Foundation',
    source: 'OWASP', url: 'https://owasp.org/www-project-web-security-testing-guide/',
    description: 'Comprehensive methodology for testing web applications, reconnaissance through to reporting.',
    type: 'documentation', level: 'advanced', estimatedHours: 30,
    skills: ['penetration-testing', 'app-security', 'cybersecurity'],
    prerequisites: ['computer-networks'],
    careerTags: ['penetration-tester', 'cybersecurity-engineer'],
  }),
  r({
    id: 'portswigger-academy', title: 'Web Security Academy', provider: 'PortSwigger',
    source: 'PortSwigger', url: 'https://portswigger.net/web-security',
    description: 'Free labs covering SQL injection, XSS, SSRF, access control and authentication flaws, hands-on and graded.',
    type: 'practice', level: 'intermediate', estimatedHours: 60, projectBased: true, rating: 4.9,
    skills: ['penetration-testing', 'app-security', 'cybersecurity'],
    prerequisites: ['html', 'computer-networks'],
    careerTags: ['penetration-tester', 'cybersecurity-engineer', 'security-analyst'],
  }),
  r({
    id: 'nptel-crypto', title: 'Cryptography and Network Security', provider: 'NPTEL / IIT',
    source: 'NPTEL', url: 'https://nptel.ac.in/courses/106105162',
    description: 'Symmetric and public-key cryptography, hashing, key exchange and protocol security from first principles.',
    type: 'lecture-series', level: 'advanced', estimatedHours: 50,
    skills: ['cryptography', 'network-security', 'cybersecurity'],
    prerequisites: ['discrete-math'],
    careerTags: ['cybersecurity-engineer', 'blockchain-developer', 'penetration-tester'],
  }),
  r({
    id: 'nist-csf', title: 'NIST Cybersecurity Framework', provider: 'NIST',
    source: 'NIST', url: 'https://www.nist.gov/cyberframework',
    description: 'The standard framework for identifying, protecting, detecting, responding and recovering from cyber risk.',
    type: 'documentation', level: 'intermediate', estimatedHours: 8,
    skills: ['cybersecurity', 'digital-forensics'], prerequisites: [],
    careerTags: ['security-analyst', 'cybersecurity-engineer'],
  }),
  r({
    id: 'overthewire', title: 'OverTheWire: Wargames', provider: 'OverTheWire',
    source: 'OverTheWire', url: 'https://overthewire.org/wargames/',
    description: 'Progressive security wargames teaching Linux, networking and exploitation in a legal practice environment.',
    type: 'practice', level: 'intermediate', estimatedHours: 40, projectBased: true,
    skills: ['penetration-testing', 'cybersecurity'], prerequisites: ['linux'],
    careerTags: ['penetration-tester', 'cybersecurity-engineer'],
  }),

  // ═══════════════════════ HARDWARE / EMBEDDED ═══════════════════════
  r({
    id: 'nptel-embedded', title: 'Introduction to Embedded System Design', provider: 'NPTEL / IIT',
    source: 'NPTEL', url: 'https://nptel.ac.in/courses/108102121',
    description: 'Microcontroller architecture, peripherals, interrupts, RTOS concepts and embedded C practice.',
    type: 'lecture-series', level: 'intermediate', estimatedHours: 50,
    skills: ['embedded-systems', 'computer-architecture'], prerequisites: ['c'],
    careerTags: ['embedded-engineer', 'iot-engineer', 'robotics-engineer'],
  }),
  r({
    id: 'arduino-docs', title: 'Arduino Documentation', provider: 'Arduino',
    source: 'Official Docs', url: 'https://docs.arduino.cc/',
    description: 'Official guides for boards, sensors, communication protocols and building embedded projects.',
    type: 'documentation', level: 'beginner', estimatedHours: 12, projectBased: true,
    skills: ['embedded-systems', 'iot', 'c'], prerequisites: [],
    careerTags: ['embedded-engineer', 'iot-engineer'],
  }),
  r({
    id: 'ros-tutorials', title: 'ROS 2 Tutorials', provider: 'Open Robotics',
    source: 'Official Docs', url: 'https://docs.ros.org/en/rolling/Tutorials.html',
    description: 'Nodes, topics, services, actions, TF and simulation, the standard robotics middleware.',
    type: 'documentation', level: 'advanced', estimatedHours: 30, projectBased: true,
    skills: ['robotics', 'cpp'], prerequisites: ['python', 'linux'],
    careerTags: ['robotics-engineer', 'embedded-engineer'],
  }),
  r({
    id: 'nptel-control', title: 'Control Systems', provider: 'NPTEL / IIT',
    source: 'NPTEL', url: 'https://nptel.ac.in/courses/107106081',
    description: 'Transfer functions, stability, root locus, frequency response and PID controller design.',
    type: 'lecture-series', level: 'advanced', estimatedHours: 45,
    skills: ['control-systems', 'signal-processing'], prerequisites: ['calculus'],
    careerTags: ['robotics-engineer', 'embedded-engineer'],
  }),
  r({
    id: 'nptel-dsp', title: 'Digital Signal Processing', provider: 'NPTEL / IIT',
    source: 'NPTEL', url: 'https://nptel.ac.in/courses/108105055',
    description: 'Sampling, DFT/FFT, filter design and spectral analysis with engineering applications.',
    type: 'lecture-series', level: 'advanced', estimatedHours: 45,
    skills: ['signal-processing'], prerequisites: ['calculus'],
    careerTags: ['embedded-engineer', 'robotics-engineer', 'computer-vision-engineer'],
  }),

  // ═══════════════════════ SPECIALIZED ═══════════════════════
  r({
    id: 'cryptozombies', title: 'CryptoZombies', provider: 'Loom Network',
    source: 'CryptoZombies', url: 'https://cryptozombies.io/',
    description: 'Learn Solidity by building a zombie game, contracts, inheritance, storage, and gas costs.',
    type: 'tutorial', level: 'beginner', estimatedHours: 12, projectBased: true,
    skills: ['solidity', 'smart-contracts', 'blockchain'], prerequisites: ['javascript'],
    careerTags: ['blockchain-developer'],
  }),
  r({
    id: 'solidity-docs', title: 'Solidity Documentation', provider: 'Ethereum Foundation',
    source: 'Official Docs', url: 'https://docs.soliditylang.org/en/latest/',
    description: 'The language reference: types, storage layout, modifiers, events and the security considerations section.',
    type: 'documentation', level: 'intermediate', estimatedHours: 18,
    skills: ['solidity', 'smart-contracts', 'app-security'], prerequisites: ['javascript'],
    careerTags: ['blockchain-developer'],
  }),
  r({
    id: 'ethereum-dev-docs', title: 'Ethereum Developer Documentation', provider: 'Ethereum Foundation',
    source: 'Official Docs', url: 'https://ethereum.org/en/developers/docs/',
    description: 'How Ethereum works and how to build on it, accounts, transactions, EVM, standards and testing.',
    type: 'documentation', level: 'intermediate', estimatedHours: 20,
    skills: ['blockchain', 'smart-contracts', 'cryptography'], prerequisites: [],
    careerTags: ['blockchain-developer'],
  }),
  r({
    id: 'qiskit-textbook', title: 'IBM Quantum Learning', provider: 'IBM',
    source: 'IBM', url: 'https://learning.quantum.ibm.com/',
    description: 'Quantum computing from qubits and gates to algorithms, with runnable Qiskit notebooks.',
    type: 'course', level: 'advanced', estimatedHours: 40, projectBased: true,
    skills: ['quantum-computing'],
    prerequisites: ['linear-algebra', 'python'],
    careerTags: ['quantum-engineer', 'ai-researcher'],
  }),
  r({
    id: 'rosalind', title: 'Rosalind: Bioinformatics Problems', provider: 'Rosalind',
    source: 'Rosalind', url: 'https://rosalind.info/problems/locations/',
    description: 'Learn bioinformatics by solving graded programming problems on real genomic data.',
    type: 'practice', level: 'intermediate', estimatedHours: 40, projectBased: true,
    skills: ['bioinformatics', 'dsa'], prerequisites: ['python'],
    careerTags: ['bioinformatics-engineer'],
  }),
  r({
    id: 'unity-learn', title: 'Unity Learn', provider: 'Unity Technologies',
    source: 'Unity', url: 'https://learn.unity.com/',
    description: 'Official Unity pathways for game programming, physics, animation and building for multiple platforms.',
    type: 'course', level: 'beginner', estimatedHours: 60, projectBased: true,
    skills: ['game-dev', 'csharp', 'ar-vr'], prerequisites: [],
    careerTags: ['game-developer'],
  }),
  r({
    id: 'godot-docs', title: 'Godot Engine Documentation', provider: 'Godot Foundation',
    source: 'Official Docs', url: 'https://docs.godotengine.org/en/stable/getting_started/introduction/index.html',
    description: 'Open-source game engine: scenes, nodes, scripting, physics and exporting your first game.',
    type: 'documentation', level: 'beginner', estimatedHours: 30, projectBased: true,
    skills: ['game-dev'], prerequisites: [],
    careerTags: ['game-developer'],
  }),

  // ═══════════════════════ DESIGN & PRODUCT ═══════════════════════
  r({
    id: 'refactoring-ui-basics', title: 'Material Design Guidelines', provider: 'Google',
    source: 'Official Docs', url: 'https://m3.material.io/',
    description: 'A complete, opinionated design system: colour, type, layout, motion and component anatomy.',
    type: 'documentation', level: 'beginner', estimatedHours: 12,
    skills: ['ui-design', 'design-systems'], prerequisites: [],
    careerTags: ['product-designer', 'ux-engineer', 'frontend-developer'],
  }),
  r({
    id: 'nn-group-ux', title: 'Nielsen Norman Group UX Articles', provider: 'Nielsen Norman Group',
    source: 'NN/g', url: 'https://www.nngroup.com/articles/',
    description: 'Evidence-based usability research, heuristics, testing methods, information architecture and forms.',
    type: 'documentation', level: 'intermediate', estimatedHours: 20,
    skills: ['ux-research', 'ui-design', 'accessibility'], prerequisites: [],
    careerTags: ['product-designer', 'ux-engineer', 'product-manager'],
  }),
  r({
    id: 'storybook-docs', title: 'Storybook Documentation', provider: 'Storybook',
    source: 'Official Docs', url: 'https://storybook.js.org/docs',
    description: 'Build and document component libraries in isolation, with visual and interaction testing.',
    type: 'documentation', level: 'intermediate', estimatedHours: 8, projectBased: true,
    skills: ['design-systems', 'testing'], prerequisites: ['react'],
    careerTags: ['ux-engineer', 'frontend-developer'],
  }),
  r({
    id: 'google-tech-writing', title: 'Google Technical Writing Courses', provider: 'Google',
    source: 'Google', url: 'https://developers.google.com/tech-writing',
    description: 'Free courses on clear technical prose: word choice, sentence structure, document organisation and editing.',
    type: 'course', level: 'beginner', estimatedHours: 8,
    skills: ['technical-writing'], prerequisites: [],
    careerTags: ['technical-writer', 'product-manager', 'software-engineer'],
  }),
  r({
    id: 'write-the-docs', title: 'Write the Docs Documentation Guide', provider: 'Write the Docs',
    source: 'Write the Docs', url: 'https://www.writethedocs.org/guide/',
    description: 'Community guide to documentation practice, style, structure, docs-as-code and information architecture.',
    type: 'documentation', level: 'intermediate', estimatedHours: 10,
    skills: ['technical-writing', 'git'], prerequisites: [],
    careerTags: ['technical-writer'],
  }),
  r({
    id: 'reforge-pm-free', title: 'Product Management Fundamentals', provider: 'Atlassian',
    source: 'Atlassian', url: 'https://www.atlassian.com/agile/product-management',
    description: 'Roadmaps, requirements, prioritisation and working with engineering in an agile team.',
    type: 'documentation', level: 'beginner', estimatedHours: 8,
    skills: ['product-management', 'agile'], prerequisites: [],
    careerTags: ['product-manager'],
  }),
  r({
    id: 'evan-miller-ab', title: 'A/B Testing Statistics and Tools', provider: 'Evan Miller',
    source: 'Evan Miller', url: 'https://www.evanmiller.org/ab-testing/',
    description: 'Focused reference on experiment statistics, sample size, significance, sequential testing, and the classic essay on how not to run an A/B test.',
    type: 'documentation', level: 'advanced', estimatedHours: 3,
    skills: ['product-analytics'], prerequisites: ['statistics'],
    careerTags: ['product-manager', 'data-scientist'],
  }),

  // ═══════════════════════ ENGINEERING PRACTICE ═══════════════════════
  r({
    id: 'testing-library-docs', title: 'Testing Library Documentation', provider: 'Testing Library',
    source: 'Official Docs', url: 'https://testing-library.com/docs/',
    description: 'Test user behaviour rather than implementation details, across React, DOM and other frameworks.',
    type: 'documentation', level: 'intermediate', estimatedHours: 8, projectBased: true,
    skills: ['testing', 'react'], prerequisites: ['javascript'],
    careerTags: ['frontend-developer', 'fullstack-developer', 'ux-engineer'],
  }),
  r({
    id: 'pytest-docs', title: 'pytest Documentation', provider: 'pytest',
    source: 'Official Docs', url: 'https://docs.pytest.org/en/stable/',
    description: 'Fixtures, parametrization, mocking and plugins for testing Python code properly.',
    type: 'documentation', level: 'intermediate', estimatedHours: 8, projectBased: true,
    skills: ['testing'], prerequisites: ['python'],
    careerTags: ['backend-developer', 'ml-engineer', 'mlops-engineer', 'data-engineer'],
  }),
  r({
    id: 'agile-manifesto-guide', title: 'The Scrum Guide', provider: 'Scrum.org',
    source: 'Scrum.org', url: 'https://scrumguides.org/',
    description: 'The authoritative definition of Scrum, roles, events, artifacts and the commitments behind each.',
    type: 'documentation', level: 'beginner', estimatedHours: 3,
    skills: ['agile'], prerequisites: [],
    careerTags: ['product-manager', 'software-engineer'],
  }),
  r({
    id: 'arxiv-ml-guide', title: 'Papers with Code', provider: 'Papers with Code',
    source: 'Papers with Code', url: 'https://paperswithcode.com/',
    description: 'Track state-of-the-art results with linked implementations, the fastest route from paper to reproduction.',
    type: 'practice', level: 'advanced', estimatedHours: 20,
    skills: ['research-methods', 'deep-learning'],
    prerequisites: ['machine-learning'],
    careerTags: ['ai-researcher', 'ml-engineer'],
  }),
  r({
    id: 'distill-pub', title: 'Distill: Machine Learning Research', provider: 'Distill',
    source: 'Distill', url: 'https://distill.pub/',
    description: 'Exceptionally clear interactive explanations of ML concepts, interpretability, attention and visualization.',
    type: 'documentation', level: 'advanced', estimatedHours: 12,
    skills: ['research-methods', 'model-evaluation'],
    prerequisites: ['deep-learning'],
    careerTags: ['ai-researcher'],
  }),
];

export const RESOURCE_MAP: ReadonlyMap<string, LearningResource> =
  new Map(RESOURCES.map((res) => [res.id, res]));

export function getResource(id: string): LearningResource | undefined {
  return RESOURCE_MAP.get(id);
}
