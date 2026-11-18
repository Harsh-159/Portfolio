import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  parseWcnf,
  computeSatCounts,
  fastCountSatisfied,
  buildVariableIndex,
  computeFlipGain,
  applyFlip,
  runToEnd,
  DEFAULT_SETTINGS,
} from './maxsat';
import { mulberry32 } from './rng';
import { signs, reservoirStep, fadeSteps, gateValue, blend, runId } from './reservoir';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('MaxSAT port', () => {
  it('example.wcnf with 0001 satisfies 2 of 2', () => {
    const inst = parseWcnf(read('./fixtures/example.wcnf'));
    expect(inst.numVars).toBe(4);
    const a = Uint8Array.from([0, 0, 0, 1]);
    expect(fastCountSatisfied(computeSatCounts(a, inst.clauses))).toBe(2);
  });

  it('parses the four benchmark sizes', () => {
    const sizes = ['sbox_4', 'johnson8-4-4', 'hamming6-4', 'brock200_1'].map((p) => {
      const i = parseWcnf(read(`../../public/data/maxsat/${p}.wcnf`));
      return [i.numVars, i.clauses.length];
    });
    expect(sizes).toEqual([
      [147, 387],
      [70, 630],
      [64, 1376],
      [200, 5266],
    ]);
  });

  it('flip gain equals the change in satisfied clauses', () => {
    const inst = parseWcnf(read('../../public/data/maxsat/sbox_4.wcnf'));
    const rand = mulberry32(7);
    const a = Uint8Array.from({ length: inst.numVars }, () => (rand() < 0.5 ? 1 : 0));
    const { pos, neg } = buildVariableIndex(inst.clauses, inst.numVars);
    const sat = computeSatCounts(a, inst.clauses);
    for (let k = 0; k < 200; k++) {
      const v = 1 + Math.floor(rand() * inst.numVars);
      const before = fastCountSatisfied(sat);
      const gain = computeFlipGain(v, a, pos, neg, sat);
      applyFlip(v, a, pos, neg, sat);
      expect(fastCountSatisfied(sat) - before).toBe(gain);
      expect(fastCountSatisfied(computeSatCounts(a, inst.clauses))).toBe(fastCountSatisfied(sat));
    }
  });

  it('a fixed seed returns the same best value twice, and the best never falls', () => {
    const inst = parseWcnf(read('../../public/data/maxsat/sbox_4.wcnf'));
    const s = { ...DEFAULT_SETTINGS, generations: 20 };
    const a = runToEnd(inst, s);
    const b = runToEnd(inst, s);
    expect(a).toEqual(b);
    for (let i = 1; i < a.length; i++) expect(a[i]).toBeGreaterThanOrEqual(a[i - 1]);
  });
});

describe('reservoir', () => {
  it('signs follow the digits of pi', () => {
    // 1 4 1 5 9 2 6 5
    expect(signs(8)).toEqual([-1, 1, -1, -1, -1, 1, 1, -1]);
  });
  it('update rule for a known small case', () => {
    const x = reservoirStep([0.5, -0.2, 0.1], 1, 0.8, 0.5, [1, -1, 1]);
    expect(x[0]).toBeCloseTo(Math.tanh(0.8 * 0.1 + 0.5), 12);
    expect(x[1]).toBeCloseTo(Math.tanh(0.8 * 0.5 - 0.5), 12);
    expect(x[2]).toBeCloseTo(Math.tanh(0.8 * -0.2 + 0.5), 12);
  });
  it('a pulse fades to 5% after about 13 steps at r = 0.80', () => expect(fadeSteps(0.8)).toBe(13));
  it('blend arithmetic', () => {
    expect(gateValue(50)).toBe(0.5);
    expect(blend(0.5)).toEqual([0.25, 0.2, 0.25, 0.3].map((x) => expect.closeTo(x, 12)));
    expect(blend(0)).toEqual([0.4, 0.3, 0.2, 0.1]);
  });
  it('run id is stable for identical settings', async () => {
    const a = await runId({ reservoirSize: 200, experts: 3, seed: 1 });
    const b = await runId({ reservoirSize: 200, experts: 3, seed: 1 });
    const c = await runId({ reservoirSize: 200, experts: 3, seed: 2 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{10}$/);
  });
});
