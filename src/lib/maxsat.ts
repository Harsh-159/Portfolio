// Section 15: a function-for-function port of exercise3.py (the coursework MaxSAT solver).
// The Python version uses a time budget; this one uses a generation budget and a seeded generator.

import { mulberry32 } from './rng';

export interface Instance {
  numVars: number;
  numClauses: number;
  clauses: number[][];
}

/** Reads "p wcnf <vars> <clauses>", then one clause per line, ignoring the weight and the final 0. */
export function parseWcnf(text: string): Instance {
  let numVars = 0;
  let numClauses = 0;
  const clauses: number[][] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('c')) continue;
    if (line.startsWith('p')) {
      const parts = line.split(/\s+/);
      numVars = Number(parts[2]);
      numClauses = Number(parts[3]);
      continue;
    }
    const parts = line.split(/\s+/).map(Number);
    clauses.push(parts.slice(1, -1));
  }
  return { numVars, numClauses, clauses };
}

export function buildVariableIndex(clauses: number[][], numVars: number) {
  const pos: number[][] = Array.from({ length: numVars + 1 }, () => []);
  const neg: number[][] = Array.from({ length: numVars + 1 }, () => []);
  clauses.forEach((clause, idx) => {
    for (const lit of clause) (lit > 0 ? pos : neg)[Math.abs(lit)].push(idx);
  });
  return { pos, neg };
}

export function computeSatCounts(assignment: Uint8Array, clauses: number[][]): Int32Array {
  const sat = new Int32Array(clauses.length);
  for (let ci = 0; ci < clauses.length; ci++) {
    for (const lit of clauses[ci]) {
      const v = assignment[Math.abs(lit) - 1];
      if ((lit > 0 && v === 1) || (lit < 0 && v === 0)) sat[ci]++;
    }
  }
  return sat;
}

export function fastCountSatisfied(sat: Int32Array): number {
  let t = 0;
  for (let i = 0; i < sat.length; i++) if (sat[i] > 0) t++;
  return t;
}

export function computeFlipGain(
  v: number,
  a: Uint8Array,
  pos: number[][],
  neg: number[][],
  sat: Int32Array,
): number {
  let gain = 0;
  const [lose, win] = a[v - 1] === 1 ? [pos[v], neg[v]] : [neg[v], pos[v]];
  for (const ci of lose) if (sat[ci] === 1) gain--;
  for (const ci of win) if (sat[ci] === 0) gain++;
  return gain;
}

export function applyFlip(v: number, a: Uint8Array, pos: number[][], neg: number[][], sat: Int32Array): void {
  const [down, up] = a[v - 1] === 1 ? [pos[v], neg[v]] : [neg[v], pos[v]];
  for (const ci of down) sat[ci]--;
  for (const ci of up) sat[ci]++;
  a[v - 1] = 1 - a[v - 1];
}

type Rand = () => number;

function shuffle<T>(arr: T[], rand: Rand): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function localSearch(
  a: Uint8Array,
  inst: Instance,
  pos: number[][],
  neg: number[][],
  maxFlips: number,
  rand: Rand,
): number {
  const sat = computeSatCounts(a, inst.clauses);
  let numSat = fastCountSatisfied(sat);
  let flips = 0;
  let improved = true;
  while (improved && flips < maxFlips) {
    improved = false;
    const order = shuffle(
      Array.from({ length: inst.numVars }, (_, i) => i + 1),
      rand,
    );
    for (const v of order) {
      if (flips >= maxFlips) break;
      const gain = computeFlipGain(v, a, pos, neg, sat);
      if (gain > 0) {
        applyFlip(v, a, pos, neg, sat);
        numSat += gain;
        flips++;
        improved = true;
      }
    }
  }
  return numSat;
}

/** Draw `size` members without replacement and keep the best. */
export function tournamentSelect(pop: Uint8Array[], fitness: number[], size: number, rand: Rand): Uint8Array {
  const idx = Array.from({ length: pop.length }, (_, i) => i);
  for (let i = 0; i < size; i++) {
    const j = i + Math.floor(rand() * (idx.length - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  let best = idx[0];
  for (let k = 1; k < size; k++) if (fitness[idx[k]] > fitness[best]) best = idx[k];
  return pop[best].slice();
}

export function uniformCrossover(a: Uint8Array, b: Uint8Array, rand: Rand): Uint8Array {
  const child = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) child[i] = rand() < 0.5 ? a[i] : b[i];
  return child;
}

export function bitFlipMutate(ind: Uint8Array, rate: number, rand: Rand): Uint8Array {
  for (let i = 0; i < ind.length; i++) if (rand() < rate) ind[i] = 1 - ind[i];
  return ind;
}

export const LS_MAX_FLIPS_FRAC = 0.5;

export interface SolverSettings {
  popSize: number;
  /** Multiplier on 1/n. */
  mutation: number;
  tournament: number;
  /** Share of children polished by local search, 0 to 0.5. */
  lsRate: number;
  generations: number;
  seed: number;
}

export const DEFAULT_SETTINGS: SolverSettings = {
  popSize: 100,
  mutation: 1,
  tournament: 5,
  lsRate: 0.15,
  generations: 60,
  seed: 42,
};

export interface GenerationReport {
  generation: number;
  best: number;
  /** Top 30 assignments, best first, for the population view. */
  top?: Uint8Array[];
}

/** The generation loop with elitism. Calls onGeneration after the initial population and each generation. */
export function* solve(inst: Instance, s: SolverSettings): Generator<GenerationReport> {
  const rand = mulberry32(s.seed);
  const n = inst.numVars;
  const rate = s.mutation / n;
  const lsMax = Math.max(1, Math.floor(n * LS_MAX_FLIPS_FRAC));
  const { pos, neg } = buildVariableIndex(inst.clauses, n);
  let pop: Uint8Array[] = Array.from({ length: s.popSize }, () => {
    const a = new Uint8Array(n);
    for (let i = 0; i < n; i++) a[i] = rand() < 0.5 ? 1 : 0;
    return a;
  });
  let fit = pop.map((a) => fastCountSatisfied(computeSatCounts(a, inst.clauses)));
  let best = Math.max(...fit);

  const top = () =>
    pop
      .map((a, i) => ({ a, f: fit[i] }))
      .sort((x, y) => y.f - x.f)
      .slice(0, 30)
      .map((x) => x.a);

  yield { generation: 0, best, top: top() };

  for (let g = 1; g <= s.generations; g++) {
    const ranked = fit.map((f, i) => ({ f, i })).sort((a, b) => b.f - a.f);
    const nextPop: Uint8Array[] = [pop[ranked[0].i].slice()];
    const nextFit: number[] = [ranked[0].f];
    while (nextPop.length < s.popSize) {
      const pa = tournamentSelect(pop, fit, s.tournament, rand);
      const pb = tournamentSelect(pop, fit, s.tournament, rand);
      const child = bitFlipMutate(uniformCrossover(pa, pb, rand), rate, rand);
      let cf: number;
      if (rand() < s.lsRate) cf = localSearch(child, inst, pos, neg, lsMax, rand);
      else cf = fastCountSatisfied(computeSatCounts(child, inst.clauses));
      nextPop.push(child);
      nextFit.push(cf);
      if (cf > best) best = cf;
    }
    pop = nextPop;
    fit = nextFit;
    yield { generation: g, best, top: top() };
  }
}

export function runToEnd(inst: Instance, s: SolverSettings): number[] {
  const out: number[] = [];
  for (const r of solve(inst, s)) out.push(r.best);
  return out;
}
