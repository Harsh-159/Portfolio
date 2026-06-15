import { describe, it, expect } from 'vitest';
import { matchScore, matchDetail, DEFAULT_FLAGS } from './fuzzyMatcher';

const off = (key: 'typo' | 'transpose' | 'foreign') => ({ ...DEFAULT_FLAGS, [key]: false });

describe('typo tolerance inside words', () => {
  it('matches "recive" to "receive", and tanks when typo tolerance is off', () => {
    const on = matchScore('recive', 'receive');
    const offScore = matchScore('recive', 'receive', off('typo'));
    expect(on).toBeGreaterThan(60);
    expect(on).toBeGreaterThan(offScore);
    expect(offScore).toBeLessThan(30);
  });
});

describe('word-level transpositions', () => {
  it('matches "database select" to "select database" via a swap', () => {
    const on = matchScore('database select', 'select database');
    const offScore = matchScore('database select', 'select database', off('transpose'));
    expect(on).toBeGreaterThan(70);
    expect(on).toBeGreaterThan(offScore);

    const detail = matchDetail('database select', 'select database');
    expect(detail.ops.some((o) => o.type === 'swapped')).toBe(true);
  });
});

describe('word insertions and deletions', () => {
  it('matches "select from database" to "select database" highly', () => {
    expect(matchScore('select from database', 'select database')).toBeGreaterThan(70);
    const detail = matchDetail('select from database', 'select database');
    expect(detail.ops.some((o) => o.type === 'deleted' && o.queryWord === 'from')).toBe(true);
  });
});

describe('foreign-word strict penalty', () => {
  it('suppresses a false positive that climbs when the penalty is off', () => {
    const query = 'approval zebra umbrella xylophone quasar nimbus';
    const candidate = 'select approval database';
    const on = matchScore(query, candidate);
    const offScore = matchScore(query, candidate, off('foreign'));
    expect(offScore).toBeGreaterThan(on); // false positive climbs without the penalty
    expect(on).toBeLessThan(25); // penalty keeps it out of contention
    const detail = matchDetail(query, candidate);
    expect(detail.ops.some((o) => o.type === 'foreign')).toBe(true);
  });
});

describe('determinism', () => {
  it('returns identical results for identical inputs', () => {
    const a = matchDetail('select from database', 'select approval database');
    const b = matchDetail('select from database', 'select approval database');
    expect(a).toEqual(b);
  });
});
