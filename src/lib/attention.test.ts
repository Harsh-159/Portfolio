import { describe, it, expect } from 'vitest';
import { computeAttention, softmaxRows, applyCausalMask, tokenize } from './attention';

describe('tokenize', () => {
  it('splits on whitespace and caps at 12 tokens', () => {
    expect(tokenize('the cat sat')).toEqual(['the', 'cat', 'sat']);
    const long = tokenize('a b c d e f g h i j k l m n o');
    expect(long).toHaveLength(12);
  });
});

describe('softmaxRows', () => {
  it('produces rows that sum to 1', () => {
    const out = softmaxRows([
      [1, 2, 3],
      [0, 0, 0],
    ]);
    for (const row of out) {
      expect(row.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
    }
  });

  it('maps -Infinity entries to exactly 0', () => {
    const out = softmaxRows([[0, -Infinity, -Infinity]]);
    expect(out[0][1]).toBe(0);
    expect(out[0][2]).toBe(0);
    expect(out[0][0]).toBeCloseTo(1, 10);
  });
});

describe('applyCausalMask', () => {
  it('masks every future position', () => {
    const masked = applyCausalMask([
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ]);
    for (let i = 0; i < masked.length; i++) {
      for (let j = 0; j < masked[i].length; j++) {
        if (j > i) expect(masked[i][j]).toBe(-Infinity);
        else expect(masked[i][j]).toBe(1);
      }
    }
  });
});

describe('computeAttention', () => {
  const r = computeAttention('the cat sat on the mat');

  it('has weight rows that sum to 1', () => {
    for (const row of r.weights) {
      expect(row.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 8);
    }
  });

  it('never attends to the future', () => {
    for (let i = 0; i < r.weights.length; i++) {
      for (let j = i + 1; j < r.weights.length; j++) {
        expect(r.weights[i][j]).toBe(0);
      }
    }
  });

  it('is deterministic for the same input', () => {
    const again = computeAttention('the cat sat on the mat');
    expect(again.weights).toEqual(r.weights);
  });

  it('handles empty input without throwing', () => {
    const empty = computeAttention('   ');
    expect(empty.tokens).toEqual([]);
    expect(empty.weights).toEqual([]);
  });
});
