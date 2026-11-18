// Sections 5.7, 7.4 and 8.1: the eight lab pages, their badges and their order.

export type BadgeKind = 'real' | 'replay' | 'live' | 'reconstruction' | 'concept' | 'simulation';

export const badges: Record<BadgeKind, { label: string; explanation: string }> = {
  real: { label: 'Real data', explanation: "Computed in your browser from the project's own output files" },
  replay: { label: 'Replay', explanation: 'Recorded runs of the real system, replayed step by step' },
  live: {
    label: 'Live algorithm',
    explanation: 'The algorithm runs in your browser. It is a JavaScript port of the Python original',
  },
  reconstruction: {
    label: 'Reconstruction',
    explanation: 'A rebuild of internal work. The structure is real and the data is illustrative',
  },
  concept: { label: 'Concept sketch', explanation: 'An illustration of the idea. It shows no results' },
  simulation: { label: 'Simulation', explanation: 'Invented tickers on simulated prices' },
};

/** The five badges shown in the "How to read this site" legend. */
export const legendBadges: BadgeKind[] = ['real', 'replay', 'live', 'reconstruction', 'concept'];

export type Focus = 'agents' | 'quant' | 'algorithms' | 'fullstack';

export const filters: { id: Focus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'agents', label: 'Agents and evaluation' },
  { id: 'quant', label: 'Forecasting and research' },
  { id: 'algorithms', label: 'Algorithms' },
  { id: 'fullstack', label: 'Full-stack' },
];

export interface Lab {
  slug: string;
  title: string;
  context: string;
  badge: BadgeKind;
  what: string;
  thirty: string;
  focus: Focus;
  featured: boolean;
}

/** Index order on the home page (section 7.4). */
export const labs: Lab[] = [
  {
    slug: 'pipeline',
    title: 'Approval rules from plain English',
    context: 'Oracle, 2023 to 2025',
    badge: 'reconstruction',
    what: 'An administrator types what they want. Nineteen prompts turn it into approval rules.',
    thirty: 'Run a request and switch between sequential and parallel.',
    focus: 'agents',
    featured: true,
  },
  {
    slug: 'prompt-testing',
    title: 'Prompt testing tool',
    context: 'Oracle, 2023 to 2025',
    badge: 'reconstruction',
    what: 'A test bench for prompts: load cases, run them, score the answers and see why they fail.',
    thirty: 'Turn on post-processing and watch accuracy change.',
    focus: 'agents',
    featured: true,
  },
  {
    slug: 'orchestrator',
    title: 'Multi-Tool Agentic Orchestrator',
    context: 'Engineering case study, 2026',
    badge: 'real',
    what: 'One agent, 191 tools, 7 services. The model only sees the tools a request needs.',
    thirty: 'Pick a request and see which tools survive routing.',
    focus: 'agents',
    featured: true,
  },
  {
    slug: 'forecast',
    title: 'DE_LU Power Intelligence',
    context: 'Energy-trading case study, 2026',
    badge: 'real',
    what: "Forecasts tomorrow's German electricity prices, turns them into signals and writes a briefing whose every number is checked.",
    thirty: 'Jump to the worst day, then break a citation.',
    focus: 'quant',
    featured: true,
  },
  {
    slug: 'dissertation',
    title: 'Regime-gated reservoir computing',
    context: 'MSc dissertation, 2026',
    badge: 'concept',
    what: 'A portfolio model trained on the decision it makes, not on a forecast. Architecture only, no results.',
    thirty: 'Spin up a reservoir and change its memory.',
    focus: 'quant',
    featured: false,
  },
  {
    slug: 'matcher',
    title: 'String matching algorithm',
    context: 'Oracle, 2023 to 2025',
    badge: 'reconstruction',
    what: 'Finds the right approval rule when the search has typos, swapped words or missing words.',
    thirty: 'Type a misspelt query and read the alignment.',
    focus: 'algorithms',
    featured: false,
  },
  {
    slug: 'maxsat',
    title: 'MaxSAT solver',
    context: 'MSc coursework, 2025',
    badge: 'live',
    what: 'An evolutionary search with a local-search boost, solving benchmark problems in your browser.',
    thirty: 'Run it with and without local search.',
    focus: 'algorithms',
    featured: false,
  },
  {
    slug: 'stocks',
    title: 'Stock simulator',
    context: 'First full-stack project, remade',
    badge: 'simulation',
    what: 'Buy and sell invented tickers on simulated prices.',
    thirty: 'Buy a stock and watch the portfolio move.',
    focus: 'fullstack',
    featured: false,
  },
];

/** Previous and next order (section 8.1). */
export const labOrder = [
  'pipeline',
  'prompt-testing',
  'matcher',
  'orchestrator',
  'forecast',
  'dissertation',
  'maxsat',
  'stocks',
] as const;

/** Page titles, which differ from the index title for the dissertation. */
export const labPageTitles: Record<string, string> = {
  pipeline: 'Approval rules from plain English',
  'prompt-testing': 'Prompt testing tool',
  matcher: 'String matching algorithm',
  orchestrator: 'Multi-Tool Agentic Orchestrator',
  forecast: 'DE_LU Power Intelligence',
  dissertation: 'Decision-Focused Regime-Gated Reservoir Computing',
  maxsat: 'MaxSAT solver',
  stocks: 'Stock simulator',
};

export function neighbours(slug: string) {
  const i = labOrder.indexOf(slug as (typeof labOrder)[number]);
  const n = labOrder.length;
  const prev = labOrder[(i - 1 + n) % n];
  const next = labOrder[(i + 1) % n];
  return {
    prev: { slug: prev, title: labPageTitles[prev] },
    next: { slug: next, title: labPageTitles[next] },
  };
}
