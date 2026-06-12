import { describe, it, expect } from 'vitest';
import {
  trainCharBPE,
  applyLearnedMerges,
  buildAncestry,
  applyByteLevelBPE,
  isValidTokenizerFile,
  tokenizeStats,
} from './bpe';

describe('trainCharBPE', () => {
  it('merges the most frequent adjacent pair first', () => {
    // "ab" occurs 3 times, "ba" twice, so the first merge is [a, b].
    const r = trainCharBPE('ababab', 1);
    expect(r.merges).toEqual([['a', 'b']]);
    expect(r.steps[0].count).toBe(3);
    expect(r.steps[0].positions).toEqual([0, 2, 4]);
    expect(r.steps[0].newToken).toBe('ab');
    expect(r.finalSequence).toEqual(['ab', 'ab', 'ab']);
  });

  it('stops early when no pair repeats', () => {
    const r = trainCharBPE('abcd', 50);
    expect(r.merges).toHaveLength(0);
    expect(r.finalSequence).toEqual(['a', 'b', 'c', 'd']);
  });

  it('builds higher-order tokens over multiple merges', () => {
    // First merge [a,b] -> "ab" x3, then [ab,ab] can merge once.
    const r = trainCharBPE('ababab', 5);
    expect(r.merges[0]).toEqual(['a', 'b']);
    expect(r.merges[1]).toEqual(['ab', 'ab']);
    expect(r.finalSequence).toEqual(['abab', 'ab']);
  });

  it('respects the merge budget', () => {
    const r = trainCharBPE('the cat sat on the mat the cat ran', 3);
    expect(r.merges.length).toBeLessThanOrEqual(3);
    expect(r.steps).toHaveLength(r.merges.length);
  });
});

describe('applyLearnedMerges', () => {
  it('applies merges in rank order', () => {
    const { merges } = trainCharBPE('ababab', 1);
    const tokens = applyLearnedMerges('abab', merges);
    expect(tokens.map((t) => t.text)).toEqual(['ab', 'ab']);
  });

  it('gives a stable id (and thus colour) per token text', () => {
    const { merges } = trainCharBPE('ababab', 1);
    const a = applyLearnedMerges('ab', merges)[0];
    const b = applyLearnedMerges('xxab', merges).find((t) => t.text === 'ab')!;
    expect(a.id).toBe(b.id);
  });
});

describe('buildAncestry', () => {
  it('recovers the binary merge tree', () => {
    const tree = buildAncestry('abab', [
      ['a', 'b'],
      ['ab', 'ab'],
    ]);
    expect(tree.text).toBe('abab');
    expect(tree.children?.[0].text).toBe('ab');
    expect(tree.children?.[0].children?.[0].text).toBe('a');
    expect(tree.children?.[0].children?.[1].text).toBe('b');
  });

  it('treats unmerged characters as leaves', () => {
    const tree = buildAncestry('z', []);
    expect(tree).toEqual({ text: 'z' });
  });
});

describe('applyByteLevelBPE', () => {
  it('round-trips ascii text with no merges (one token per char)', () => {
    const tokens = applyByteLevelBPE('hi', []);
    expect(tokens.map((t) => t.text)).toEqual(['h', 'i']);
  });

  it('decodes a space as a real space in the display text', () => {
    // 'Ġ' is the byte-level marker for a leading space in GPT-2 style merges.
    const tokens = applyByteLevelBPE(' a', []);
    expect(tokens.map((t) => t.text)).toEqual([' ', 'a']);
  });

  it('applies byte-level merges in order', () => {
    // Merge the two bytes of "th" then "the".
    const tokens = applyByteLevelBPE('the', [
      ['t', 'h'],
      ['th', 'e'],
    ]);
    expect(tokens.map((t) => t.text)).toEqual(['the']);
  });
});

describe('isValidTokenizerFile', () => {
  it('accepts a well-formed file', () => {
    expect(
      isValidTokenizerFile({ format: 'bytelevel-bpe', vocab_size: 2, merges: [['t', 'h']] }),
    ).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(isValidTokenizerFile(null)).toBe(false);
    expect(isValidTokenizerFile({ format: 'wrong', vocab_size: 0, merges: [] })).toBe(false);
    expect(isValidTokenizerFile({ format: 'bytelevel-bpe', vocab_size: 0, merges: [['t']] })).toBe(
      false,
    );
  });
});

describe('tokenizeStats', () => {
  it('computes compression as chars per token', () => {
    const tokens = applyLearnedMerges('abab', [['a', 'b']]);
    const stats = tokenizeStats('abab', tokens);
    expect(stats.tokenCount).toBe(2);
    expect(stats.charCount).toBe(4);
    expect(stats.compression).toBe(2);
  });
});
