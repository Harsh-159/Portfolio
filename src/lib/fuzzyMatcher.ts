// Word-level fuzzy matcher.
//
// A clean-room reconstruction of a matcher I built at Oracle for searching
// approval-rule entries. It compares sequences of WORDS (not characters) with a
// Damerau-Levenshtein DP, and folds in four behaviours:
//   1. typo tolerance inside words (cheap substitution for near-identical words),
//   2. word-level transpositions (adjacent swapped words cost a small penalty),
//   3. word insertions and deletions (extra/missing words are cheap gaps),
//   4. a harsh penalty for "foreign" query words far from every candidate word,
//      so one matching word among irrelevant ones cannot produce a false positive.
//
// Pure and typed. The character-level Levenshtein it leans on lives in
// `levenshtein.ts` (reused, not duplicated).

import { levenshteinDistance } from './levenshtein';

// Tunable constants. Sensible defaults; I may tune these.
export const MATCHER_CONFIG = {
  /** Normalised char distance below which two words are treated as a typo match. */
  typoThreshold: 0.34,
  /** Substitution cost for a typo-near word pair. */
  typoCost: 0.3,
  /** Cost of swapping two adjacent words. */
  transpositionCost: 0.35,
  /** Cost of an inserted or deleted word (a gap). */
  gapCost: 0.5,
  /** Cost of a plain word-vs-word mismatch (kept above a gap pair so unrelated
   *  words align as insert+delete rather than a substitution). */
  mismatchCost: 1.1,
  /** A query word shorter than this is never "foreign" (connective/stopword). */
  foreignMinLength: 5,
  /** Min normalised char distance to every candidate word to count as foreign. */
  foreignThreshold: 0.6,
  /** Deliberately harsh penalty for a foreign query word. */
  foreignPenalty: 2.0,
};

export interface MatchFlags {
  typo: boolean;
  transpose: boolean;
  foreign: boolean;
}

export const DEFAULT_FLAGS: MatchFlags = { typo: true, transpose: true, foreign: true };

export type AlignType = 'exact' | 'typo' | 'swapped' | 'inserted' | 'deleted' | 'foreign';

export interface AlignOp {
  type: AlignType;
  queryWord?: string;
  candWord?: string;
  /** Character-level distance, for typo pairs. */
  charDist?: number;
}

export interface PathCell {
  i: number;
  j: number;
}

export interface MatchResult {
  score: number; // 0..100
  cost: number;
  ops: AlignOp[];
  matrix: number[][];
  path: PathCell[];
  query: string[];
  candidate: string[];
}

const eq = (a: number, b: number) => Math.abs(a - b) < 1e-9;

