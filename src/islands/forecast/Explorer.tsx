// Section 13.3: Figure 2, the forecast explorer. uPlot for the long time series.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { dailyAverages, rangeIndex, mae, dayKey, type Series } from '../../lib/forecastStats';
import tail from '../../content/generated/forecastTail.json';
import { Frame, ShowData, token, useTheme, fmtN } from '../shared/ui';
import { usePredictions } from './data';

const DAY = 86400;
const iso = (d: string) => Date.parse(`${d}T00:00:00Z`) / 1000;
const DEFAULT_FROM = iso('2026-03-02');
const DEFAULT_TO = iso('2026-03-16');
const DATA_END = DEFAULT_TO;
const DATA_START = iso('2024-11-01');
const HOURLY_BELOW = 45 * DAY;

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dateFmtShort = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

function rangeWords(a: number, b: number) {
  const da = new Date(a * 1000);
  const db = new Date((b - 1) * 1000);
  const sameYear = da.getUTCFullYear() === db.getUTCFullYear();
  const sameMonth = sameYear && da.getUTCMonth() === db.getUTCMonth();
  if (sameMonth && da.getUTCDate() === db.getUTCDate()) return `${dateFmt.format(da)}`;
  const first = sameMonth ? String(da.getUTCDate()) : sameYear ? dateFmtShort.format(da) : dateFmt.format(da);
  return `${first} to ${dateFmt.format(db)}`;
}

const JUMPS = [
  { label: 'Worst day', day: '2024-12-12' },
  { label: 'Best day', day: '2025-07-29' },
  { label: 'Most negative price', day: '2025-05-11' },
];
const RANGES = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 91 },
  { label: 'All', days: 0 },
];

function readUrl() {
  const p = new URLSearchParams(location.search);
  const f = p.get('from');
  const t = p.get('to');
  const d = p.get('day');
  const ok = (s: string | null) => s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(iso(s));
  return {
    from: ok(f) ? Math.max(DATA_START, iso(f!)) : null,
    to: ok(t) ? Math.min(DATA_END, iso(t!) + DAY) : null,
    day: ok(d) ? d : null,
    naive: p.get('naive') === '1',
  };
}

function writeUrl(from: number, to: number, day: string | null, naive: boolean) {
  const url = new URL(location.href);
  const set = (k: string, v: string | null) => (v === null ? url.searchParams.delete(k) : url.searchParams.set(k, v));
  const isDefault = Math.abs(from - DEFAULT_FROM) < 3600 && Math.abs(to - DEFAULT_TO) < 3600;
  set('from', isDefault ? null : dayKey(from));
  set('to', isDefault ? null : dayKey(to - 1));
  set('day', day);
  set('naive', naive ? '1' : null);
  history.replaceState(history.state, '', url.toString());
}

function StaticPreview() {
  const W = 760;
  const H = 300;
  const all = [...tail.actual, ...tail.pred];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const x = (i: number) => 40 + (i / (tail.actual.length - 1)) * (W - 50);
  const y = (v: number) => H - 30 - ((v - lo) / (hi - lo)) * (H - 50);
  const p = (s: number[]) => s.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return (
    <svg class="svg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Actual and forecast German day-ahead prices, 2 to 15 March 2026, hourly.">
      <path d={p(tail.actual)} fill="none" stroke="var(--series-1)" stroke-width="1.5" />
      <path d={p(tail.pred)} fill="none" stroke="var(--series-2)" stroke-width="1.5" stroke-dasharray="5 4" />
      <text x="40" y={H - 8}>
        2 March 2026
      </text>
      <text x={W - 10} y={H - 8} text-anchor="end">
        15 March 2026, UTC
      </text>
    </svg>
  );
}

