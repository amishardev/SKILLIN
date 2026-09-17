/**
 * Canonical skill taxonomy.
 *
 * This is the single vocabulary shared by student profiles, learning resources,
 * projects and career goals. Nothing anywhere else in the app may invent a skill
 * id, everything normalizes through `normalizeSkill` first, so "ML",
 * "machine-learning" and "Machine Learning" all collapse to `machine-learning`.
 */

export type SkillCategory =
  | 'language' | 'ai' | 'data' | 'math' | 'library' | 'framework'
  | 'web' | 'mobile' | 'devops' | 'cloud' | 'database' | 'security'
  | 'systems' | 'hardware' | 'design' | 'product' | 'concept' | 'tool';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  domain: string;
  aliases: string[];
  /** Skills that should normally be learned before this one. */
  prerequisites?: string[];
}

export const SKILLS: Skill[] = [
  // ─── Programming languages ───
  { id: 'python', name: 'Python', category: 'language', domain: 'general', aliases: ['py', 'python3', 'python 3'] },
  { id: 'javascript', name: 'JavaScript', category: 'language', domain: 'web', aliases: ['js', 'es6', 'ecmascript', 'vanilla js'] },
  { id: 'typescript', name: 'TypeScript', category: 'language', domain: 'web', aliases: ['ts'], prerequisites: ['javascript'] },
  { id: 'java', name: 'Java', category: 'language', domain: 'general', aliases: ['core java', 'java se'] },
  { id: 'cpp', name: 'C++', category: 'language', domain: 'systems', aliases: ['c++', 'cplusplus', 'cpp'] },
  { id: 'c', name: 'C', category: 'language', domain: 'systems', aliases: ['c language', 'ansi c'] },
  { id: 'csharp', name: 'C#', category: 'language', domain: 'general', aliases: ['c#', 'csharp', 'dotnet', '.net'] },
  { id: 'r', name: 'R', category: 'language', domain: 'data', aliases: ['r-lang', 'r language'] },
  { id: 'sql', name: 'SQL', category: 'language', domain: 'data', aliases: ['mysql', 'postgresql', 'postgres', 'sqlite', 'tsql', 'plsql'] },
  { id: 'rust', name: 'Rust', category: 'language', domain: 'systems', aliases: ['rust-lang'] },
  { id: 'go', name: 'Go', category: 'language', domain: 'backend', aliases: ['golang'] },
  { id: 'kotlin', name: 'Kotlin', category: 'language', domain: 'mobile', aliases: [] },
  { id: 'swift', name: 'Swift', category: 'language', domain: 'mobile', aliases: ['swiftui'] },
  { id: 'solidity', name: 'Solidity', category: 'language', domain: 'blockchain', aliases: [] },
  { id: 'verilog', name: 'Verilog / VHDL', category: 'hardware', domain: 'hardware', aliases: ['vhdl', 'systemverilog', 'verilog'] },

  // ─── Math foundations ───
  { id: 'linear-algebra', name: 'Linear Algebra', category: 'math', domain: 'math', aliases: ['matrices', 'matrix algebra', 'vector spaces', 'eigenvectors'] },
  { id: 'calculus', name: 'Calculus', category: 'math', domain: 'math', aliases: ['differential calculus', 'integral calculus', 'multivariable calculus'] },
  { id: 'probability', name: 'Probability', category: 'math', domain: 'math', aliases: ['probability theory', 'bayesian statistics'] },
  { id: 'statistics', name: 'Statistics', category: 'math', domain: 'data', aliases: ['stats', 'statistical analysis', 'inferential statistics'] },
  { id: 'discrete-math', name: 'Discrete Mathematics', category: 'math', domain: 'math', aliases: ['discrete maths', 'combinatorics'] },

  // ─── Core CS ───
  { id: 'dsa', name: 'Data Structures & Algorithms', category: 'concept', domain: 'cs', aliases: ['dsa', 'data structures', 'algorithms', 'ds and algo'] },
  { id: 'operating-systems', name: 'Operating Systems', category: 'systems', domain: 'cs', aliases: ['os', 'process management'] },
  { id: 'computer-networks', name: 'Computer Networks', category: 'systems', domain: 'cs', aliases: ['networking', 'tcp/ip', 'computer networking'] },
  { id: 'dbms', name: 'Database Systems', category: 'database', domain: 'cs', aliases: ['dbms', 'database management', 'rdbms'] },
  { id: 'computer-architecture', name: 'Computer Architecture', category: 'systems', domain: 'cs', aliases: ['coa', 'computer organization'] },
  { id: 'compilers', name: 'Compilers', category: 'systems', domain: 'cs', aliases: ['compiler design'] },
  { id: 'system-design', name: 'System Design', category: 'concept', domain: 'backend', aliases: ['distributed systems design', 'hld', 'scalability'] },
  { id: 'distributed-systems', name: 'Distributed Systems', category: 'systems', domain: 'backend', aliases: ['distributed computing'] },

  // ─── AI / ML ───
  { id: 'machine-learning', name: 'Machine Learning', category: 'ai', domain: 'ai', aliases: ['ml', 'machine-learning', 'supervised learning', 'statistical learning', 'xgboost', 'lightgbm', 'random forest', 'gradient boosting', 'logistic regression', 'svm', 'clustering'] },
  { id: 'deep-learning', name: 'Deep Learning', category: 'ai', domain: 'ai', aliases: ['dl', 'neural networks', 'neural-networks', 'ann', 'cnn'] },
  { id: 'nlp', name: 'Natural Language Processing', category: 'ai', domain: 'ai', aliases: ['nlp', 'natural-language-processing', 'text mining', 'text analytics', 'nltk', 'spacy', 'tf-idf', 'tokenization', 'sentiment analysis', 'named entity recognition'] },
  { id: 'computer-vision', name: 'Computer Vision', category: 'ai', domain: 'ai', aliases: ['cv', 'image recognition', 'image processing'] },
  { id: 'transformers', name: 'Transformers', category: 'ai', domain: 'ai', aliases: ['transformer', 'attention mechanism', 'self-attention', 'bert', 'transformer architecture'] },
  { id: 'llm', name: 'Large Language Models', category: 'ai', domain: 'ai', aliases: ['llm', 'llms', 'gpt', 'language models'] },
  { id: 'generative-ai', name: 'Generative AI', category: 'ai', domain: 'ai', aliases: ['genai', 'gen ai', 'generative-ai'] },
  { id: 'rag', name: 'Retrieval-Augmented Generation', category: 'ai', domain: 'ai', aliases: ['rag', 'retrieval augmented generation', 'retrieval-augmented'] },
  { id: 'prompt-engineering', name: 'Prompt Engineering', category: 'ai', domain: 'ai', aliases: ['prompting', 'prompt design'] },
  { id: 'fine-tuning', name: 'Model Fine-Tuning', category: 'ai', domain: 'ai', aliases: ['finetuning', 'fine tuning', 'lora', 'peft'] },
  { id: 'model-evaluation', name: 'Model Evaluation', category: 'ai', domain: 'ai', aliases: ['model metrics', 'evaluation metrics', 'model validation', 'cross-validation', 'confusion matrix', 'roc auc'] },
  { id: 'mlops', name: 'MLOps', category: 'ai', domain: 'ai', aliases: ['ml ops', 'ml operations', 'model deployment'] },
  { id: 'reinforcement-learning', name: 'Reinforcement Learning', category: 'ai', domain: 'ai', aliases: ['rl', 'drl', 'deep reinforcement learning'] },
  { id: 'ai-agents', name: 'AI Agents', category: 'ai', domain: 'ai', aliases: ['agentic ai', 'autonomous agents', 'langgraph'] },
  { id: 'speech-processing', name: 'Speech Processing', category: 'ai', domain: 'ai', aliases: ['speech recognition', 'asr', 'text to speech'] },

  // ─── Data ───
  { id: 'data-analysis', name: 'Data Analysis', category: 'data', domain: 'data', aliases: ['data analytics', 'analytics', 'exploratory data analysis', 'eda'] },
  { id: 'data-visualization', name: 'Data Visualization', category: 'data', domain: 'data', aliases: ['dataviz', 'data viz', 'charting', 'power bi', 'tableau', 'matplotlib', 'seaborn', 'plotly', 'looker'] },
  { id: 'feature-engineering', name: 'Feature Engineering', category: 'data', domain: 'data', aliases: ['feature selection', 'feature extraction', 'smote', 'feature scaling', 'one-hot encoding'] },
  { id: 'data-engineering', name: 'Data Engineering', category: 'data', domain: 'data', aliases: ['etl', 'elt', 'data pipelines'] },
  { id: 'big-data', name: 'Big Data', category: 'data', domain: 'data', aliases: ['spark', 'pyspark', 'hadoop', 'apache spark'] },
  { id: 'data-warehousing', name: 'Data Warehousing', category: 'data', domain: 'data', aliases: ['warehouse', 'snowflake', 'bigquery', 'redshift'] },
  { id: 'business-intelligence', name: 'Business Intelligence', category: 'data', domain: 'data', aliases: ['bi', 'reporting', 'dashboards'] },

  // ─── Libraries ───
  { id: 'pandas', name: 'Pandas', category: 'library', domain: 'data', aliases: ['pandas library', 'pd'] },
  { id: 'numpy', name: 'NumPy', category: 'library', domain: 'data', aliases: ['np', 'numpy array'] },
  { id: 'scikit-learn', name: 'Scikit-learn', category: 'library', domain: 'ai', aliases: ['sklearn', 'scikit learn', 'scikit'] },
  { id: 'tensorflow', name: 'TensorFlow', category: 'library', domain: 'ai', aliases: ['tf', 'keras', 'tensorflow2'] },
  { id: 'pytorch', name: 'PyTorch', category: 'library', domain: 'ai', aliases: ['torch', 'pytorch lightning'] },
  { id: 'huggingface', name: 'Hugging Face', category: 'library', domain: 'ai', aliases: ['transformers library', 'hf', 'huggingface hub'] },
  { id: 'langchain', name: 'LangChain', category: 'library', domain: 'ai', aliases: ['llamaindex', 'llama index'] },
  { id: 'opencv', name: 'OpenCV', category: 'library', domain: 'ai', aliases: ['cv2'] },

  // ─── Web ───
  { id: 'html', name: 'HTML', category: 'web', domain: 'web', aliases: ['html5', 'markup'] },
  { id: 'css', name: 'CSS', category: 'web', domain: 'web', aliases: ['css3', 'styling', 'tailwind', 'sass', 'scss'] },
  { id: 'react', name: 'React', category: 'framework', domain: 'web', aliases: ['reactjs', 'react.js', 'react js'] },
  { id: 'nextjs', name: 'Next.js', category: 'framework', domain: 'web', aliases: ['next js', 'nextjs', 'next'] },
  { id: 'nodejs', name: 'Node.js', category: 'framework', domain: 'web', aliases: ['node', 'node js', 'express', 'expressjs'] },
  { id: 'vue', name: 'Vue', category: 'framework', domain: 'web', aliases: ['vuejs', 'vue.js', 'nuxt'] },
  { id: 'angular', name: 'Angular', category: 'framework', domain: 'web', aliases: ['angularjs'] },
  { id: 'rest-api', name: 'REST APIs', category: 'concept', domain: 'web', aliases: ['rest', 'restful', 'api design', 'web api'] },
  { id: 'graphql', name: 'GraphQL', category: 'concept', domain: 'web', aliases: ['apollo'] },
  { id: 'web-performance', name: 'Web Performance', category: 'concept', domain: 'web', aliases: ['core web vitals', 'performance optimization'] },
  { id: 'accessibility', name: 'Web Accessibility', category: 'concept', domain: 'web', aliases: ['a11y', 'wcag', 'aria'] },
  { id: 'python-web', name: 'Python Web Frameworks', category: 'framework', domain: 'web', aliases: ['django', 'flask', 'fastapi', 'starlette'] },

  // ─── Mobile ───
  { id: 'react-native', name: 'React Native', category: 'framework', domain: 'mobile', aliases: ['rn', 'expo'] },
  { id: 'flutter', name: 'Flutter', category: 'framework', domain: 'mobile', aliases: ['dart'] },
  { id: 'android', name: 'Android Development', category: 'mobile', domain: 'mobile', aliases: ['android studio', 'jetpack compose'] },
  { id: 'ios', name: 'iOS Development', category: 'mobile', domain: 'mobile', aliases: ['xcode', 'uikit'] },

  // ─── DevOps / Cloud ───
  { id: 'git', name: 'Git', category: 'tool', domain: 'general', aliases: ['version control', 'github', 'gitlab', 'git version control'] },
  { id: 'docker', name: 'Docker', category: 'devops', domain: 'devops', aliases: ['containerization', 'containers', 'dockerfile'] },
  { id: 'kubernetes', name: 'Kubernetes', category: 'devops', domain: 'devops', aliases: ['k8s', 'container orchestration'] },
  { id: 'ci-cd', name: 'CI/CD', category: 'devops', domain: 'devops', aliases: ['continuous integration', 'github actions', 'jenkins', 'continuous deployment'] },
  { id: 'terraform', name: 'Infrastructure as Code', category: 'devops', domain: 'devops', aliases: ['terraform', 'iac', 'ansible', 'pulumi'] },
  { id: 'aws', name: 'AWS', category: 'cloud', domain: 'cloud', aliases: ['amazon web services', 'ec2', 's3'] },
  { id: 'gcp', name: 'Google Cloud', category: 'cloud', domain: 'cloud', aliases: ['google cloud platform', 'gcp'] },
  { id: 'azure', name: 'Azure', category: 'cloud', domain: 'cloud', aliases: ['microsoft azure'] },
  { id: 'linux', name: 'Linux', category: 'systems', domain: 'systems', aliases: ['unix', 'bash', 'shell scripting', 'shell'] },
  { id: 'observability', name: 'Observability', category: 'devops', domain: 'devops', aliases: ['monitoring', 'prometheus', 'grafana', 'logging'] },
  { id: 'sre', name: 'Site Reliability Engineering', category: 'devops', domain: 'devops', aliases: ['sre', 'reliability engineering', 'slo'] },

  // ─── Databases ───
  { id: 'nosql', name: 'NoSQL', category: 'database', domain: 'data', aliases: ['mongodb', 'dynamodb', 'cassandra', 'firestore'] },
  { id: 'vector-db', name: 'Vector Databases', category: 'database', domain: 'ai', aliases: ['pinecone', 'chromadb', 'weaviate', 'qdrant', 'faiss', 'vector database'] },
  { id: 'redis', name: 'Caching & Redis', category: 'database', domain: 'backend', aliases: ['redis', 'memcached', 'caching'] },

  // ─── Security ───
  { id: 'cybersecurity', name: 'Cybersecurity', category: 'security', domain: 'security', aliases: ['infosec', 'information security', 'security'] },
  { id: 'network-security', name: 'Network Security', category: 'security', domain: 'security', aliases: ['firewall', 'ids', 'ips'] },
  { id: 'penetration-testing', name: 'Penetration Testing', category: 'security', domain: 'security', aliases: ['pentesting', 'ethical hacking', 'pen testing', 'offensive security'] },
  { id: 'cryptography', name: 'Cryptography', category: 'security', domain: 'security', aliases: ['crypto', 'encryption', 'pki'] },
  { id: 'app-security', name: 'Application Security', category: 'security', domain: 'security', aliases: ['appsec', 'owasp', 'secure coding'] },
  { id: 'digital-forensics', name: 'Digital Forensics', category: 'security', domain: 'security', aliases: ['forensics', 'incident response'] },
  { id: 'cloud-security', name: 'Cloud Security', category: 'security', domain: 'security', aliases: ['iam', 'cspm'] },

  // ─── Hardware / embedded ───
  { id: 'embedded-systems', name: 'Embedded Systems', category: 'hardware', domain: 'hardware', aliases: ['embedded c', 'firmware', 'microcontrollers', 'arduino', 'stm32'] },
  { id: 'iot', name: 'IoT', category: 'hardware', domain: 'hardware', aliases: ['internet of things', 'esp32', 'raspberry pi'] },
  { id: 'robotics', name: 'Robotics', category: 'hardware', domain: 'hardware', aliases: ['ros', 'robot operating system'] },
  { id: 'control-systems', name: 'Control Systems', category: 'hardware', domain: 'hardware', aliases: ['pid control', 'control theory'] },
  { id: 'signal-processing', name: 'Signal Processing', category: 'hardware', domain: 'hardware', aliases: ['dsp', 'digital signal processing'] },

  // ─── Blockchain / emerging ───
  { id: 'blockchain', name: 'Blockchain', category: 'concept', domain: 'blockchain', aliases: ['web3', 'distributed ledger', 'ethereum'] },
  { id: 'smart-contracts', name: 'Smart Contracts', category: 'concept', domain: 'blockchain', aliases: ['defi', 'erc20', 'hardhat'] },
  { id: 'quantum-computing', name: 'Quantum Computing', category: 'concept', domain: 'emerging', aliases: ['qiskit', 'quantum algorithms'] },
  { id: 'bioinformatics', name: 'Bioinformatics', category: 'concept', domain: 'science', aliases: ['computational biology', 'genomics'] },
  { id: 'ar-vr', name: 'AR/VR Development', category: 'concept', domain: 'design', aliases: ['xr', 'unity xr', 'augmented reality', 'virtual reality'] },
  { id: 'game-dev', name: 'Game Development', category: 'concept', domain: 'design', aliases: ['unity', 'unreal engine', 'godot', 'game design'] },

  // ─── Design / product ───
  { id: 'ui-design', name: 'UI Design', category: 'design', domain: 'design', aliases: ['interface design', 'visual design', 'figma'] },
  { id: 'ux-research', name: 'UX Research', category: 'design', domain: 'design', aliases: ['user research', 'usability testing', 'ux'] },
  { id: 'design-systems', name: 'Design Systems', category: 'design', domain: 'design', aliases: ['component library', 'storybook'] },
  { id: 'product-management', name: 'Product Management', category: 'product', domain: 'product', aliases: ['pm', 'product strategy', 'roadmapping'] },
  { id: 'product-analytics', name: 'Product Analytics', category: 'product', domain: 'product', aliases: ['ab testing', 'a/b testing', 'experimentation', 'mixpanel'] },
  { id: 'technical-writing', name: 'Technical Writing', category: 'product', domain: 'product', aliases: ['documentation', 'docs writing'] },

  // ─── Engineering practice ───
  { id: 'testing', name: 'Software Testing', category: 'concept', domain: 'general', aliases: ['unit testing', 'tdd', 'integration testing', 'qa', 'jest', 'pytest'] },
  { id: 'agile', name: 'Agile & Scrum', category: 'concept', domain: 'general', aliases: ['scrum', 'kanban', 'sprint planning'] },
  { id: 'research-methods', name: 'Research Methods', category: 'concept', domain: 'research', aliases: ['paper writing', 'literature review', 'academic research'] },
];

