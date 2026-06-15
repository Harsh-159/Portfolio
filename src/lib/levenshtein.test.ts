import { describe, it, expect } from 'vitest';
import { levenshteinDistance, computeEdit } from './levenshtein';

describe('levenshteinDistance', () => {
  it('is zero for identical strings', () => {
    expect(levenshteinDistance('approval rule', 'approval rule')).toBe(0);
  });

  it('handles empty strings', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('matches known textbook distances', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('flaw', 'lawn')).toBe(2);
    expect(levenshteinDistance('sunday', 'saturday')).toBe(3);
  });

  it('matches the demo defaults', () => {
    // "approval rule" -> "aproval rules": delete one p, insert trailing s.
    expect(levenshteinDistance('approval rule', 'aproval rules')).toBe(2);
  });
});

describe('computeEdit', () => {
  it('reports a distance consistent with the matrix corner', () => {
    const r = computeEdit('kitten', 'sitting');
    expect(r.distance).toBe(3);
    expect(r.matrix[6][7]).toBe(3);
  });

  it('produces operations that transform a into b', () => {
    const a = 'kitten';
    const b = 'sitting';
    const { operations } = computeEdit(a, b);

    // Replay the operations to rebuild b from a.
    let out = '';
    for (const op of operations) {
      if (op.op === 'keep' || op.op === 'substitute') out += op.bChar;
      else if (op.op === 'insert') out += op.bChar;
      // delete contributes nothing to b
    }
    expect(out).toBe(b);

    // Number of non-keep operations equals the edit distance.
    const edits = operations.filter((o) => o.op !== 'keep').length;
    expect(edits).toBe(3);
  });
});