function DayPanel({ s, day }: { s: Series; day: string }) {
  const t0 = iso(day);
  const [a, b] = rangeIndex(s.time, t0, t0 + DAY);
  if (b <= a) return <p class="small">No data for this day.</p>;
  const act = s.actual.slice(a, b);
  const pr = s.pred.slice(a, b);
  const m = mae(s.actual, s.pred, a, b);
  const lo = Math.min(0, ...act, ...pr);
  const hi = Math.max(...act, ...pr);
  const W = 720;
  const H = 220;
  const bw = (W - 50) / 24;
  const y = (v: number) => 20 + ((hi - v) / (hi - lo || 1)) * (H - 50);
  return (
    <div class="pb-panel">
      <h4>
        {dateFmt.format(new Date(t0 * 1000))}: average miss {fmtN(m, 2)} EUR/MWh
      </h4>
      <div class="legend-keys">
        <span class="lk lk-solid lk-s1">Actual</span>
        <span class="lk lk-dashed lk-s2">Forecast</span>
      </div>
      <svg class="svg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Hourly actual and forecast prices on ${dateFmt.format(new Date(t0 * 1000))}. Average miss ${fmtN(m, 2)} EUR/MWh.`}>
        <line class="axis" x1="40" x2={W - 10} y1={y(0)} y2={y(0)} />
        <text x="36" y={y(hi) + 4} text-anchor="end">
          {Math.round(hi)}
        </text>
        <text x="36" y={y(0) + 4} text-anchor="end">
          0
        </text>
        {act.map((v, i) => {
          const hr = new Date(s.time[a + i] * 1000).getUTCHours();
          const x = 44 + hr * bw;
          return (
            <g>
              <rect x={x} y={Math.min(y(v), y(0))} width={bw * 0.42} height={Math.abs(y(v) - y(0))} fill="var(--series-1)" />
              <rect x={x + bw * 0.44} y={Math.min(y(pr[i]), y(0))} width={bw * 0.42} height={Math.abs(y(pr[i]) - y(0))} fill="none" stroke="var(--series-2)" stroke-width="1.5" stroke-dasharray="3 2" />
              {hr % 3 === 0 && (
                <text x={x + bw / 2} y={H - 8} text-anchor="middle">
                  {String(hr).padStart(2, '0')}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p class="small soft">Hours are UTC. Prices in EUR/MWh.</p>
    </div>
  );
}

export default function Explorer() {
  const data = usePredictions();
  const theme = useTheme();
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [naive, setNaive] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [idx, setIdx] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);
  const modeRef = useRef<'hourly' | 'daily'>('hourly');
  const xsRef = useRef<number[]>([]);
  const inited = useRef(false);

  useEffect(() => {
    const u = readUrl();
    if (u.from !== null && u.to !== null && u.to > u.from) {
      setFrom(u.from);
      setTo(u.to);
    }
    if (u.day) setDay(u.day);
    setNaive(u.naive);
    inited.current = true;
  }, []);
  useEffect(() => {
    if (inited.current) writeUrl(from, to, day, naive);
  }, [from, to, day, naive]);

  const s = data.status === 'ready' ? data.data : null;
  const daily = useMemo(() => (s ? dailyAverages(s, 0, s.time.length) : null), [s]);
  const mode: 'hourly' | 'daily' = to - from < HOURLY_BELOW ? 'hourly' : 'daily';

  const dataFor = (m: 'hourly' | 'daily'): uPlot.AlignedData =>
    m === 'hourly' ? [s!.time, s!.actual, s!.pred, s!.naive] : [daily!.time, daily!.actual, daily!.pred, daily!.naive];

  // Create the chart once data, theme and size are known.
  useEffect(() => {
    if (!s || !daily || !host.current) return;
    const el = host.current;
    const w = el.clientWidth;
    const fmtTick = (_u: uPlot, splits: number[]) =>
      splits.map((v) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(v * 1000)));
    const opts: uPlot.Options = {
      width: w,
      height: Math.max(280, Math.min(380, w * 0.45)),
      tzDate: (ts) => uPlot.tzDate(new Date(ts * 1e3), 'Etc/UTC'),
      cursor: { drag: { x: true, y: false, setScale: true }, focus: { prox: 30 } },
      legend: { show: false },
      scales: { x: { time: true } },
      axes: [
        { stroke: token('ink-soft'), grid: { stroke: token('rule'), width: 1 }, ticks: { stroke: token('rule') }, values: fmtTick, font: '13px "Atkinson Hyperlegible Next", sans-serif' },
        {
          stroke: token('ink-soft'),
          grid: { stroke: token('rule'), width: 1 },
          ticks: { stroke: token('rule') },
          font: '13px "Atkinson Hyperlegible Next", sans-serif',
          label: 'EUR/MWh',
          labelFont: '13px "Atkinson Hyperlegible Next", sans-serif',
          size: 60,
        },
      ],
      series: [
        {},
        { label: 'Actual', stroke: token('series-1'), width: 1.6 },
        { label: 'Forecast', stroke: token('series-2'), width: 1.6, dash: [6, 4] },
        { label: "Last week's price", stroke: token('series-4'), width: 1.4, dash: [2, 3], show: naive },
      ],
      hooks: {
        setScale: [
          (u, key) => {
            if (key !== 'x') return;
            const mn = u.scales.x.min!;
            const mx = u.scales.x.max!;
            setFrom(Math.max(DATA_START, Math.floor(mn / 3600) * 3600));
            setTo(Math.min(DATA_END, Math.ceil(mx / 3600) * 3600));
          },
        ],
        setCursor: [(u) => setIdx(u.cursor.idx ?? null)],
      },
    };
    modeRef.current = mode;
    const d = dataFor(mode);
    xsRef.current = d[0] as number[];
    const u = new uPlot(opts, d, el);
    u.setScale('x', { min: from, max: to });
    plot.current = u;

    u.over.addEventListener('click', () => {
      const i = u.cursor.idx;
      if (i != null) setDay(dayKey(xsRef.current[i]));
    });
    u.over.addEventListener('dblclick', () => {
      setFrom(DEFAULT_FROM);
      setTo(DEFAULT_TO);
    });

    // Touch: one finger pans, two fingers pinch to zoom.
    let touch: { x: number; d: number; min: number; max: number } | null = null;
    const span = () => u.scales.x.max! - u.scales.x.min!;
    u.over.addEventListener(
      'touchstart',
      (e) => {
        const t = e.touches;
        touch = { x: t.length === 2 ? (t[0].clientX + t[1].clientX) / 2 : t[0].clientX, d: t.length === 2 ? Math.abs(t[0].clientX - t[1].clientX) : 0, min: u.scales.x.min!, max: u.scales.x.max! };
      },
      { passive: true },
    );
    u.over.addEventListener(
      'touchmove',
      (e) => {
        if (!touch) return;
        const t = e.touches;
        const pxPerSec = u.over.clientWidth / (touch.max - touch.min);
        let min = touch.min;
        let max = touch.max;
        if (t.length === 2 && touch.d > 0) {
          const d = Math.abs(t[0].clientX - t[1].clientX);
          const sc = touch.d / Math.max(20, d);
          const mid = (touch.min + touch.max) / 2;
          const half = ((touch.max - touch.min) * sc) / 2;
          min = mid - half;
          max = mid + half;
        } else {
          const dx = (t[0].clientX - touch.x) / pxPerSec;
          min = touch.min - dx;
          max = touch.max - dx;
        }
        if (max - min < DAY) return;
        u.setScale('x', { min: Math.max(DATA_START, min), max: Math.min(DATA_END, max) });
        e.preventDefault();
      },
      { passive: false },
    );
    u.over.addEventListener('touchend', () => (touch = null));
    void span;

    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth;
      if (nw && Math.abs(nw - u.width) > 2) u.setSize({ width: nw, height: Math.max(280, Math.min(380, nw * 0.45)) });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      u.destroy();
      plot.current = null;
    };
  }, [s, daily, theme]);

  // Switch between hourly points and daily averages as the visible range changes.
  useEffect(() => {
    const u = plot.current;
    if (!u || !s) return;
    if (modeRef.current !== mode) {
      modeRef.current = mode;
      const d = dataFor(mode);
      xsRef.current = d[0] as number[];
      u.setData(d, false);
    }
    if (Math.abs(u.scales.x.min! - from) > 1800 || Math.abs(u.scales.x.max! - to) > 1800) u.setScale('x', { min: from, max: to });
  }, [from, to, mode]);

  useEffect(() => {
    plot.current?.setSeries(3, { show: naive });
  }, [naive]);

  const onKey = (e: KeyboardEvent) => {
    const u = plot.current;
    if (!u) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const xs = xsRef.current;
    let i = idx ?? rangeIndex(xs, from, to)[0];
    i = Math.max(0, Math.min(xs.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    u.setCursor({ left: u.valToPos(xs[i], 'x'), top: u.valToPos((u.data[1][i] as number) ?? 0, 'y') });
    setIdx(i);
  };

  const jump = (d: string) => {
    const t0 = iso(d);
    setFrom(Math.max(DATA_START, t0 - 3 * DAY));
    setTo(Math.min(DATA_END, t0 + 4 * DAY));
    setDay(d);
  };
  const setRange = (days: number) => {
    if (days === 0) {
      setFrom(DATA_START);
      setTo(DATA_END);
    } else {
      setFrom(DATA_END - days * DAY);
      setTo(DATA_END);
    }
  };

  const visMae = useMemo(() => {
    if (!s) return null;
    const [a, b] = rangeIndex(s.time, from, to);
    return b > a ? mae(s.actual, s.pred, a, b) : null;
  }, [s, from, to]);

  const readout = (() => {
    if (!plot.current || idx === null) return null;
    const d = plot.current.data;
    const t = d[0][idx] as number;
    const act = d[1][idx] as number;
    const pr = d[2][idx] as number;
    const nv = d[3][idx] as number;
    return `${mode === 'daily' ? `${dateFmt.format(new Date(t * 1000))}, daily average` : `${timeFmt.format(new Date(t * 1000))} UTC`}. Actual ${fmtN(act, 2)}, forecast ${fmtN(pr, 2)}, miss ${fmtN(Math.abs(act - pr), 2)} EUR/MWh${naive ? `. Last week ${fmtN(nv, 2)}` : ''}.`;
  })();

  const words =
    data.status === 'error'
      ? 'The data for this figure did not load.'
      : visMae === null
        ? 'Loading data. From 2 to 15 March 2026, hourly.'
        : `From ${rangeWords(from, to)} the average miss was ${fmtN(visMae, 2)} EUR/MWh.`;

  const tableRows = useMemo(() => {
    if (!s || !daily) return [];
    if (mode === 'daily') {
      const [a, b] = rangeIndex(daily.time, from, to);
      return Array.from({ length: Math.min(400, b - a) }, (_, k) => [daily.time[a + k], daily.actual[a + k], daily.pred[a + k]]);
    }
    const [a, b] = rangeIndex(s.time, from, to);
    return Array.from({ length: Math.min(400, b - a) }, (_, k) => [s.time[a + k], s.actual[a + k], s.pred[a + k]]);
  }, [s, daily, from, to, mode]);

  return (
    <Frame
      id="explorer"
      num={2}
      title="Forecast explorer"
      badge="real"
      wide
      onReset={() => {
        setFrom(DEFAULT_FROM);
        setTo(DEFAULT_TO);
        setDay(null);
        setNaive(false);
      }}
      words={words}
      what="Every hour of the held-out test: the real price and the forecast made the day before. Drag across the chart to zoom, double-click to reset, and select a day to see its 24 hours side by side."
      tryThis={['Press Worst day.', "Turn on last week's price and compare it with the forecast.", 'Press All, then drag across a single month.']}
      controls={
        <>
          <div class="chips" role="group" aria-label="Range">
            {RANGES.map((r) => {
              const on = r.days === 0 ? to - from >= DATA_END - DATA_START - DAY : Math.abs(to - from - r.days * DAY) < 3600 && to === DATA_END;
              return (
                <button class="chip" type="button" aria-pressed={on} onClick={() => setRange(r.days)}>
                  {r.label}
                </button>
              );
            })}
          </div>
          <div class="btn-row" style={{ marginTop: '10px' }}>
            {JUMPS.map((j) => (
              <button class="btn btn-small" type="button" onClick={() => jump(j.day)}>
                {j.label}
              </button>
            ))}
            <label class="check">
              <input type="checkbox" checked={naive} onChange={() => setNaive(!naive)} />
              Last week's price
            </label>
          </div>
        </>
      }
    >
      <div class="legend-keys">
        <span class="lk lk-solid lk-s1">Actual price</span>
        <span class="lk lk-dashed lk-s2">Forecast</span>
        {naive && <span class="lk lk-dotted lk-s4">Last week's price</span>}
      </div>
      {mode === 'daily' && s && <p class="small soft">Showing daily averages. Zoom in for hours.</p>}
      <div
        ref={host}
        class="uplot-host"
        tabIndex={0}
        role="img"
        aria-label={`Time-series chart. ${words} Use the left and right arrow keys to move the crosshair.`}
        onKeyDown={onKey as never}
      >
        {!s && <StaticPreview />}
      </div>
      <p class="readout" aria-live="polite">
        {readout ?? 'Times are UTC. Point at the chart, or focus it and use the arrow keys, to read values.'}
      </p>
      {data.status === 'error' && (
        <p>
          The data for this figure did not load.{' '}
          <button class="btn btn-small" type="button" onClick={data.retry}>
            Try again
          </button>
        </p>
      )}
      {s && day && <DayPanel s={s} day={day} />}
      {s && (
        <ShowData>
          <table>
            <thead>
              <tr>
                <th scope="col">{mode === 'daily' ? 'Day, UTC' : 'Hour, UTC'}</th>
                <th scope="col" class="r">
                  Actual, EUR/MWh
                </th>
                <th scope="col" class="r">
                  Forecast, EUR/MWh
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(([t, a, p]) => (
                <tr>
                  <td>{mode === 'daily' ? dateFmt.format(new Date(t * 1000)) : timeFmt.format(new Date(t * 1000))}</td>
                  <td class="r">{fmtN(a, 2)}</td>
                  <td class="r">{fmtN(p, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tableRows.length >= 400 && <p class="small soft">First 400 rows of the visible range.</p>}
        </ShowData>
      )}
    </Frame>
  );
}
