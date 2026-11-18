// Section 11.5: Figure 2 passes its slider values as the engine's cfg argument.
import { describe, it, expect } from 'vitest';
import { matchDetail, MATCHER_CONFIG, DEFAULT_FLAGS } from './fuzzyMatcher';

describe('cfg path', () => {
  it('default cfg gives "select aproval database" a score of 90', () => {
    expect(matchDetail('select aproval database', 'select approval database', DEFAULT_FLAGS, MATCHER_CONFIG).score).toBe(90);
  });
  it('a cheaper typo raises the score, a dearer one lowers it', () => {
    const q = 'select aproval database';
    const c = 'select approval database';
    const cheap = matchDetail(q, c, DEFAULT_FLAGS, { ...MATCHER_CONFIG, typoCost: 0 }).score;
    const dear = matchDetail(q, c, DEFAULT_FLAGS, { ...MATCHER_CONFIG, typoCost: 0.9 }).score;
    expect(cheap).toBe(100);
    expect(dear).toBeLessThan(90);
  });
  it('the unrelated-word penalty moves the score of a false match', () => {
    const q = 'approval zebra umbrella xylophone quasar';
    const c = 'select approval database';
    const harsh = matchDetail(q, c, DEFAULT_FLAGS, { ...MATCHER_CONFIG, foreignPenalty: 3 }).score;
    const soft = matchDetail(q, c, DEFAULT_FLAGS, { ...MATCHER_CONFIG, foreignPenalty: 0.5 }).score;
    expect(soft).toBeGreaterThan(harsh);
  });
  it('the gap cost changes the missing-word score', () => {
    const a = matchDetail('approval database', 'select approval database', DEFAULT_FLAGS, { ...MATCHER_CONFIG, gapCost: 0.2 });
    const b = matchDetail('approval database', 'select approval database', DEFAULT_FLAGS, { ...MATCHER_CONFIG, gapCost: 0.8 });
    expect(a.score).toBeGreaterThan(b.score);
  });
});
