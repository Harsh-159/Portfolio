// Section 13: every headline number recomputed from the stored predictions.

export interface PredictionFile {
  start: string;
  t: number[];
  actual: number[];
  pred: number[];
  p1: number[];
  p2: number[];
  naive: number[];
}

export interface Series {
  /** Unix seconds, UTC. */
  time: number[];
  actual: number[];
  pred: number[];
  p1: number[];
  p2: number[];
  naive: number[];
}

export function toSeries(f: PredictionFile): Series {
  const t0 = Date.parse(f.start) / 1000;
  return {
    time: f.t.map((h) => t0 + h * 3600),
    actual: f.actual,
    pred: f.pred,
    p1: f.p1,
    p2: f.p2,
    naive: f.naive,
  };
}

export type StageKey = 'naive' | 'p1' | 'p2' | 'pred';

export function mae(a: number[], p: number[], from = 0, to = a.length): number {
  let s = 0;
  for (let i = from; i < to; i++) s += Math.abs(a[i] - p[i]);
  return s / Math.max(1, to - from);
}

export function rmse(a: number[], p: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - p[i]) ** 2;
  return Math.sqrt(s / a.length);
}

export function meanBias(a: number[], p: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += p[i] - a[i];
  return s / a.length;
}

/** Same sign of (pred - last week) and (actual - last week). Zero differences are left out. */
export function directional(a: number[], p: number[], naive: number[]): { accuracy: number; counted: number } {
  let hit = 0;
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    const da = Math.sign(a[i] - naive[i]);
    const dp = Math.sign(p[i] - naive[i]);
    if (da === 0 || dp === 0) continue;
    n++;
    if (da === dp) hit++;
  }
  return { accuracy: hit / n, counted: n };
}

export interface Headline {
  mae: number;
  directional: number;
  directionalCounted: number;
  skill: number;
  naiveMae: number;
  hours: number;
}

export function headline(s: Series): Headline {
  const m = mae(s.actual, s.pred);
  const nm = mae(s.actual, s.naive);
  const d = directional(s.actual, s.pred, s.naive);
  return { mae: m, directional: d.accuracy, directionalCounted: d.counted, skill: 1 - m / nm, naiveMae: nm, hours: s.time.length };
}

export const dayKey = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);
export const monthKey = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 7);
export const hourOf = (unix: number) => new Date(unix * 1000).getUTCHours();

export function groupMae(
  s: Series,
  key: (t: number) => string | number,
  stage: StageKey = 'pred',
): Map<string | number, number> {
  const sum = new Map<string | number, number>();
  const cnt = new Map<string | number, number>();
  const p = s[stage];
  for (let i = 0; i < s.time.length; i++) {
    const k = key(s.time[i]);
    sum.set(k, (sum.get(k) ?? 0) + Math.abs(s.actual[i] - p[i]));
    cnt.set(k, (cnt.get(k) ?? 0) + 1);
  }
  const out = new Map<string | number, number>();
  for (const [k, v] of sum) out.set(k, v / cnt.get(k)!);
  return out;
}

export function extremes(s: Series) {
  let hi = 0;
  let lo = 0;
  let negative = 0;
  for (let i = 0; i < s.actual.length; i++) {
    if (s.actual[i] > s.actual[hi]) hi = i;
    if (s.actual[i] < s.actual[lo]) lo = i;
    if (s.actual[i] < 0) negative++;
  }
  const days = groupMae(s, dayKey);
  let worst = '';
  let best = '';
  for (const [k, v] of days) {
    if (!worst || v > days.get(worst)!) worst = k as string;
    if (!best || v < days.get(best)!) best = k as string;
  }
  return {
    highest: { time: s.time[hi], price: s.actual[hi] },
    lowest: { time: s.time[lo], price: s.actual[lo] },
    negativeHours: negative,
    worstDay: { day: worst, mae: days.get(worst)! },
    bestDay: { day: best, mae: days.get(best)! },
  };
}

/** Index range [from, to) covering unix seconds [a, b). */
export function rangeIndex(time: number[], a: number, b: number): [number, number] {
  let from = 0;
  while (from < time.length && time[from] < a) from++;
  let to = from;
  while (to < time.length && time[to] < b) to++;
  return [from, to];
}

/** Daily averages for long views. */
export function dailyAverages(s: Series, from: number, to: number) {
  const out = { time: [] as number[], actual: [] as number[], pred: [] as number[], naive: [] as number[] };
  let i = from;
  while (i < to) {
    const k = dayKey(s.time[i]);
    let j = i;
    let sa = 0;
    let sp = 0;
    let sn = 0;
    while (j < to && dayKey(s.time[j]) === k) {
      sa += s.actual[j];
      sp += s.pred[j];
      sn += s.naive[j];
      j++;
    }
    const n = j - i;
    out.time.push(Date.parse(`${k}T12:00:00Z`) / 1000);
    out.actual.push(sa / n);
    out.pred.push(sp / n);
    out.naive.push(sn / n);
    i = j;
  }
  return out;
}

export const fmt = (x: number, d = 2) =>
  new Intl.NumberFormat('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);
