export interface Skill {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  domain: string;
}

export const SKILLS: Skill[] = [
  // Programming Languages
  { id: 'python', name: 'Python', category: 'language', aliases: ['py', 'python3'], domain: 'general' },
  { id: 'javascript', name: 'JavaScript', category: 'language', aliases: ['js', 'es6', 'ecmascript'], domain: 'web' },
  { id: 'typescript', name: 'TypeScript', category: 'language', aliases: ['ts'], domain: 'web' },
  { id: 'java', name: 'Java', category: 'language', aliases: [], domain: 'general' },
  { id: 'cpp', name: 'C++', category: 'language', aliases: ['c++', 'cplusplus'], domain: 'systems' },
  { id: 'c', name: 'C', category: 'language', aliases: [], domain: 'systems' },
  { id: 'r', name: 'R', category: 'language', aliases: ['r-lang'], domain: 'data' },
  { id: 'sql', name: 'SQL', category: 'language', aliases: ['mysql', 'postgresql', 'sqlite'], domain: 'data' },
  { id: 'rust', name: 'Rust', category: 'language', aliases: [], domain: 'systems' },
  { id: 'go', name: 'Go', category: 'language', aliases: ['golang'], domain: 'backend' },

  // ML / AI
  { id: 'machine-learning', name: 'Machine Learning', category: 'ai', aliases: ['ml'], domain: 'ai' },
  { id: 'deep-learning', name: 'Deep Learning', category: 'ai', aliases: ['dl', 'neural-networks'], domain: 'ai' },
  { id: 'nlp', name: 'NLP', category: 'ai', aliases: ['natural-language-processing', 'natural language processing'], domain: 'ai' },
  { id: 'computer-vision', name: 'Computer Vision', category: 'ai', aliases: ['cv', 'image-recognition'], domain: 'ai' },
  { id: 'transformers', name: 'Transformers', category: 'ai', aliases: ['transformer architecture', 'attention mechanism'], domain: 'ai' },
  { id: 'llm', name: 'LLMs', category: 'ai', aliases: ['large language models', 'gpt', 'llm'], domain: 'ai' },
  { id: 'generative-ai', name: 'Generative AI', category: 'ai', aliases: ['genai', 'gen ai'], domain: 'ai' },
  { id: 'rag', name: 'RAG', category: 'ai', aliases: ['retrieval augmented generation', 'retrieval-augmented'], domain: 'ai' },
  { id: 'prompt-engineering', name: 'Prompt Engineering', category: 'ai', aliases: ['prompting', 'prompt design'], domain: 'ai' },
  { id: 'mlops', name: 'MLOps', category: 'ai', aliases: ['ml ops', 'ml operations'], domain: 'ai' },
  { id: 'reinforcement-learning', name: 'Reinforcement Learning', category: 'ai', aliases: ['rl', 'drl'], domain: 'ai' },

  // Data Science
  { id: 'data-science', name: 'Data Science', category: 'data', aliases: ['data analysis', 'data analytics'], domain: 'data' },
  { id: 'statistics', name: 'Statistics', category: 'math', aliases: ['statistical analysis', 'stats'], domain: 'data' },
  { id: 'data-visualization', name: 'Data Visualization', category: 'data', aliases: ['dataviz', 'data viz'], domain: 'data' },
  { id: 'pandas', name: 'Pandas', category: 'library', aliases: ['pandas library'], domain: 'data' },
  { id: 'numpy', name: 'NumPy', category: 'library', aliases: ['numpy', 'np'], domain: 'data' },
  { id: 'scikit-learn', name: 'Scikit-learn', category: 'library', aliases: ['sklearn', 'scikit learn'], domain: 'ai' },
  { id: 'tensorflow', name: 'TensorFlow', category: 'library', aliases: ['tf'], domain: 'ai' },
  { id: 'pytorch', name: 'PyTorch', category: 'library', aliases: ['torch'], domain: 'ai' },
  { id: 'feature-engineering', name: 'Feature Engineering', category: 'data', aliases: ['feature selection'], domain: 'data' },

  // Web
  { id: 'react', name: 'React', category: 'framework', aliases: ['reactjs', 'react.js'], domain: 'web' },
  { id: 'nextjs', name: 'Next.js', category: 'framework', aliases: ['nextjs', 'next js'], domain: 'web' },
  { id: 'nodejs', name: 'Node.js', category: 'runtime', aliases: ['node', 'nodejs'], domain: 'web' },
  { id: 'html', name: 'HTML', category: 'language', aliases: ['html5'], domain: 'web' },
  { id: 'css', name: 'CSS', category: 'language', aliases: ['css3', 'styling'], domain: 'web' },
  { id: 'restapi', name: 'REST API', category: 'concept', aliases: ['rest', 'api design', 'web api'], domain: 'web' },

  // DevOps / Cloud
  { id: 'docker', name: 'Docker', category: 'devops', aliases: ['containerization', 'containers'], domain: 'devops' },
  { id: 'kubernetes', name: 'Kubernetes', category: 'devops', aliases: ['k8s'], domain: 'devops' },
  { id: 'aws', name: 'AWS', category: 'cloud', aliases: ['amazon web services'], domain: 'cloud' },
  { id: 'gcp', name: 'GCP', category: 'cloud', aliases: ['google cloud', 'google cloud platform'], domain: 'cloud' },
  { id: 'azure', name: 'Azure', category: 'cloud', aliases: ['microsoft azure'], domain: 'cloud' },
  { id: 'git', name: 'Git', category: 'tool', aliases: ['version control', 'github', 'gitlab'], domain: 'general' },
  { id: 'linux', name: 'Linux', category: 'os', aliases: ['unix', 'bash', 'shell'], domain: 'systems' },

  // Vector DB / Search
  { id: 'vector-db', name: 'Vector Databases', category: 'database', aliases: ['pinecone', 'chromadb', 'weaviate', 'qdrant'], domain: 'ai' },

  // LLM APIs
  { id: 'llm-apis', name: 'LLM APIs', category: 'ai', aliases: ['openai api', 'anthropic api', 'gemini api'], domain: 'ai' },

  // Math
  { id: 'linear-algebra', name: 'Linear Algebra', category: 'math', aliases: ['matrices', 'vectors', 'linear algebra'], domain: 'math' },
  { id: 'calculus', name: 'Calculus', category: 'math', aliases: ['differential calculus', 'integral calculus'], domain: 'math' },
  { id: 'probability', name: 'Probability', category: 'math', aliases: ['probability theory', 'bayesian'], domain: 'math' },
];

export const SKILL_MAP = new Map(SKILLS.map(s => [s.id, s]));

export function normalizeSkillName(name: string): string | null {
  const lower = name.toLowerCase().trim();
  for (const skill of SKILLS) {
    if (skill.name.toLowerCase() === lower) return skill.id;
    if (skill.aliases.some(a => a.toLowerCase() === lower)) return skill.id;
  }
  return null;
}
