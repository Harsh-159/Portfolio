// Forecast data helpers: parse the real CSV export when present, otherwise
// generate clearly-badged synthetic data with a realistic shape.

export interface ForecastPoint {
  t: number; // unix seconds
  actual: number;
  predicted: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Synthetic German day-ahead price shape: a twin daily peak, lower weekends,
 * gaussian noise and the occasional spike. Predicted is a damped, lagged
 * version of actual with its own noise. Illustrative only.
 */
export function generateSyntheticForecast(n = 12000, seed = 20260612): ForecastPoint[] {
  const rand = mulberry32(seed);
  const gauss = () => (rand() + rand() + rand() + rand() - 2) * 0.5; // ~N(0,1)-ish
  const start = Date.UTC(2024, 0, 1) / 1000;
  const points: ForecastPoint[] = [];

  let prevActual = 80;
  for (let i = 0; i < n; i++) {
    const hour = i % 24;
    const day = Math.floor(i / 24);
    const dow = day % 7;

    const morning = 22 * Math.exp(-((hour - 8) ** 2) / 8);
    const evening = 28 * Math.exp(-((hour - 19) ** 2) / 6);
    const weekend = dow >= 5 ? -18 : 0;
    const drift = 8 * Math.sin((i / (24 * 30)) * Math.PI * 2);
    const spike = rand() < 0.004 ? 60 + rand() * 90 : 0;

    const actual = Math.max(
      0,
      78 + morning + evening + weekend + drift + spike + gauss() * 6,
    );

    // Predicted: lag and damp the actual, miss the spikes partially.
    const predicted = Math.max(
      0,
      0.55 * actual + 0.35 * prevActual + 10 - spike * 0.6 + gauss() * 4,
    );

    points.push({ t: start + i * 3600, actual: +actual.toFixed(2), predicted: +predicted.toFixed(2) });
    prevActual = actual;
  }
  return points;
}

/** Parse a `timestamp,actual,predicted` hourly CSV. Returns null if malformed. */
export function parseForecastCsv(text: string): ForecastPoint[] | null {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const header = lines[0].toLowerCase();
  if (!header.includes('timestamp') || !header.includes('actual') || !header.includes('predicted')) {
    return null;
  }
  const points: ForecastPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 3) continue;
    const t = parseTimestamp(cols[0]);
    const actual = Number(cols[1]);
    const predicted = Number(cols[2]);
    if (t === null || !Number.isFinite(actual) || !Number.isFinite(predicted)) continue;
    points.push({ t, actual, predicted });
  }
  return points.length > 0 ? points : null;
}

function parseTimestamp(raw: string): number | null {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    // Treat 13-digit values as milliseconds.
    return trimmed.length >= 13 ? Math.floor(num / 1000) : num;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000);
}

/** Overall directional accuracy: fraction of hours where the sign of the
 *  hour-on-hour change matches between predicted and actual. */
export function directionalAccuracy(points: ForecastPoint[]): number {
  if (points.length < 2) return 0;
  let correct = 0;
  for (let i = 1; i < points.length; i++) {
    const da = Math.sign(points[i].actual - points[i - 1].actual);
    const dp = Math.sign(points[i].predicted - points[i - 1].predicted);
    if (da === dp) correct++;
  }
  return correct / (points.length - 1);
}

/** Rolling directional accuracy over a trailing window (default 30 days). */
export function rollingDirectionalAccuracy(
  points: ForecastPoint[],
  window = 720,
): (number | null)[] {
  const hits: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const da = Math.sign(points[i].actual - points[i - 1].actual);
    const dp = Math.sign(points[i].predicted - points[i - 1].predicted);
    hits.push(da === dp ? 1 : 0);
  }
  const out: (number | null)[] = [null];
  let sum = 0;
  for (let i = 0; i < hits.length; i++) {
    sum += hits[i];
    if (i >= window) sum -= hits[i - window];
    const count = Math.min(i + 1, window);
    out.push(i + 1 >= window ? sum / count : null);
  }
  return out;
}
