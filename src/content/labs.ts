import { LINKS } from './profile';

export type LabStatus = 'live' | 'in-training' | 'planned';

export type PreviewKind =
  | 'tokenizer'
  | 'orderbook'
  | 'forecast'
  | 'pipeline'
  | 'attention'
  | 'levenshtein'
  | 'locked';

export interface Lab {
  id: string;
  title: string;
  /** Route for live demos; undefined for locked cards. */
  route?: string;
  status: LabStatus;
  /** Short tag shown on the card stating which claim it backs. */
  claim: string;
  /** "Why this exists" one-liner shown on the demo page. */
  why: string;
  /** GitHub link to the engine source. */
  source?: string;
  preview: PreviewKind;
  /** Plan shown when a locked card expands. */
  plan?: string[];
}

const src = (file: string) => `${LINKS.repo}/blob/main/src/lib/${file}`;

export const LABS: Lab[] = [
  {
    id: 'tokenizer',
    title: 'BPE tokenizer playground',
    route: '/lab/tokenizer',
    status: 'live',
    claim: 'From my LLM build',
    why: 'I am building an LLM from scratch, and the tokenizer is done. Train byte-pair encoding live, then tokenise anything.',
    source: src('bpe.ts'),
    preview: 'tokenizer',
  },
  {
    id: 'orderbook',
    title: 'Order matching engine',
    route: '/lab/orderbook',
    status: 'live',
    claim: 'Microstructure, from scratch',
    why: 'I understand market microstructure well enough to build the machinery: price-time priority, limit and market orders, partial fills.',
    source: src('matchingEngine.ts'),
    preview: 'orderbook',
  },
  {
    id: 'forecast',
    title: 'Power price forecast explorer',
    route: '/lab/forecast',
    status: 'live',
    claim: 'German day-ahead forecasting',
    why: '86.7% directional accuracy on a 12,000-hour walk-forward out-of-sample evaluation of German day-ahead electricity prices.',
    preview: 'forecast',
  },
  {
    id: 'pipeline',
    title: '19-agent pipeline replay',
    route: '/lab/pipeline',
    status: 'live',
    claim: 'Built at Oracle',
    why: 'I built a 19-agent production pipeline at Oracle for AI-powered approval rule generation. This is an anonymised reconstruction.',
    preview: 'pipeline',
  },
  {
    id: 'attention',
    title: 'Causal self-attention',
    route: '/lab/attention',
    status: 'live',
    claim: 'From my LLM build',
    why: 'I have implemented attention from scratch. Step through embeddings, scores, the causal mask, softmax and the output.',
    source: src('attention.ts'),
    preview: 'attention',
  },
  {
    id: 'levenshtein',
    title: 'Edit distance visualiser',
    route: '/lab/levenshtein',
    status: 'live',
    claim: 'Built at Oracle',
    why: 'I built a Levenshtein-based string matcher at Oracle for approval-rule matching. Watch the DP matrix fill and backtrace.',
    source: src('levenshtein.ts'),
    preview: 'levenshtein',
  },
  {
    id: 'generation',
    title: 'TinyStories generation',
    status: 'in-training',
    claim: 'Next in my LLM build',
    why: 'In-browser text generation once my training run on TinyStories completes.',
    preview: 'locked',
    plan: [
      'Finish the dataloader and attention blocks.',
      'Train a small model on TinyStories V2-GPT4.',
      'Export weights and run generation in the browser with WebGPU.',
    ],
  },
  {
    id: 'cuda',
    title: 'CUDA inference engine',
    status: 'planned',
    claim: 'Planned',
    why: 'A CUDA-accelerated LLM inference engine, target model Llama 3.2 1B.',
    preview: 'locked',
    plan: [
      'Naive PyTorch baseline',
      'KV cache',
      'FlashAttention-style Triton kernel',
      'Quantisation',
      'Continuous batching',
      'Stretch goals',
    ],
  },
];

export const LIVE_LABS = LABS.filter((l) => l.route);
