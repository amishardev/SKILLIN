/**
 * Portfolio project templates.
 *
 * Projects are matched to a learner by the skills they *demonstrate*, and are
 * gated by their own prerequisites, a project is only suggested once the
 * roadmap has actually taught the skills needed to build it.
 */

export type ProjectDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type PortfolioValue = 'low' | 'medium' | 'high' | 'very-high';

export interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  difficulty: ProjectDifficulty;
  estimatedHours: number;
  /** Canonical skills this project proves you can apply. */
  skills: string[];
  tools: string[];
  /** Canonical skills you must already have to attempt it. */
  prerequisites: string[];
  careerTags: string[];
  portfolioValue: PortfolioValue;
  /** What a reviewer should be able to see when it is finished. */
  outcome: string;
}

export const PROJECTS: ProjectTemplate[] = [
  // ─── Data / ML foundations ───
  {
    id: 'proj-eda-report',
    title: 'Exploratory Data Analysis Report',
    description:
      'Take a messy public dataset, clean it, and produce a written analysis with charts that answer three specific questions.',
    difficulty: 'beginner', estimatedHours: 15,
    skills: ['data-analysis', 'pandas', 'data-visualization'],
    tools: ['Python', 'pandas', 'Matplotlib'],
    prerequisites: ['python'],
    careerTags: ['data-analyst', 'data-scientist'],
    portfolioValue: 'medium',
    outcome: 'A notebook and short write-up that a non-technical reader can follow to a conclusion.',
  },
  {
    id: 'proj-sql-dashboard',
    title: 'Business Metrics Dashboard',
    description:
      'Model a relational dataset, write the aggregate queries behind five key metrics, and surface them in a dashboard.',
    difficulty: 'beginner', estimatedHours: 20,
    skills: ['sql', 'business-intelligence', 'data-visualization'],
    tools: ['PostgreSQL', 'Metabase'],
    prerequisites: ['sql'],
    careerTags: ['data-analyst', 'data-engineer'],
    portfolioValue: 'medium',
    outcome: 'A live dashboard plus the SQL behind every tile.',
  },
  {
    id: 'proj-ml-classifier',
    title: 'End-to-End Classification Pipeline',
    description:
      'Build a classifier with proper train/validation splitting, class-imbalance handling, and an honest evaluation section that reports where the model fails.',
    difficulty: 'intermediate', estimatedHours: 25,
    skills: ['machine-learning', 'feature-engineering', 'model-evaluation', 'scikit-learn'],
    tools: ['Python', 'scikit-learn', 'pandas'],
    prerequisites: ['python', 'machine-learning'],
    careerTags: ['ml-engineer', 'data-scientist'],
    portfolioValue: 'high',
    outcome: 'A reproducible pipeline with a metrics table and a documented failure analysis.',
  },

  // ─── Deep learning ───
  {
    id: 'proj-image-classifier',
    title: 'Image Classifier from Scratch',
    description:
      'Train a convolutional network on a real image dataset, then improve it with augmentation and transfer learning, measuring each change.',
    difficulty: 'intermediate', estimatedHours: 30,
    skills: ['deep-learning', 'computer-vision', 'pytorch', 'model-evaluation'],
    tools: ['PyTorch', 'torchvision'],
    prerequisites: ['python', 'deep-learning'],
    careerTags: ['computer-vision-engineer', 'ml-engineer', 'ai-engineer'],
    portfolioValue: 'high',
    outcome: 'A trained model with an ablation table showing what actually moved accuracy.',
  },
  {
    id: 'proj-transformer-classifier',
    title: 'Transformer Text Classifier',
    description:
      'Fine-tune a pretrained transformer for a text classification task and compare it against a TF-IDF baseline.',
    difficulty: 'advanced', estimatedHours: 30,
    skills: ['transformers', 'nlp', 'huggingface', 'fine-tuning', 'model-evaluation'],
    tools: ['Hugging Face Transformers', 'PyTorch'],
    prerequisites: ['deep-learning', 'nlp'],
    careerTags: ['nlp-engineer', 'generative-ai-engineer', 'ml-engineer'],
    portfolioValue: 'very-high',
    outcome: 'A fine-tuned model card with baseline comparison and error analysis.',
  },
  {
    id: 'proj-nn-from-scratch',
    title: 'Neural Network Without a Framework',
    description:
      'Implement forward and backward passes in NumPy alone, then verify your gradients numerically.',
    difficulty: 'intermediate', estimatedHours: 18,
    skills: ['deep-learning', 'numpy', 'linear-algebra'],
    tools: ['Python', 'NumPy'],
    prerequisites: ['python', 'linear-algebra'],
    careerTags: ['ml-engineer', 'ai-researcher'],
    portfolioValue: 'high',
    outcome: 'A working network plus a gradient-check notebook proving the maths is right.',
  },

  // ─── Generative AI ───
  {
    id: 'proj-rag-assistant',
    title: 'RAG Assistant Over Your Own Documents',
    description:
      'Build retrieval-augmented generation end to end: chunking, embedding, vector search, prompt assembly, and an evaluation set that catches hallucination.',
    difficulty: 'advanced', estimatedHours: 35,
    skills: ['rag', 'vector-db', 'llm', 'prompt-engineering', 'model-evaluation'],
    tools: ['Python', 'Chroma', 'LangChain'],
    prerequisites: ['python', 'llm'],
    careerTags: ['generative-ai-engineer', 'ai-engineer'],
    portfolioValue: 'very-high',
    outcome: 'A deployed assistant with a documented retrieval-quality evaluation.',
  },
  {
    id: 'proj-llm-api',
    title: 'Production LLM API',
    description:
      'Wrap a model behind a typed API with streaming, rate limiting, caching, cost tracking and graceful failure.',
    difficulty: 'advanced', estimatedHours: 30,
    skills: ['rest-api', 'llm', 'mlops', 'testing'],
    tools: ['FastAPI', 'Docker', 'Redis'],
    prerequisites: ['python', 'rest-api'],
    careerTags: ['ai-engineer', 'generative-ai-engineer', 'mlops-engineer'],
    portfolioValue: 'very-high',
    outcome: 'A containerised service with load-test numbers and a cost-per-request figure.',
  },
  {
    id: 'proj-agent',
    title: 'Tool-Using AI Agent',
    description:
      'Build an agent that plans, calls real tools, recovers from tool failures, and is measured against a fixed task set.',
    difficulty: 'advanced', estimatedHours: 30,
    skills: ['ai-agents', 'llm', 'prompt-engineering', 'model-evaluation'],
    tools: ['Python', 'LangGraph'],
    prerequisites: ['python', 'llm'],
    careerTags: ['generative-ai-engineer', 'ai-engineer'],
    portfolioValue: 'very-high',
    outcome: 'An agent with a task-success scoreboard, not just a demo video.',
  },

  // ─── MLOps ───
  {
    id: 'proj-ml-deploy',
    title: 'Deployed Model with Monitoring',
    description:
      'Ship a model behind an API with CI/CD, automated tests, request logging and a drift alert.',
    difficulty: 'advanced', estimatedHours: 35,
    skills: ['mlops', 'docker', 'ci-cd', 'observability', 'testing'],
    tools: ['Docker', 'GitHub Actions', 'Prometheus'],
    prerequisites: ['python', 'docker'],
    careerTags: ['mlops-engineer', 'ml-engineer', 'ai-engineer'],
    portfolioValue: 'very-high',
    outcome: 'A running service with a dashboard and a documented rollback procedure.',
  },
  {
    id: 'proj-data-pipeline',
    title: 'Scheduled Data Pipeline',
    description:
      'Build an orchestrated pipeline that ingests, validates and transforms data on a schedule, with tests and alerting on failure.',
    difficulty: 'intermediate', estimatedHours: 28,
    skills: ['data-engineering', 'testing', 'sql'],
    tools: ['Airflow', 'dbt', 'PostgreSQL'],
    prerequisites: ['python', 'sql'],
    careerTags: ['data-engineer', 'mlops-engineer'],
    portfolioValue: 'high',
    outcome: 'A DAG that has survived a week of scheduled runs, with data quality tests.',
  },

  // ─── Web ───
  {
    id: 'proj-responsive-site',
    title: 'Accessible Responsive Site',
    description:
      'Build a multi-page site that works at every breakpoint and passes an accessibility audit with keyboard-only navigation.',
    difficulty: 'beginner', estimatedHours: 20,
    skills: ['html', 'css', 'accessibility'],
    tools: ['HTML', 'CSS'],
    prerequisites: [],
    careerTags: ['frontend-developer', 'ux-engineer'],
    portfolioValue: 'medium',
    outcome: 'A deployed site with a Lighthouse accessibility score you can defend.',
  },
  {
    id: 'proj-fullstack-app',
    title: 'Full-Stack CRUD Application',
    description:
      'Design the schema, build the API, build the interface, add authentication, and deploy it with tests covering the critical paths.',
    difficulty: 'intermediate', estimatedHours: 45,
    skills: ['react', 'nodejs', 'rest-api', 'sql', 'testing'],
    tools: ['Next.js', 'PostgreSQL'],
    prerequisites: ['javascript'],
    careerTags: ['fullstack-developer', 'frontend-developer', 'backend-developer'],
    portfolioValue: 'very-high',
    outcome: 'A deployed app with real auth, real data and a test suite that runs in CI.',
  },
  {
    id: 'proj-api-service',
    title: 'Documented Backend Service',
    description:
      'Build a service with a considered data model, input validation, pagination, error contracts and generated API docs.',
    difficulty: 'intermediate', estimatedHours: 30,
    skills: ['rest-api', 'sql', 'dbms', 'testing'],
    tools: ['FastAPI', 'PostgreSQL'],
    prerequisites: ['rest-api'],
    careerTags: ['backend-developer', 'fullstack-developer'],
    portfolioValue: 'high',
    outcome: 'A service with OpenAPI docs and integration tests against a real database.',
  },
  {
    id: 'proj-design-system',
    title: 'Component Library & Design System',
    description:
      'Build a themed, accessible component set documented in Storybook, with visual and interaction tests.',
    difficulty: 'intermediate', estimatedHours: 30,
    skills: ['design-systems', 'react', 'accessibility', 'testing'],
    tools: ['React', 'Storybook'],
    prerequisites: ['react'],
    careerTags: ['ux-engineer', 'frontend-developer'],
    portfolioValue: 'high',
    outcome: 'A published Storybook with tokens, dark mode and documented usage rules.',
  },

  // ─── Infra & security ───
  {
    id: 'proj-k8s-deploy',
    title: 'Containerised Multi-Service Deployment',
    description:
      'Run a multi-service application on Kubernetes with health checks, autoscaling, secrets and a zero-downtime rollout.',
    difficulty: 'advanced', estimatedHours: 35,
    skills: ['kubernetes', 'docker', 'observability', 'ci-cd'],
    tools: ['Kubernetes', 'Helm'],
    prerequisites: ['docker'],
    careerTags: ['devops-engineer', 'cloud-engineer', 'sre'],
    portfolioValue: 'very-high',
    outcome: 'A cluster manifest set plus evidence of a rollout and a rollback.',
  },
  {
    id: 'proj-iac-stack',
    title: 'Infrastructure as Code Stack',
    description:
      'Define a full environment in code, networking, compute, storage, IAM, and prove it can be destroyed and rebuilt.',
    difficulty: 'advanced', estimatedHours: 25,
    skills: ['terraform', 'aws', 'cloud-security'],
    tools: ['Terraform', 'AWS'],
    prerequisites: [],
    careerTags: ['cloud-engineer', 'devops-engineer'],
    portfolioValue: 'high',
    outcome: 'A repository that stands an environment up from nothing in one command.',
  },
  {
    id: 'proj-security-audit',
    title: 'Web Application Security Assessment',
    description:
      'Assess a deliberately vulnerable application you are authorised to test, then write the findings report with severity and remediation.',
    difficulty: 'advanced', estimatedHours: 30,
    skills: ['penetration-testing', 'app-security', 'technical-writing'],
    tools: ['Burp Suite', 'OWASP ZAP'],
    prerequisites: ['computer-networks'],
    careerTags: ['penetration-tester', 'cybersecurity-engineer', 'security-analyst'],
    portfolioValue: 'very-high',
    outcome: 'A professional findings report against a legal practice target such as OWASP Juice Shop.',
  },
  {
    id: 'proj-hardened-deploy',
    title: 'Hardened Service Deployment',
    description:
      'Take a running service and harden it, least-privilege IAM, secrets management, network policy, dependency scanning in CI.',
    difficulty: 'intermediate', estimatedHours: 25,
    skills: ['cloud-security', 'app-security', 'ci-cd'],
    tools: ['Docker', 'GitHub Actions'],
    prerequisites: ['linux'],
    careerTags: ['cybersecurity-engineer', 'devops-engineer', 'cloud-engineer'],
    portfolioValue: 'high',
    outcome: 'A before/after threat model with the mitigations actually implemented.',
  },

  // ─── Hardware & specialised ───
  {
    id: 'proj-iot-sensor',
    title: 'Connected Sensor Node',
    description:
      'Build a battery-powered sensor that reads data, buffers it through network dropouts, and reports to a cloud endpoint.',
    difficulty: 'intermediate', estimatedHours: 30,
    skills: ['iot', 'embedded-systems', 'rest-api'],
    tools: ['ESP32', 'MQTT'],
    prerequisites: ['c'],
    careerTags: ['iot-engineer', 'embedded-engineer'],
    portfolioValue: 'high',
    outcome: 'A device with a measured battery life figure and a week of uptime data.',
  },
  {
    id: 'proj-robot-nav',
    title: 'Autonomous Navigation in Simulation',
    description:
      'Implement perception, mapping and path planning for a simulated robot, then measure success across randomised environments.',
    difficulty: 'advanced', estimatedHours: 40,
    skills: ['robotics', 'control-systems', 'computer-vision'],
    tools: ['ROS 2', 'Gazebo'],
    prerequisites: ['python', 'linux'],
    careerTags: ['robotics-engineer'],
    portfolioValue: 'very-high',
    outcome: 'A simulation run with a success rate across many randomised trials.',
  },
  {
    id: 'proj-smart-contract',
    title: 'Audited Smart Contract',
    description:
      'Write a contract, achieve full test coverage, run static analysis, and document every issue found and fixed.',
    difficulty: 'advanced', estimatedHours: 30,
    skills: ['smart-contracts', 'solidity', 'testing', 'app-security'],
    tools: ['Hardhat', 'Slither'],
    prerequisites: ['javascript'],
    careerTags: ['blockchain-developer'],
    portfolioValue: 'very-high',
    outcome: 'A deployed testnet contract with a self-audit report and full coverage.',
  },
  {
    id: 'proj-mobile-app',
    title: 'Offline-Capable Mobile App',
    description:
      'Build an app that stays usable without a connection, syncs when it returns, and resolves conflicts sensibly.',
    difficulty: 'intermediate', estimatedHours: 35,
    skills: ['react-native', 'rest-api', 'testing'],
    tools: ['React Native', 'Expo'],
    prerequisites: ['react'],
    careerTags: ['mobile-developer'],
    portfolioValue: 'high',
    outcome: 'An installable build that demonstrably survives airplane mode.',
  },
  {
    id: 'proj-game-prototype',
    title: 'Playable Game Prototype',
    description:
      'Ship a small but complete game loop, mechanics, state, UI, audio and a build people can actually play.',
    difficulty: 'intermediate', estimatedHours: 40,
    skills: ['game-dev'],
    tools: ['Godot'],
    prerequisites: [],
    careerTags: ['game-developer'],
    portfolioValue: 'high',
    outcome: 'A playable web build with a short design post-mortem.',
  },

  // ─── Product, design, research ───
  {
    id: 'proj-product-teardown',
    title: 'Product Teardown & Roadmap',
    description:
      'Analyse a real product, identify its weakest flow with evidence, and propose a prioritised roadmap with success metrics.',
    difficulty: 'beginner', estimatedHours: 15,
    skills: ['product-management', 'product-analytics', 'technical-writing'],
    tools: ['Figma', 'Notion'],
    prerequisites: [],
    careerTags: ['product-manager', 'product-designer'],
    portfolioValue: 'medium',
    outcome: 'A written teardown with prioritisation reasoning and measurable success criteria.',
  },
  {
    id: 'proj-ux-case-study',
    title: 'End-to-End UX Case Study',
    description:
      'Run research, synthesise findings, design a solution, test it with real users, and show what changed as a result.',
    difficulty: 'intermediate', estimatedHours: 35,
    skills: ['ux-research', 'ui-design', 'accessibility'],
    tools: ['Figma'],
    prerequisites: [],
    careerTags: ['product-designer', 'ux-engineer'],
    portfolioValue: 'very-high',
    outcome: 'A case study showing the design before and after user testing, with reasoning.',
  },
  {
    id: 'proj-paper-reproduction',
    title: 'Paper Reproduction',
    description:
      'Reproduce a published result from scratch, document every discrepancy, and state honestly what you could not match.',
    difficulty: 'advanced', estimatedHours: 45,
    skills: ['research-methods', 'deep-learning', 'model-evaluation'],
    tools: ['PyTorch'],
    prerequisites: ['machine-learning'],
    careerTags: ['ai-researcher', 'ml-engineer'],
    portfolioValue: 'very-high',
    outcome: 'A repository with results next to the paper’s, and a candid gap analysis.',
  },
  {
    id: 'proj-system-rebuild',
    title: 'Rebuild a Core System Primitive',
    description:
      'Implement something you normally import, a hash map, an LRU cache, a tiny HTTP server or a key-value store, with tests and a benchmark against the standard library.',
    difficulty: 'intermediate', estimatedHours: 25,
    skills: ['dsa', 'testing', 'system-design'],
    tools: ['Your primary language'],
    prerequisites: ['dsa'],
    careerTags: ['software-engineer', 'backend-developer'],
    portfolioValue: 'high',
    outcome: 'A tested implementation with benchmark numbers and a written trade-off analysis.',
  },
  {
    id: 'proj-quantum-algorithm',
    title: 'Quantum Algorithm Implementation',
    description:
      'Implement a textbook quantum algorithm, run it on a simulator and on real hardware, and explain the gap between the two.',
    difficulty: 'advanced', estimatedHours: 30,
    skills: ['quantum-computing', 'linear-algebra'],
    tools: ['Qiskit'],
    prerequisites: ['python', 'linear-algebra'],
    careerTags: ['quantum-engineer', 'ai-researcher'],
    portfolioValue: 'very-high',
    outcome: 'Simulator and hardware results side by side, with noise effects explained.',
  },
  {
    id: 'proj-genomics-pipeline',
    title: 'Genomic Analysis Pipeline',
    description:
      'Build a reproducible pipeline over a public genomic dataset, quality control, alignment or variant analysis, with statistics that hold up.',
    difficulty: 'advanced', estimatedHours: 35,
    skills: ['bioinformatics', 'data-analysis', 'statistics'],
    tools: ['Python', 'Biopython'],
    prerequisites: ['python'],
    careerTags: ['bioinformatics-engineer', 'data-scientist'],
    portfolioValue: 'very-high',
    outcome: 'A reproducible pipeline with documented methods and statistical reasoning.',
  },
  {
    id: 'proj-technical-docs',
    title: 'Documentation Set for a Real Project',
    description:
      'Write the getting-started guide, API reference and troubleshooting docs for an open-source project that lacks them.',
    difficulty: 'beginner', estimatedHours: 20,
    skills: ['technical-writing', 'git'],
    tools: ['Markdown', 'Git'],
    prerequisites: [],
    careerTags: ['technical-writer', 'product-manager'],
    portfolioValue: 'medium',
    outcome: 'A merged documentation pull request on a real repository.',
  },
];

export const PROJECT_MAP: ReadonlyMap<string, ProjectTemplate> =
  new Map(PROJECTS.map((p) => [p.id, p]));

export function getProject(id: string): ProjectTemplate | undefined {
  return PROJECT_MAP.get(id);
}
