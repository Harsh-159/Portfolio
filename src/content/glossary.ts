// Section 6.4: one-sentence definitions shown on the first use of a term on each page.

export const glossary = {
  'approval-rule': {
    term: 'Approval rule',
    definition: 'A rule in HR software that decides who must approve a request, and under what conditions',
  },
  'list-builder': {
    term: 'List builder',
    definition:
      'The part of an approval rule that works out the list of approvers, such as a management chain or a named group',
  },
  prompt: { term: 'Prompt', definition: 'A written instruction given to a language model for one specific job' },
  'structured-output': {
    term: 'Structured output',
    definition: 'A model reply forced into a fixed JSON shape so code can read it reliably',
  },
  'tool-calling': {
    term: 'Tool calling',
    definition: 'Letting a model ask for a function to be run, such as "search email", and then use the result',
  },
  guardrail: { term: 'Guardrail', definition: "A check on a model's output that blocks it when it breaks a stated rule" },
  rag: {
    term: 'RAG',
    definition:
      'Retrieval-augmented generation: giving the model retrieved facts to write from, instead of relying on its memory',
  },
  'day-ahead-price': {
    term: 'Day-ahead price',
    definition: 'The price of electricity for each hour of tomorrow, set by an auction today',
  },
  mae: { term: 'MAE', definition: 'Mean absolute error: the average size of the miss, in the unit being forecast' },
  'directional-accuracy': {
    term: 'Directional accuracy',
    definition:
      'How often the forecast was right about the price being higher or lower than the same hour one week earlier',
  },
  'skill-score': {
    term: 'Skill score',
    definition: 'How much better than a simple baseline: 0 is no better, 1 is perfect',
  },
  'seasonal-naive': {
    term: 'Seasonal naive',
    definition: 'The simplest forecast: repeat the value from the same hour last week',
  },
  'held-out-test': {
    term: 'Held-out test',
    definition: 'Data the model never saw during training, kept back to judge it fairly',
  },
  'walk-forward': {
    term: 'Walk-forward validation',
    definition: 'Testing on successive later periods, always training only on the past',
  },
  'residual-load': {
    term: 'Residual load',
    definition: 'Electricity demand minus wind and solar output: what other power stations must cover',
  },
  'reservoir-computing': {
    term: 'Reservoir computing',
    definition: 'A model that passes inputs through a fixed, untrained network and trains only what reads it',
  },
  'mixture-of-experts': {
    term: 'Mixture of experts',
    definition:
      'Several specialist models whose outputs are blended by a gate that decides how much to trust each',
  },
  sharpe: { term: 'Sharpe ratio', definition: 'Return earned per unit of risk taken' },
  maxsat: {
    term: 'MaxSAT',
    definition:
      'Given many true-or-false conditions that cannot all hold, find the assignment that satisfies the most',
  },
  memetic: {
    term: 'Memetic algorithm',
    definition: 'An evolutionary search whose candidates are also improved by a quick local search',
  },
  levenshtein: {
    term: 'Levenshtein distance',
    definition: 'The number of single-character edits needed to turn one word into another',
  },
} as const;

export type GlossaryId = keyof typeof glossary;
