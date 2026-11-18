// Section 13: the build fails if any stored headline number drifts from the data.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  toSeries,
  headline,
  extremes,
  groupMae,
  hourOf,
  monthKey,
  rmse,
  meanBias,
  directional,
  mae,
  type PredictionFile,
} from './forecastStats';
import { relabel, countLabels, type SignalRow } from './signals';
import { audit, splitAuthors, formatLike } from './citations';
import stored from '../content/generated/forecastStored.json';
import { forecastFacts } from '../content/forecast';

const read = (p: string) => JSON.parse(readFileSync(new URL(`../../public/data/forecast/${p}`, import.meta.url), 'utf8'));
const s = toSeries(read('predictions.json') as PredictionFile);

describe('headline', () => {
  const h = headline(s);
  it('MAE 13.60', () => expect(Math.abs(h.mae - forecastFacts.mae)).toBeLessThan(0.005));
  it('directional accuracy 86.7% over 11,989 hours', () => {
    expect(Math.abs(h.directional * 100 - forecastFacts.directional)).toBeLessThan(0.05);
    expect(h.directionalCounted).toBe(11989);
  });
  it('skill +0.61 against a naive MAE of 34.84', () => {
    expect(Math.abs(h.naiveMae - 34.84)).toBeLessThan(0.005);
    expect(Math.abs(h.skill - forecastFacts.skill)).toBeLessThan(0.005);
  });
  it('11,999 hours', () => expect(h.hours).toBe(11999));
});

describe('explorer facts', () => {
  const e = extremes(s);
  it('highest price 936.28 at 16:00 UTC on 12 December 2024', () => {
    expect(e.highest.price).toBe(936.28);
    expect(new Date(e.highest.time * 1000).toISOString()).toBe('2024-12-12T16:00:00.000Z');
  });
  it('worst day 12 December 2024, average miss 212.6', () => {
    expect(e.worstDay.day).toBe('2024-12-12');
    expect(e.worstDay.mae.toFixed(1)).toBe('212.6');
  });
  it('lowest price -250.32 at 11:00 UTC on 11 May 2025', () => {
    expect(e.lowest.price).toBe(-250.32);
    expect(new Date(e.lowest.time * 1000).toISOString()).toBe('2025-05-11T11:00:00.000Z');
  });
  it('best day 29 July 2025, average miss 3.21', () => {
    expect(e.bestDay.day).toBe('2025-07-29');
    expect(e.bestDay.mae.toFixed(2)).toBe('3.21');
  });
  it('619 negative hours', () => expect(e.negativeHours).toBe(619));
});

describe('stages', () => {
  const rows: [keyof typeof s, number, number, number, number | null][] = [
    ['naive', 34.84, 57.43, 0.19, null],
    ['p1', 15.29, 28.62, 7.72, 84.0],
    ['p2', 13.27, 27.18, 4.86, 86.0],
    ['pred', 13.6, 27.01, 0.5, 86.7],
  ];
  it.each(rows)('%s', (key, m, r, b, d) => {
    const p = s[key] as number[];
    expect(mae(s.actual, p).toFixed(2)).toBe(m.toFixed(2));
    expect(rmse(s.actual, p).toFixed(2)).toBe(r.toFixed(2));
    expect(Math.abs(meanBias(s.actual, p)).toFixed(2)).toBe(b.toFixed(2));
    if (d !== null) expect((directional(s.actual, p, s.naive).accuracy * 100).toFixed(1)).toBe(d.toFixed(1));
  });
  it('final stage is weakest at 16:00 UTC (26.65)', () => {
    const h = groupMae(s, hourOf);
    expect(h.get(16)!.toFixed(2)).toBe('26.65');
    const worst = [...h.entries()].sort((a, b) => b[1] - a[1])[0][0];
    expect(worst).toBe(16);
  });
  it('December 2024 worst month at 25.58, December 2025 best at 9.37', () => {
    const m = groupMae(s, monthKey);
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
    expect(sorted[0][0]).toBe('2024-12');
    expect(sorted[0][1].toFixed(2)).toBe('25.58');
    expect(sorted.at(-1)![0]).toBe('2025-12');
    expect(sorted.at(-1)![1].toFixed(2)).toBe('9.37');
  });
  it('stored weekly and monthly misses', () => {
    expect(stored.accuracy.weekly.lgbm_ridge_ensemble.mae.toFixed(2)).toBe('5.79');
    expect(stored.accuracy.weekly.pass2_raw.mae.toFixed(2)).toBe('7.67');
    expect(stored.accuracy.monthly.lgbm_ridge_ensemble.mae.toFixed(2)).toBe('4.00');
    expect(stored.accuracy.monthly.pass2_raw.mae.toFixed(2)).toBe('6.94');
  });
});

