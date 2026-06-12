// Causal self-attention with deterministic toy weights.
// Pure math, no framework imports. The visualiser and its tests both use this.

export const HEAD_DIM = 16;
export const MAX_TOKENS = 12;

type Matrix = number[][];
type Vector = number[];

/** Small deterministic PRNG so the same seed always yields the same weights. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit string hash (FNV-1a). */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Split into whitespace tokens, capped at MAX_TOKENS. */
export function tokenize(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean).slice(0, MAX_TOKENS);
}

/** One embedding row per token, seeded by the token string so it is stable. */
export function embed(tokens: string[], dim: number = HEAD_DIM): Matrix {
  return tokens.map((tok) => {
    const rand = mulberry32(hashString(tok));
    return Array.from({ length: dim }, () => rand() * 2 - 1);
  });
}

/** Fixed seeded projection matrix (dim x dim). */
function projection(seed: number, dim: number): Matrix {
  const rand = mulberry32(seed);
  return Array.from({ length: dim }, () =>
    Array.from({ length: dim }, () => (rand() * 2 - 1) / Math.sqrt(dim)),
  );
}

function matmul(a: Matrix, b: Matrix): Matrix {
  const rows = a.length;
  const inner = b.length;
  const cols = b[0].length;
  const out: Matrix = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      const aik = a[i][k];
      for (let j = 0; j < cols; j++) out[i][j] += aik * b[k][j];
    }
  }
  return out;
}

function transpose(a: Matrix): Matrix {
  return a[0].map((_, j) => a.map((row) => row[j]));
}

/** Numerically stable row-wise softmax. -Infinity entries map to exactly 0. */
export function softmaxRows(matrix: Matrix): Matrix {
  return matrix.map((row) => {
    const max = Math.max(...row);
    const exps = row.map((v) => (v === -Infinity ? 0 : Math.exp(v - max)));
    const sum = exps.reduce((s, v) => s + v, 0) || 1;
    return exps.map((v) => v / sum);
  });
}

/** Apply the causal mask: position i may not attend to any future position j > i. */
export function applyCausalMask(scores: Matrix): Matrix {
  return scores.map((row, i) => row.map((v, j) => (j > i ? -Infinity : v)));
}

export interface AttentionResult {
  tokens: string[];
  embeddings: Matrix;
  scores: Matrix; // raw Q.K^T / sqrt(d), before masking
  masked: Matrix; // after the causal mask
  weights: Matrix; // row-wise softmax of masked scores; each row sums to 1
  output: Matrix; // weights . V
}

const SEED_Q = 1009;
const SEED_K = 2017;
const SEED_V = 3023;

export function computeAttention(sentence: string, dim: number = HEAD_DIM): AttentionResult {
  const tokens = tokenize(sentence);
  const embeddings = embed(tokens, dim);

  if (tokens.length === 0) {
    return { tokens, embeddings: [], scores: [], masked: [], weights: [], output: [] };
  }

  const wq = projection(SEED_Q, dim);
  const wk = projection(SEED_K, dim);
  const wv = projection(SEED_V, dim);

  const q = matmul(embeddings, wq);
  const k = matmul(embeddings, wk);
  const v = matmul(embeddings, wv);

  const scale = 1 / Math.sqrt(dim);
  const raw: Matrix = matmul(q, transpose(k)).map((row) => row.map((s) => s * scale));

  const masked = applyCausalMask(raw);
  const weights = softmaxRows(masked);
  const output = matmul(weights, v);

  return { tokens, embeddings, scores: raw, masked, weights, output };
}

export type { Matrix, Vector };