/** id → Skill */
export const SKILL_MAP: ReadonlyMap<string, Skill> = new Map(SKILLS.map((s) => [s.id, s]));

/**
 * Alias index, built once. Maps every lowercased alias *and* canonical name to
 * a skill id, so lookup is O(1) rather than a linear scan per call.
 */
const ALIAS_INDEX: ReadonlyMap<string, string> = (() => {
  const index = new Map<string, string>();
  for (const skill of SKILLS) {
    index.set(skill.name.toLowerCase(), skill.id);
    index.set(skill.id, skill.id);
    for (const alias of skill.aliases) index.set(alias.toLowerCase(), skill.id);
  }
  return index;
})();

/** Strip punctuation and collapse whitespace so "React.js " matches "react.js". */
function canonicalize(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[‘’'"`]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Resolve a free-text skill mention to a canonical skill id.
 * Returns `null` when nothing matches, callers must not invent an id.
 */
export function normalizeSkill(raw: string): string | null {
  if (!raw) return null;
  const key = canonicalize(raw);
  if (!key) return null;

  const direct = ALIAS_INDEX.get(key);
  if (direct) return direct;

  // Try a hyphen/space-insensitive form: "machine-learning" → "machine learning"
  const loose = key.replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
  const looseHit = ALIAS_INDEX.get(loose);
  if (looseHit) return looseHit;

  // Try the de-spaced form: "scikit learn" → "scikitlearn" against de-spaced keys
  const squished = loose.replace(/\s/g, '');
  for (const [alias, id] of ALIAS_INDEX) {
    if (alias.replace(/[\s\-_.]/g, '') === squished) return id;
  }
  return null;
}

/** Normalize a list, dropping unrecognised entries and de-duplicating. */
export function normalizeSkillList(raw: string[]): string[] {
  const out = new Set<string>();
  for (const item of raw) {
    const id = normalizeSkill(item);
    if (id) out.add(id);
  }
  return [...out];
}

/** Human-readable name for a skill id, falling back to the id itself. */
export function skillName(id: string): string {
  return SKILL_MAP.get(id)?.name ?? id;
}

/**
 * Short forms for the names that are too long to sit in a chip.
 *
 * Only for names with a genuinely standard abbreviation, so a chip reading
 * "RAG" is the form a practitioner would recognise faster than the words. The
 * full name is always what `skillName` returns, and it is what prose, headings
 * and the skill map use, so nothing here hides the meaning.
 */
const SHORT_NAMES: Record<string, string> = {
  llm: 'LLMs',
  rag: 'RAG',
  'vector-db': 'VD',
  nlp: 'NLP',
  'computer-vision': 'CV',
  'machine-learning': 'ML',
  'deep-learning': 'DL',
  'reinforcement-learning': 'RL',
  'model-evaluation': 'Model Eval',
  'prompt-engineering': 'Prompting',
  'python-web': 'Python Web',
};

/** The name as it should appear in a chip. Falls back to the full name. */
export function skillShortName(id: string): string {
  return SHORT_NAMES[id] ?? skillName(id);
}

const SHORT_BY_NAME = new Map(
  Object.entries(SHORT_NAMES).map(([id, short]) => [skillName(id), short] as const),
);

/**
 * The same shortening, for the places that already hold a display name rather
 * than an id. The recommendation engine deliberately emits full names, because
 * they also go into the model prompt, so the abbreviation happens at render.
 */
export function skillShortLabel(name: string): string {
  return SHORT_BY_NAME.get(name) ?? name;
}

/** Direct prerequisites declared on the taxonomy for a skill. */
export function skillPrerequisites(id: string): string[] {
  return SKILL_MAP.get(id)?.prerequisites ?? [];
}
