import { useEffect, useMemo, useState } from 'react';
import type { AlignedData, Options } from 'uplot';
import { HonestyBadge } from '../../../components/DemoChrome';
import { UplotChart } from '../../../components/UplotChart';
import {
  generateSyntheticForecast,
  parseForecastCsv,
  rollingDirectionalAccuracy,
  type ForecastPoint,
} from '../../../lib/forecastData';

const COLOURS = {
  actual: '#38bdf8',
  predicted: '#bef264',
  roll: '#8b5cf6',
  axis: '#94a3b8',
  grid: 'rgba(30,41,59,0.7)',
};

const METHODOLOGY = [
  'Walk-forward evaluation trains on a past window, predicts the next block, then rolls the window forward, so the model is always tested on data it has never seen.',
  'It mimics live deployment: at every step you only use information available at that moment, which avoids the look-ahead bias that inflates naive backtests.',
  'Directional accuracy is the headline metric because trading-adjacent decisions care more about whether the price goes up or down than the exact level.',
  'The forecaster is an ensemble of gradient-boosted trees (LightGBM) and a Ridge linear model, combining a flexible learner with a stable linear baseline.',
  'On top of the forecasts, an LLM produced RAG-grounded morning briefings, citing the drivers behind each day’s outlook.',
];

function axes() {
  return [
    { stroke: COLOURS.axis, grid: { stroke: COLOURS.grid, width: 1 }, ticks: { stroke: COLOURS.grid } },
    { stroke: COLOURS.axis, grid: { stroke: COLOURS.grid, width: 1 }, ticks: { stroke: COLOURS.grid } },
  ];
}

function DayDetail({ points, day }: { points: ForecastPoint[]; day: number }) {
  const slice = points.slice(day * 24, day * 24 + 24);
  if (slice.length === 0) return null;
  const max = Math.max(...slice.flatMap((p) => [p.actual, p.predicted]), 1);
  const date = new Date(slice[0].t * 1000).toISOString().slice(0, 10);

  return (
    <div className="rounded-lg border border-line bg-surface/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-mono text-sm text-fg">{date} · hour by hour</h3>
        <div className="flex gap-3 font-mono text-xs">
          <span className="text-[#38bdf8]">actual</span>
          <span className="text-live">predicted</span>
        </div>
      </div>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {slice.map((p, h) => (
          <div key={h} className="flex flex-1 flex-col items-center gap-0.5" title={`${h}:00`}>
            <div className="flex w-full items-end justify-center gap-[1px]" style={{ height: 100 }}>
              <span
                className="w-1/2 rounded-t-sm bg-[#38bdf8]/70"
                style={{ height: `${(p.actual / max) * 100}%` }}
              />
              <span
                className="w-1/2 rounded-t-sm bg-live/70"
                style={{ height: `${(p.predicted / max) * 100}%` }}
              />
            </div>
            {h % 3 === 0 && <span className="font-mono text-[9px] text-muted/60">{h}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ForecastTab() {
  const [points, setPoints] = useState<ForecastPoint[] | null>(null);
  const [synthetic, setSynthetic] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showMethod, setShowMethod] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/lab/forecast/results.csv')
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => {
        if (cancelled) return;
        const parsed = text ? parseForecastCsv(text) : null;
        if (parsed) {
          setPoints(parsed);
          setSynthetic(false);
        } else {
          setPoints(generateSyntheticForecast());
          setSynthetic(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPoints(generateSyntheticForecast());
          setSynthetic(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mainData: AlignedData = useMemo(() => {
    if (!points) return [[], [], []];
    return [points.map((p) => p.t), points.map((p) => p.actual), points.map((p) => p.predicted)];
  }, [points]);

  const rollData: AlignedData = useMemo(() => {
    if (!points) return [[], []];
    const roll = rollingDirectionalAccuracy(points);
    return [points.map((p) => p.t), roll];
  }, [points]);

  const mainOptions: Omit<Options, 'width'> = useMemo(
    () => ({
      height: 320,
      cursor: { drag: { x: true, y: false } },
      scales: { x: { time: true } },
      axes: axes(),
      series: [
        {},
        { label: 'actual', stroke: COLOURS.actual, width: 1, points: { show: false } },
        { label: 'predicted', stroke: COLOURS.predicted, width: 1, points: { show: false } },
      ],
    }),
    [],
  );

  const rollOptions: Omit<Options, 'width'> = useMemo(
    () => ({
      height: 160,
      cursor: { drag: { x: true, y: false } },
      scales: { x: { time: true }, y: { range: [0, 1] } },
      axes: axes(),
      series: [
        {},
        { label: '30-day directional accuracy', stroke: COLOURS.roll, width: 1, points: { show: false } },
      ],
    }),
    [],
  );

  const onSelect = (idx: number | null) => {
    if (idx === null || !points) return;
    setSelectedDay(Math.floor(idx / 24));
  };

  return (
    <div>
      <div className="rounded-lg border border-line bg-surface/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-mono text-sm text-fg">Actual vs predicted day-ahead price (€/MWh)</h2>
          {synthetic && (
            <HonestyBadge>Sample data shown. Real walk-forward export coming.</HonestyBadge>
          )}
        </div>
        {points ? (
          <UplotChart data={mainData} options={mainOptions} onSelectIdx={onSelect} />
        ) : (
          <p className="py-12 text-center font-mono text-sm text-muted">Loading data…</p>
        )}
        <p className="mt-2 font-mono text-[11px] text-muted/60">
          Drag to zoom, double-click to reset. Click a point to open its day below.
        </p>
      </div>

      <div className="mt-6 hidden rounded-lg border border-line bg-surface/40 p-4 md:block">
        <h2 className="mb-3 font-mono text-sm text-fg">Rolling 30-day directional accuracy</h2>
        {points && <UplotChart data={rollData} options={rollOptions} />}
      </div>

      {points && selectedDay !== null && (
        <div className="mt-6">
          <DayDetail points={points} day={selectedDay} />
        </div>
      )}

      <div className="mt-8 rounded-lg border border-line bg-surface/40">
        <button
          type="button"
          onClick={() => setShowMethod((v) => !v)}
          aria-expanded={showMethod}
          className="flex w-full items-center justify-between p-4 font-mono text-sm text-fg"
        >
          Methodology
          <span className="text-muted">{showMethod ? '−' : '+'}</span>
        </button>
        {showMethod && (
          <ol className="space-y-3 border-t border-line p-4 text-sm leading-relaxed text-muted">
            {METHODOLOGY.map((m, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-xs text-live">{i + 1}</span>
                {m}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
