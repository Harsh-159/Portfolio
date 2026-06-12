// Single source of truth for site copy and structured CV data (spec Section 9).
// Numbers here are real. Do not invent metrics, employers, or quotes.

export const LINKS = {
  email: 'harshyadavhappy@gmail.com',
  linkedin: 'https://www.linkedin.com/in/harsh-yadav-01/',
  github: 'https://github.com/Harsh-159',
  linktree: 'https://linktr.ee/harshyadav01',
  cv: '/cv.pdf',
  // Repository that hosts this site; "View source" links on demos point here.
  repo: 'https://github.com/Harsh-159/Portfolio',
} as const;

export const IDENTITY = {
  name: 'Harsh Yadav',
  role: 'AI engineer',
  location: 'Birmingham, UK',
  tagline: 'I build and evaluate LLM systems.',
};

export const STATS = [
  { value: '86.7%', label: 'directional accuracy over 12,000 out-of-sample hours' },
  { value: '19-agent', label: 'production pipeline at Oracle' },
  { value: '1st place', label: 'UKFinnovator 2026' },
  { value: 'Top 4%', label: 'on LeetCode' },
];

export interface ExperienceEntry {
  role: string;
  org: string;
  date: string;
  context: string;
  bullets: { text: string; href?: string }[];
}

export const EXPERIENCE: ExperienceEntry[] = [
  {
    role: 'Applications Developer',
    org: 'Oracle',
    date: '2023 to 2025',
    context: 'Transaction Framework team, internal tooling for Oracle’s HCM organisation.',
    bullets: [
      {
        text: 'Built a multi-step agentic pipeline (19 agents) for AI-powered approval rule generation.',
        href: '/lab/pipeline',
      },
      {
        text: 'Ran a comparative analysis of approaches: Cohere fine-tuning, prompt engineering, RL, and agentic workflows.',
      },
      { text: 'Built a Chrome extension for prompt testing.' },
      {
        text: 'Built a Levenshtein-based string matcher for rule matching.',
        href: '/lab/levenshtein',
      },
    ],
  },
];

export interface EducationEntry {
  degree: string;
  org: string;
  date: string;
  detail: string;
  coursework?: string[];
}

export const EDUCATION: EducationEntry[] = [
  {
    degree: 'MSc Artificial Intelligence & Machine Learning',
    org: 'University of Birmingham',
    date: '2025 to 2026',
    detail:
      'Expected Distinction. India Postgraduate Chancellor’s Scholarship, one of around 20 awarded annually.',
  },
  {
    degree: 'B.Tech Electronics & Electrical Engineering',
    org: 'IIT Guwahati',
    date: '2019 to 2023',
    detail: 'GPA 7.93.',
    coursework: [
      'Deep Learning (CS 590)',
      'Optimization Techniques (EE 658)',
      'Data Structures and Algorithms (EE 390)',
      'Information Theory & Coding (EE 335)',
      'Introduction to Computing (CS 101)',
      'Computing Lab (CS 110)',
    ],
  },
];

export interface ProjectCard {
  title: string;
  blurb: string;
  href: string;
  badge?: string;
}

// "Other projects": work that is linked rather than embedded as a live demo.
export const OTHER_PROJECTS: ProjectCard[] = [
  {
    title: 'GFA EquiShift',
    blurb:
      'AI-driven portfolio intelligence with a tokenised secondary marketplace, built in a hackathon sprint.',
    href: 'https://github.com/Harsh-159/GFA-EquiShift',
    badge: '1st place, UKFinnovator 2026',
  },
  {
    title: 'Automated AI DeFi trading system',
    blurb:
      'Analyses on-chain data, whale activity and market sentiment to manage a portfolio, with scheduled crash detection and weekly PDF reports.',
    href: 'https://github.com/Harsh-159/Automated-AI-Powered-DeFi-Trading-System',
  },
  {
    title: 'More on GitHub',
    blurb: 'A Flask trip-planning network, a COVID-19 choropleth, a stock simulator, and more.',
    href: 'https://github.com/Harsh-159',
  },
];

// About copy (Section 6.6). First person, British English, no self-adjectives.
export const ABOUT_PARAGRAPHS = [
  'In seminars I’m easy to find: the bald guy asking too many questions.',
  'I’m an AI engineer focused on LLM systems and evaluation. I did my B.Tech at IIT Guwahati, spent two years at Oracle building internal AI tooling, and I’m now doing an MSc in AI and Machine Learning at Birmingham as a Chancellor’s Scholar.',
  'I founded and chair the All Things AI society at Birmingham, and I took part in the Masters Consultancy Challenge with Turner & Townsend.',
  'Away from the screen I’ve won national-level medals in swimming and taekwondo, which is mostly how I learned that progress comes from showing up to the boring repetitions.',
  'I’m based in Birmingham and open to relocation. If you want to see how I think, run one of the demos above and read the source.',
];

export const ABOUT_PHOTO = '/harsh.webp';
