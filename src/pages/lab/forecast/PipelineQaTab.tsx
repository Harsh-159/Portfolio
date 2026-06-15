import { useState } from 'react';

const STEPS = [
  { n: 1, title: 'Ingestion & QA', desc: 'Pull and validate ENTSO-E and gas series.' },
  { n: 2, title: 'Forecasting', desc: 'Run the day-ahead price ensemble.' },
  { n: 3, title: 'Curve translation', desc: 'Turn forecasts into a premium and a signal.' },
  { n: 4, title: 'AI intelligence', desc: 'Generate a cited, audited desk briefing.' },
  { n: 5, title: 'Daily reporting', desc: 'Render and deliver the PDF report.' },
];

const QA_CHECKS = [
  'Timestamp completeness',
  'Duplicate timestamps',
  'Missingness per column',
  'DA price outliers (physical bounds −500 to 3000 €/MWh, plus 4σ with crisis awareness)',
  'Wind and solar bounds (including no solar at night)',
  'Load bounds (20 to 90 GW)',
  'Gas bounds (0 to 400 €/MWh, with stale detection)',
  'Stale data detection',
  'Cross-series alignment (wind-price correlation −0.339)',
  'DST boundary verification',
];

// A tiny illustrative 24h solar profile; the "before" has a spurious 02:00 reading.
const SOLAR_BEFORE = [
  0, 0, 220, 0, 0, 0, 90, 600, 1400, 2600, 3700, 4200, 4400, 4100, 3300, 2200, 1100, 400, 60, 0, 0, 0, 0, 0,
];

export default function PipelineQaTab() {
  const [corrected, setCorrected] = useState(false);
  const solar = corrected ? SOLAR_BEFORE.map((v, h) => ((h < 5 || h > 20) && v > 0 ? 0 : v)) : SOLAR_BEFORE;
  const max = Math.max(...SOLAR_BEFORE, 1);

  return (
    <div className="space-y-8">
      {/* 5-step flow */}
      <div>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
          Five-component daily pipeline
        </h2>
        <ol className="flex flex-col gap-2 md:flex-row md:items-stretch">
          {STEPS.map((s, i) => (
            <li key={s.n} className="flex flex-1 items-stretch gap-2">
              <div className="flex-1 rounded-lg border border-line bg-surface/40 p-3">
                <div className="font-mono text-xs text-live">{String(s.n).padStart(2, '0')}</div>
                <div className="mt-1 font-medium leading-tight">{s.title}</div>
                <div className="mt-1 font-mono text-[11px] text-muted">{s.desc}</div>
              </div>
              {i < STEPS.length - 1 && (
                <span className="hidden self-center text-muted md:inline" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* QA panel */}
      <div className="rounded-lg border border-line bg-surface/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
            Automated QA: 10 checks
          </h2>
          <p className="font-mono text-xs text-fg">
            1,621 rows flagged{' '}
            <span className="text-muted">(1,183 errors, 42 warnings, 396 informational)</span> · 591
            auto-corrections
          </p>
        </div>
        <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {QA_CHECKS.map((c, i) => (
            <li key={i} className="flex gap-2 font-mono text-xs text-muted">
              <span className="text-live">{String(i + 1).padStart(2, '0')}</span>
              {c}
            </li>
          ))}
        </ol>
      </div>

      {/* Solar-at-night micro-interaction */}
      <div className="rounded-lg border border-line bg-surface/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-mono text-sm text-fg">Solar at night correction</h3>
          <button
            type="button"
            onClick={() => setCorrected((v) => !v)}
            aria-pressed={corrected}
            className="rounded-md border border-line px-3 py-1.5 font-mono text-xs text-fg hover:border-muted"
          >
            {corrected ? 'Show before' : 'Apply correction'}
          </button>
        </div>
        <div className="flex items-end gap-1" style={{ height: 90 }}>
          {solar.map((v, h) => {
            const wasFixed = corrected && SOLAR_BEFORE[h] > 0 && v === 0 && (h < 5 || h > 20);
            return (
              <div key={h} className="flex flex-1 flex-col items-center gap-1" title={`${h}:00`}>
                <div className="flex w-full items-end" style={{ height: 70 }}>
                  <span
                    className={`w-full rounded-t-sm ${wasFixed ? 'bg-sell/60' : 'bg-[#38bdf8]/60'}`}
                    style={{ height: `${(v / max) * 100}%` }}
                  />
                </div>
                {h % 3 === 0 && <span className="font-mono text-[9px] text-muted/60">{h}</span>}
              </div>
            );
          })}
        </div>
        <p className="mt-2 font-mono text-[11px] text-muted/70">
          Illustrative example of the 591 auto-corrections: non-zero solar at 02:00 is corrected to
          0.
        </p>
      </div>

      <p className="font-mono text-[11px] leading-relaxed text-muted/70">
        Sources: ENTSO-E (day-ahead prices, wind and solar forecast, load forecast) plus TTF gas.
        Dataset: 45,600 hourly rows, 2021-01-01 to 2026-03-15.
      </p>
    </div>
  );
}
