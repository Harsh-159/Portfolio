// Sections 3.2 to 3.9 and 7.5 to 7.9: education, experience, awards, skills and more work.

export const experience = {
  role: 'Applications Developer, Oracle',
  dates: 'June 2023 to August 2025',
  team: 'Transaction Framework team, Human Capital Management',
  progress: ['Full-stack features', 'Back end', 'AI work'],
  tools: 'JavaScript, Java, SQL, Oracle Prompt Lab, Cohere, AI Agent Studio',
  entries: [
    {
      title: 'Proposed and shipped an LLM approval-rule generator',
      text: 'Tasked with finding a high-value AI use case, proposed generating entire approval trees with LLMs, got it approved and took it to production as a pipeline of 19 specialised prompts, with structured JSON passed between every step.',
      href: '/lab/pipeline',
      linkText: 'Run the pipeline demo',
    },
    {
      title: 'Made it fast by running it in parallel',
      text: 'The first version made its AI calls one after another at about 5 seconds each, so a request with eight calls took about 40 seconds. I split the work into parallel branches, which brought it to a steady 20 seconds or so in production.',
      href: '/lab/pipeline#latency',
      linkText: 'Open the latency lab',
    },
    {
      title: 'Built a prompt testing tool',
      text: 'An internal Chrome extension for testing prompts against CSV test sets, with exact and semantic matching, accuracy and latency charts, AI analysis of failures, AI-suggested prompts and guardrails.',
      href: '/lab/prompt-testing',
      linkText: 'Run the test bench',
    },
    {
      title: 'Compared four ways of building AI features',
      text: 'Fine-tuning with Cohere, prompt engineering with Prompt Lab, reinforcement learning with guardrails and agentic workflows with AI Agent Studio. I then used whichever fitted the feature.',
      href: null,
      linkText: null,
    },
    {
      title: 'Wrote a fuzzy matcher for approval-rule search',
      text: 'A word-level string matcher built on Levenshtein distance that tolerates typos, swapped words and missing words.',
      href: '/lab/matcher',
      linkText: 'Try the matcher',
    },
  ],
} as const;

/** Section 3.3: the four conclusions. */
export const conclusions = [
  { approach: 'Prompt engineering', conclusion: 'General purpose, and enough for more than 90% of cases' },
  { approach: 'Fine-tuning', conclusion: 'Takes too long, and does not suit needs that keep changing' },
  { approach: 'Agentic workflows', conclusion: 'Can do a lot, but every chain has to be tested' },
  {
    approach: 'Reinforcement learning on prompts',
    conclusion: 'Takes too long, but can give great results if there is a good way to cross over and mutate prompts',
  },
] as const;

export const education = {
  msc: {
    line1: 'MSc Artificial Intelligence and Machine Learning, University of Birmingham, 2025 to 2026',
    grade: '85.1%, Distinction',
    top: 'Top of cohort',
    scholarship: "India Postgraduate Chancellor's Scholarship, one of around 20 awarded each year.",
    marks: [
      { module: 'Mathematical Foundations for AI', mark: 95 },
      { module: 'Evolutionary Computation', mark: 97 },
      { module: 'Natural Language Processing', mark: 93 },
    ],
    modules: [
      'Current Topics in AI and ML',
      'Machine Learning',
      'Mathematical Foundations of AI and ML',
      'Intelligent Robotics',
      'Evolutionary Computation',
      'Natural Language Processing',
    ],
    dissertation: 'Decision-Focused Regime-Gated Reservoir Computing',
    supervisor: 'Professor Peter Tino',
  },
  btech: {
    line1: 'B.Tech Electronics and Electrical Engineering, IIT Guwahati, 2019 to 2023',
    grade: '7.93/10',
    coursework: [
      'Deep Learning (CS 590)',
      'Optimization Techniques (EE 658)',
      'Data Structures and Algorithms (EE 390)',
      'Information Theory and Coding (EE 335)',
      'Introduction to Computing (CS 101)',
      'Computing Lab (CS 110)',
    ],
  },
  other: ['Harvard CS50 Introduction to Computer Science', 'Stanford Machine Learning Specialization'],
} as const;

/** Section 3.8, in this order. */
export const awards = [
  { name: 'UKFinnovator 2026', wording: 'First place, with GFA EquiShift', evidence: 'ukfinnovator' as const },
  {
    name: "Chancellor's Scholarship",
    wording: "India Postgraduate Chancellor's Scholarship, University of Birmingham, 2025",
  },
  { name: 'LeetCode', wording: 'Top 4% in contests, 900+ problems solved in Python' },
  { name: 'HackerEarth', wording: '13th of 1,313 in a machine learning challenge' },
  {
    name: 'JEE',
    wording: 'JEE Advanced All India Rank 5,141 of 150,000+. JEE Main 99.54 percentile of 1.2 million+ (2019)',
  },
  { name: 'Masters Consultancy Challenge', wording: 'Runner-up, with Turner & Townsend, 2026' },
];

export interface UsedIn {
  label: string;
  href?: string;
}

