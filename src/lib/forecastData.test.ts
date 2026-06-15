import { describe, it, expect } from 'vitest';
import {
  generateSyntheticForecast,
  parseForecastCsv,
  directionalAccuracy,
  rollingDirectionalAccuracy,
} from './forecastData';

describe('generateSyntheticForecast', () => {
  it('produces the requested number of hourly points, deterministically', () => {
    const a = generateSyntheticForecast(48, 1);
    const b = generateSyntheticForecast(48, 1);
    expect(a).toHaveLength(48);
    expect(a).toEqual(b);
    expect(a[1].t - a[0].t).toBe(3600);
  });
});

describe('parseForecastCsv', () => {
  it('parses a well-formed csv', () => {
    const csv = 'timestamp,actual,predicted\n2024-01-01T00:00:00Z,80,78\n2024-01-01T01:00:00Z,82,80';
    const points = parseForecastCsv(csv)!;
    expect(points).toHaveLength(2);
    expect(points[0].actual).toBe(80);
    expect(points[1].predicted).toBe(80);
  });

  it('accepts unix-second timestamps', () => {
    const csv = 'timestamp,actual,predicted\n1704067200,80,78';
    expect(parseForecastCsv(csv)![0].t).toBe(1704067200);
  });

  it('rejects input without the right header', () => {
    expect(parseForecastCsv('a,b,c\n1,2,3')).toBeNull();
    expect(parseForecastCsv('')).toBeNull();
  });
});

describe('directionalAccuracy', () => {
  it('is 1 when predicted moves the same direction every step', () => {
    const points = [
      { t: 0, actual: 1, predicted: 10 },
      { t: 1, actual: 2, predicted: 11 }, // both up
      { t: 2, actual: 1, predicted: 9 }, // both down
    ];
    expect(directionalAccuracy(points)).toBe(1);
  });

  it('is 0 when directions always disagree', () => {
    const points = [
      { t: 0, actual: 1, predicted: 10 },
      { t: 1, actual: 2, predicted: 9 }, // actual up, predicted down
    ];
    expect(directionalAccuracy(points)).toBe(0);
  });
});

describe('rollingDirectionalAccuracy', () => {
  it('aligns to the points array and only emits once the window fills', () => {
    const points = generateSyntheticForecast(50, 3);
    const roll = rollingDirectionalAccuracy(points, 24);
    expect(roll).toHaveLength(points.length);
    expect(roll[0]).toBeNull();
    expect(roll[10]).toBeNull(); // window not yet full
    expect(typeof roll[40]).toBe('number');
    expect(roll[40]!).toBeGreaterThanOrEqual(0);
    expect(roll[40]!).toBeLessThanOrEqual(1);
  });
});