export function tokenise(s: string): string[] {
  return s.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

/** Normalised character distance in [0, 1]. */
function charNorm(a: string, b: string): number {
  if (a === b) return 0;
  return levenshteinDistance(a, b) / Math.max(a.length, b.length, 1);
}

function isForeign(word: string, candWords: string[], cfg = MATCHER_CONFIG): boolean {
  if (word.length < cfg.foreignMinLength || candWords.length === 0) return false;
  const minNorm = Math.min(...candWords.map((c) => charNorm(word, c)));
  return minNorm > cfg.foreignThreshold;
}

function wordsMatch(a: string, b: string, flags: MatchFlags, cfg = MATCHER_CONFIG): boolean {
  return a === b || (flags.typo && charNorm(a, b) <= cfg.typoThreshold);
}

function subCost(
  qi: string,
  cj: string,
  candWords: string[],
  flags: MatchFlags,
  cfg = MATCHER_CONFIG,
): number {
  if (qi === cj) return 0;
  if (flags.typo && charNorm(qi, cj) <= cfg.typoThreshold) return cfg.typoCost;
  if (flags.foreign && isForeign(qi, candWords, cfg)) return cfg.foreignPenalty;
  return cfg.mismatchCost;
}

function delCost(qi: string, candWords: string[], flags: MatchFlags, cfg = MATCHER_CONFIG): number {
  if (flags.foreign && isForeign(qi, candWords, cfg)) return cfg.foreignPenalty;
  return cfg.gapCost;
}

export function matchDetail(
  query: string,
  candidate: string,
  flags: MatchFlags = DEFAULT_FLAGS,
  cfg = MATCHER_CONFIG,
): MatchResult {
  const q = tokenise(query);
  const c = tokenise(candidate);
  const m = q.length;
  const n = c.length;

  if (m === 0) {
    return { score: 0, cost: 0, ops: [], matrix: [[0]], path: [{ i: 0, j: 0 }], query: q, candidate: c };
  }

  const matrix: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) matrix[i][0] = matrix[i - 1][0] + delCost(q[i - 1], c, flags, cfg);
  for (let j = 1; j <= n; j++) matrix[0][j] = j * cfg.gapCost;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      let best = Math.min(
        matrix[i - 1][j] + delCost(q[i - 1], c, flags, cfg),
        matrix[i][j - 1] + cfg.gapCost,
        matrix[i - 1][j - 1] + subCost(q[i - 1], c[j - 1], c, flags, cfg),
      );
      if (
        flags.transpose &&
        i >= 2 &&
        j >= 2 &&
        wordsMatch(q[i - 1], c[j - 2], flags, cfg) &&
        wordsMatch(q[i - 2], c[j - 1], flags, cfg)
      ) {
        best = Math.min(best, matrix[i - 2][j - 2] + cfg.transpositionCost);
      }
      matrix[i][j] = best;
    }
  }

  const cost = matrix[m][n];
  const score = Math.max(0, Math.min(100, Math.round(100 * (1 - cost / Math.max(m, n, 1)))));

  // Backtrace for the alignment view.
  const ops: AlignOp[] = [];
  const path: PathCell[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    path.push({ i, j });
    if (
      flags.transpose &&
      i >= 2 &&
      j >= 2 &&
      wordsMatch(q[i - 1], c[j - 2], flags, cfg) &&
      wordsMatch(q[i - 2], c[j - 1], flags, cfg) &&
      eq(matrix[i][j], matrix[i - 2][j - 2] + cfg.transpositionCost)
    ) {
      ops.push({
        type: 'swapped',
        queryWord: `${q[i - 2]} ${q[i - 1]}`,
        candWord: `${c[j - 2]} ${c[j - 1]}`,
      });
      i -= 2;
      j -= 2;
    } else if (
      i > 0 &&
      j > 0 &&
      eq(matrix[i][j], matrix[i - 1][j - 1] + subCost(q[i - 1], c[j - 1], c, flags, cfg))
    ) {
      const qi = q[i - 1];
      const cj = c[j - 1];
      let type: AlignType;
      if (qi === cj) type = 'exact';
      else if (flags.typo && charNorm(qi, cj) <= cfg.typoThreshold) type = 'typo';
      else type = 'foreign';
      ops.push({ type, queryWord: qi, candWord: cj, charDist: levenshteinDistance(qi, cj) });
      i -= 1;
      j -= 1;
    } else if (i > 0 && eq(matrix[i][j], matrix[i - 1][j] + delCost(q[i - 1], c, flags, cfg))) {
      const foreign = flags.foreign && isForeign(q[i - 1], c, cfg);
      ops.push({ type: foreign ? 'foreign' : 'deleted', queryWord: q[i - 1] });
      i -= 1;
    } else {
      ops.push({ type: 'inserted', candWord: c[j - 1] });
      j -= 1;
    }
  }
  path.push({ i: 0, j: 0 });
  ops.reverse();
  path.reverse();

  return { score, cost, ops, matrix, path, query: q, candidate: c };
}

export function matchScore(
  query: string,
  candidate: string,
  flags: MatchFlags = DEFAULT_FLAGS,
): number {
  return matchDetail(query, candidate, flags).score;
}
