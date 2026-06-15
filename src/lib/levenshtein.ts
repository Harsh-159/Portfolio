// Levenshtein edit distance with full DP matrix and backtrace.
// Pure and typed: the matching demo and its tests both import from here.

export type EditOp = 'keep' | 'substitute' | 'insert' | 'delete';

export interface Operation {
  op: EditOp;
  /** Character from string `a` involved (for keep/substitute/delete). */
  aChar?: string;
  /** Character from string `b` involved (for keep/substitute/insert). */
  bChar?: string;
}

/**
 * Edit distance only, using a rolling two-row buffer. O(min(m,n)) memory,
 * so it is safe for long strings where building the full matrix is wasteful.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // delete
        curr[j - 1] + 1, // insert
        prev[j - 1] + cost, // keep or substitute
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Full (m+1) x (n+1) DP matrix, for cell-by-cell animation. */
export function levenshteinMatrix(a: string, b: string): number[][] {
  const m = a.length;
  const n = b.length;
  const matrix: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 0; i <= m; i++) matrix[i][0] = i;
  for (let j = 0; j <= n; j++) matrix[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix;
}

/** A single backtrace cell, used to highlight the optimal path. */
export interface PathCell {
  i: number;
  j: number;
}

/** Walk the matrix from bottom-right to top-left to recover the operations. */
export function backtrace(matrix: number[][], a: string, b: string): {
  operations: Operation[];
  path: PathCell[];
} {
  const operations: Operation[] = [];
  const path: PathCell[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    path.push({ i, j });
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && matrix[i][j] === matrix[i - 1][j - 1]) {
      operations.push({ op: 'keep', aChar: a[i - 1], bChar: b[j - 1] });
      i--;
      j--;
    } else if (i > 0 && j > 0 && matrix[i][j] === matrix[i - 1][j - 1] + 1) {
      operations.push({ op: 'substitute', aChar: a[i - 1], bChar: b[j - 1] });
      i--;
      j--;
    } else if (j > 0 && matrix[i][j] === matrix[i][j - 1] + 1) {
      operations.push({ op: 'insert', bChar: b[j - 1] });
      j--;
    } else {
      operations.push({ op: 'delete', aChar: a[i - 1] });
      i--;
    }
  }

  path.push({ i: 0, j: 0 });
  operations.reverse();
  path.reverse();
  return { operations, path };
}

export interface EditResult {
  distance: number;
  matrix: number[][];
  operations: Operation[];
  path: PathCell[];
}

/** Convenience wrapper used by the demo. */
export function computeEdit(a: string, b: string): EditResult {
  const matrix = levenshteinMatrix(a, b);
  const { operations, path } = backtrace(matrix, a, b);
  return { distance: matrix[a.length][b.length], matrix, operations, path };
}
