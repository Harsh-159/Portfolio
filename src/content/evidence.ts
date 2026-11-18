// Section 6.3: one entry per highlighted fact. A highlight may only use an id that exists here.

export interface Evidence {
  claim: string;
  how: string;
  href: string;
}

export const evidence = {
  'prompts-19': {
    claim: '19 specialised prompts in one pipeline',
    how: "Harsh's account of internal Oracle work",
    href: '/lab/pipeline#stages',
  },
  latency: {
    claim: 'About 5 s per call in sequence, a steady 20 s or so in parallel',
    how: "Harsh's measurements at the time, approximate",
    href: '/lab/pipeline#latency',
  },
  'tools-191': {
    claim: '191 tools across 7 services',
    how: 'Counted from the tool catalogue in the repository',
    href: '/lab/orchestrator#routing',
  },
  'scenarios-11': {
    claim: '11 of 11 live scenarios pass',
    how: 'Test run logged on 2 July 2026',
    href: '/lab/orchestrator#runs',
  },
  mae: {
    claim: '13.60 EUR/MWh mean absolute error',
    how: 'Recomputed in the browser from 11,999 stored predictions',
    href: '/lab/forecast#headline',
  },
  directional: {
    claim: '86.7% directional accuracy',
    how: 'Same data. Direction is measured against the same hour one week earlier',
    href: '/lab/forecast#headline',
  },
  'citations-21': {
    claim: '21 of 21 citations verified',
    how: "The validator's stored audit, re-run in the browser",
    href: '/lab/forecast#briefing',
  },
  ukfinnovator: {
    claim: 'First place, UKFinnovator 2026',
    how: 'Hackathon result',
    href: '/#awards',
  },
} satisfies Record<string, Evidence>;

export type EvidenceId = keyof typeof evidence;
