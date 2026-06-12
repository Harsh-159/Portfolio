import { useState } from 'react';
import { motion } from 'motion/react';

interface Model {
  name: string;
  hourlyMae: number;
  hourlyRmse: number;
  dirAcc: number | null;
  weeklyMae: number;
  monthlyMae: number;
}

// Verbatim from the project's model comparison.
const MODELS: Model[] = [
  { name: 'Seasonal naive (24h)', hourlyMae: 27.16, hourlyRmse: 51.92, dirAcc: null, weeklyMae: 10.62, monthlyMae: 5.29 },
  { name: 'Seasonal naive (168h)', hourlyMae: 34.84, hourlyRmse: 57.43, dirAcc: null, weeklyMae: 18.93, monthlyMae: 5.67 },
  { name: 'Ridge regression', hourlyMae: 18.74, hourlyRmse: 32.13, dirAcc: 81.6, weeklyMae: 8.35, monthlyMae: 5.09 },
  { name: 'LightGBM (standalone)', hourlyMae: 14.5, hourlyRmse: 28.01, dirAcc: 85.1, weeklyMae: 6.72, monthlyMae: 4.42 },
  { name: 'LGBM+Ridge+AR+EW', hourlyMae: 13.6, hourlyRmse: 27.01, dirAcc: 86.7, weeklyMae: 5.79, monthlyMae: 4.0 },
];

type MetricKey = 'hourlyMae' | 'hourlyRmse' | 'dirAcc' | 'weeklyMae' | 'monthlyMae';

const METRICS: { key: MetricKey; label: string; better: 'low' | 'high'; unit: string }[] = [
  { key: 'hourlyMae', label: 'Hourly MAE', better: 'low', unit: '' },
  { key: 'hourlyRmse', label: 'Hourly RMSE', better: 'low', unit: '' },
  { key: 'dirAcc', label: 'Directional accuracy', better: 'high', unit: '%' },
  { key: 'weeklyMae', label: 'Weekly MAE', better: 'low', unit: '' },
  { key: 'monthlyMae', label: 'Monthly MAE', better: 'low', unit: '' },
];

const cell = (v: number | null, unit = '') => (v === null ? 'n/a' : `${v.toFixed(2)}${unit}`);

export default function ModelsTab() {
  const [metricKey, setMetricKey] = useState<MetricKey>('hourlyMae');
  const [showArch, setShowArch] = useState(false);
  const metric = METRICS.find((m) => m.key === metricKey)!;

  const ranked = MODELS.filter((m) => m[metric.key] !== null).sort((a, b) => {
    const av = a[metric.key] as number;
    const bv = b[metric.key] as number;
    return metric.better === 'low' ? av - bv : bv - av;
  });
  const max = Math.max(...ranked.map((m) => m[metric.key] as number));

  return (
    <div className="space-y-8">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetricKey(m.key)}
            className={`rounded-md border px-3 py-1.5 font-mono text-xs ${
              metricKey === m.key ? 'border-live bg-live/10 text-live' : 'border-line text-muted hover:text-fg'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Animated bars */}
      <div className="space-y-2">
        {ranked.map((m, i) => {
          const v = m[metric.key] as number;
          return (
            <motion.div key={m.name} layout transition={{ duration: 0.4 }} className="flex items-center gap-3">
              <span className="w-44 shrink-0 truncate font-mono text-xs text-muted">{m.name}</span>
              <span className="h-5 flex-1 overflow-hidden rounded bg-bg">
                <motion.span
                  className={`block h-full rounded ${i === 0 ? 'bg-live' : 'bg-planned/50'}`}
                  initial={false}
                  animate={{ width: `${(v / max) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </span>
              <span className="w-16 text-right font-mono text-xs text-fg">
                {v.toFixed(2)}
                {metric.unit}
              </span>
            </motion.div>
          );
        })}
        <p className="font-mono text-[11px] text-muted/60">
          {metric.better === 'low' ? 'Lower is better.' : 'Higher is better.'} Best model highlighted.
        </p>
      </div>

      {/* Full table */}
      <div className="overflow-auto rounded-lg border border-line">
        <table className="w-full font-mono text-xs">
          <thead className="bg-surface/60 text-muted">
            <tr className="text-right">
              <th className="p-2 text-left font-normal">Model</th>
              <th className="p-2 font-normal">Hourly MAE</th>
              <th className="p-2 font-normal">Hourly RMSE</th>
              <th className="p-2 font-normal">Dir. acc</th>
              <th className="p-2 font-normal">Weekly MAE</th>
              <th className="p-2 font-normal">Monthly MAE</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((m, i) => (
              <tr
                key={m.name}
                className={`text-right ${i === MODELS.length - 1 ? 'text-live' : 'text-fg'} ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                <td className="p-2 text-left">{m.name}</td>
                <td className="p-2">{cell(m.hourlyMae)}</td>
                <td className="p-2">{cell(m.hourlyRmse)}</td>
                <td className="p-2">{m.dirAcc === null ? 'n/a' : `${m.dirAcc.toFixed(1)}%`}</td>
                <td className="p-2">{cell(m.weeklyMae)}</td>
                <td className="p-2">{cell(m.monthlyMae)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Architecture */}
      <div className="rounded-lg border border-line bg-surface/40">
        <button
          type="button"
          onClick={() => setShowArch((v) => !v)}
          aria-expanded={showArch}
          className="flex w-full items-center justify-between p-4 font-mono text-sm text-fg"
        >
          Architecture
          <span className="text-muted">{showArch ? '−' : '+'}</span>
        </button>
        {showArch && (
          <div className="space-y-3 border-t border-line p-4 text-sm leading-relaxed text-muted">
            <p>
              Pass 1 is LightGBM (800 trees, 63 leaves, learning rate 0.01) blended 90/10 with Ridge,
              with recency weighting (half-life 365 days) downweighting the 2022 energy crisis.
            </p>
            <p>
              Pass 2 lags the residuals (24h, 48h, 168h) and a second ensemble corrects persistent
              biases, worth roughly 2 €/MWh of MAE.
            </p>
            <p>
              An hour-stratified exponentially weighted bias correction (half-life 672h) trades +0.33
              hourly MAE for cutting mean bias from +4.86 to −0.50 €/MWh.
            </p>
            <p>
              The target uses a multi-scale asinh transform (c in {'{0.5, 1.0, 2.0}'}) to stabilise
              variance across the −100 to +500 €/MWh price range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