const L = {
  pipeline: { label: 'Approval-rule pipeline', href: '/lab/pipeline' },
  orchestrator: { label: 'Orchestrator', href: '/lab/orchestrator' },
  defi: { label: 'DeFi trading system', href: '/#more-work-defi' },
  forecast: { label: 'DE_LU Power Intelligence', href: '/lab/forecast' },
  briefing: { label: 'DE_LU Power Intelligence briefing', href: '/lab/forecast#briefing' },
  promptTool: { label: 'Prompt testing tool', href: '/lab/prompt-testing' },
  scenarios: { label: 'Orchestrator scenario tests', href: '/lab/orchestrator#runs' },
  loopLimits: { label: 'Orchestrator loop limits', href: '/lab/orchestrator#guards' },
  dissertation: { label: 'Dissertation', href: '/lab/dissertation' },
  maxsat: { label: 'MaxSAT solver', href: '/lab/maxsat' },
  robots: { label: 'Robot auctions', href: '/#more-work-robots' },
  oracle: { label: 'Oracle', href: '/#experience' },
  comparison: { label: 'Oracle approach comparison', href: '/lab/prompt-testing#comparison' },
} satisfies Record<string, UsedIn>;

/** Section 7.8. Each skill lists where it was used. */
export const skillGroups: { group: string; skills: { name: string; usedIn: UsedIn[] }[] }[] = [
  {
    group: 'Agents and evaluation',
    skills: [
      { name: 'Agent orchestration', usedIn: [L.pipeline, L.orchestrator, L.defi] },
      { name: 'Tool calling', usedIn: [L.orchestrator] },
      { name: 'Structured outputs', usedIn: [L.pipeline, L.orchestrator] },
      { name: 'RAG', usedIn: [L.briefing] },
      { name: 'LLM evaluation', usedIn: [L.promptTool, L.scenarios] },
      { name: 'Guardrails', usedIn: [L.promptTool, L.loopLimits] },
    ],
  },
  {
    group: 'Engineering',
    skills: [
      { name: 'Python', usedIn: [L.orchestrator, L.forecast, L.dissertation, L.maxsat, L.robots] },
      { name: 'FastAPI', usedIn: [L.orchestrator] },
      { name: 'REST APIs', usedIn: [L.orchestrator] },
      { name: 'Automated testing', usedIn: [L.orchestrator] },
      { name: 'Telemetry', usedIn: [L.orchestrator] },
      { name: 'Java', usedIn: [L.oracle] },
      { name: 'JavaScript', usedIn: [L.oracle] },
      { name: 'SQL', usedIn: [L.oracle] },
      { name: 'Git', usedIn: [{ label: 'All projects' }] },
      { name: 'Linux', usedIn: [{ label: 'All projects' }] },
      { name: 'Claude Code', usedIn: [{ label: 'Day-to-day tool on recent projects' }] },
    ],
  },
  {
    group: 'Machine learning',
    skills: [
      { name: 'PyTorch', usedIn: [L.dissertation] },
      { name: 'scikit-learn', usedIn: [L.forecast] },
      { name: 'LightGBM', usedIn: [L.forecast] },
      { name: 'pandas', usedIn: [L.forecast] },
      { name: 'NumPy', usedIn: [L.forecast] },
      { name: 'Fine-tuning', usedIn: [L.comparison] },
      { name: 'Evolutionary computation', usedIn: [L.maxsat] },
    ],
  },
];

/** Section 7.5. */
export const moreWork = [
  {
    id: 'more-work-equishift',
    title: 'GFA EquiShift',
    summary: 'First place, UKFinnovator 2026. A platform that helps lenders rebalance small-business loan portfolios.',
    role: 'I was the key technical person in a team of five. I proposed the central idea and helped build it.',
    bullets: [
      'AI analysis of concentration risk with keep or reallocate advice for each loan.',
      'AI-written investment memos for listings.',
      'A tokenised secondary marketplace with bid and ask pricing.',
    ],
    tools: null,
    body: null,
    links: [{ label: 'Repository', href: 'https://github.com/Harsh-159/GFA-EquiShift' }],
  },
  {
    id: 'more-work-defi',
    title: 'Automated DeFi trading system',
    summary: 'OpenServ hackathon, 2025. AI agents that decide what to buy, sell or hold.',
    role: 'I was the key technical person in a team of two. I proposed the central idea and helped build it.',
    bullets: [
      'A trading workflow three times a day that reads the top 15 boosted tokens and picks three to buy.',
      'A crash detector every 15 minutes that triggers the workflow on a sharp drop.',
      'A weekly report emailed as a PDF.',
    ],
    tools: 'OpenAI agents, DEX Screener, Perplexity Sonar Pro, MetaMask, Etherscan',
    body: null,
    links: [{ label: 'Repository', href: 'https://github.com/Harsh-159/Automated-AI-Powered-DeFi-Trading-System' }],
  },
  {
    id: 'more-work-robots',
    title: 'Energy-aware robot auctions',
    summary: 'University of Birmingham group project. Robots bid for warehouse tasks.',
    role: null,
    bullets: null,
    tools: null,
    body: 'Sequential single-item and combinatorial auctions decide which robot takes which task. Bids include a battery-risk term, so robots go to charge before they run flat. Speed and battery drain are learned during the run. Built in Python on the Webots simulator.',
    links: [{ label: 'Repository', href: 'https://github.com/Harsh-159/robotics-assignment' }],
  },
  {
    id: 'more-work-job-scan',
    title: 'Job-scan agent',
    summary: '2026. A scheduled agent that finds roles worth applying to.',
    role: null,
    bullets: null,
    tools: null,
    body: "Each day it scans new postings, checks each one against the employer's own careers page, filters against my criteria and logs the result so nothing is shown twice.",
    links: [],
  },
  {
    id: 'more-work-earlier',
    title: 'Earlier work',
    summary: '2022 and before.',
    role: null,
    bullets: null,
    tools: null,
    body: 'A Flask social network for planning trips. A world COVID-19 map built from scraped statistics.',
    links: [{ label: 'More on GitHub', href: 'https://github.com/Harsh-159' }],
  },
];