describe('cross-validation folds', () => {
  const f = stored.folds;
  const col = (k: string) => f.map((r) => (r as Record<string, number>)[k]);
  const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
  it.each([
    ['lgbm_ridge_ensemble', 42.75, 23.53, 84.37],
    ['lightgbm', 43.32, 26.54, 88.38],
    ['xgboost', 44.53, 26.87, 92.07],
    ['linear_regression', 48.16, 20.27, 90.94],
    ['seasonal_naive', 86.21, 44.53, 135.96],
  ])('%s', (k, m, lo, hi) => {
    expect(f.length).toBe(12);
    expect(mean(col(k)).toFixed(2)).toBe(m.toFixed(2));
    expect(Math.abs(Math.min(...col(k)) - lo)).toBeLessThan(0.006);
    expect(Math.abs(Math.max(...col(k)) - hi)).toBeLessThan(0.006);
  });
});

describe('signals', () => {
  const rows = read('signals.json') as SignalRow[];
  it('500 days', () => expect(rows.length).toBe(500));
  it('default thresholds reproduce the stored counts exactly', () => {
    expect(countLabels(relabel(rows, 3, 8))).toEqual({
      STRONG_BUY: 111,
      BUY: 28,
      HOLD: 37,
      SELL: 42,
      STRONG_SELL: 154,
      INVALIDATED: 118,
      NO_DATA: 10,
    });
  });
  it('flag counts', () => {
    const c = (k: string) => rows.filter((r) => r.flags.includes(k)).length;
    expect([c('gas_spike'), c('wind_revision'), c('residual_load_swing'), c('negative_price_regime'), c('high_error_regime')]).toEqual([
      7, 20, 20, 74, 10,
    ]);
    expect(rows.filter((r) => r.flags.length > 0).length).toBe(118);
  });
  it('confidence: 250 days between 50% and 75%, 249 below 50%', () => {
    expect(rows.filter((r) => r.conf !== null && r.conf >= 0.5 && r.conf < 0.75).length).toBe(250);
    expect(rows.filter((r) => r.conf !== null && r.conf < 0.5).length).toBe(249);
    expect(rows.filter((r) => r.conf !== null && r.conf >= 0.75).length).toBe(0);
  });
});

describe('briefing audit', () => {
  const briefs = read('briefings.json') as {
    date: string;
    sections: { title: string; text: string }[];
    evidence: Record<string, unknown>;
    anomaly: { title: string; text: string }[] | null;
  }[];
  it.each(briefs.map((b) => [b.date, b] as const))('%s verifies 21 of 21', (_, b) => {
    const text = b.sections.map((x) => x.text).join('\n');
    const r = audit(text, b.evidence);
    expect(r.total).toBe(21);
    expect(r.verified).toBe(21);
  });
  it('breaking 18.0 to 21.0 gives 20 of 21 with one mismatch', () => {
    const b = briefs[0];
    const text = b.sections.map((x) => x.text).join('\n').replace('signal_month_base = 18.0]', 'signal_month_base = 21.0]');
    const r = audit(text, b.evidence);
    expect(r.verified).toBe(20);
    const bad = r.rows.find((x) => x.verdict === 'MISMATCH')!;
    expect(bad.value).toBe('21.0');
    expect(formatLike(bad.actual!, bad.value)).toBe('18.0');
  });
  it('anomaly report verifies 3 of 3', () => {
    const b = briefs[0];
    const r = audit(b.anomaly!.map((x) => x.text).join('\n'), b.evidence);
    expect(r.verified).toBe(3);
    expect(r.total).toBe(3);
  });
  it('model sentences contain no numbers', () => {
    for (const b of briefs)
      for (const sec of b.sections)
        for (const part of splitAuthors(sec.text)) if (part.by === 'model') expect(part.text).not.toMatch(/\d/);
  });
});
