// Section 13.5: Figure 4, how it was tested.
import { useState } from 'preact/hooks';
import stored from '../../content/generated/forecastStored.json';
import { foldModels } from '../../content/forecast';
import { Frame, ShowData, useUrlState, codecs, fmtN } from '../shared/ui';

type ModelKey = (typeof foldModels)[number]['key'];
const folds = stored.folds as Record<string, number>[];
const colours: Record<ModelKey, string> = {
  lgbm_ridge_ensemble: 'var(--series-2)',
  lightgbm: 'var(--series-1)',
  xgboost: 'var(--series-3)',
  linear_regression: 'var(--accent)',
  seasonal_naive: 'var(--series-4)',
};
const dash: Record<ModelKey, string | undefined> = {
  lgbm_ridge_ensemble: undefined,
  lightgbm: '4 2',
  xgboost: '1 2',
  linear_regression: '6 2 1 2',
  seasonal_naive: '2 2',
};

const DAY = 86400e3;
const T0 = Date.parse('2021-01-01T00:00:00Z');
const T1 = Date.parse('2026-03-16T00:00:00Z');
const FOLD0 = Date.parse('2022-01-15T00:00:00Z');
const TEST0 = Date.parse('2024-11-01T00:00:00Z');
const dfmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const foldStart = (k: number) => FOLD0 + k * 30 * DAY;

const mean = (k: ModelKey) => folds.reduce((t, f) => t + f[k], 0) / folds.length;

export default function Validation() {
  const [fold, setFold] = useUrlState('fold', 0, codecs.int(0, 11));
  const [shown, setShown] = useState<ModelKey[]>(['lgbm_ridge_ensemble', 'lightgbm', 'seasonal_naive']);
  const f = folds[fold];
  const W = 760;
  const x = (t: number) => 10 + ((t - T0) / (T1 - T0)) * (W - 20);

  const GW = 760;
  const GH = 260;
  const ymax = 140;
  const gy = (v: number) => GH - 30 - (v / ymax) * (GH - 50);
  const groupW = (GW - 50) / 12;

  const toggle = (k: ModelKey) => setShown(shown.includes(k) ? shown.filter((x) => x !== k) : [...shown, k]);
  const start = foldStart(fold);

  return (
    <Frame
      id="validation"
      num={4}
      title="How it was tested"
      badge="real"
      wide
      onReset={() => {
        setFold(0);
        setShown(['lgbm_ridge_ensemble', 'lightgbm', 'seasonal_naive']);
      }}
      words={`Fold ${fold + 1} tested on ${dfmt.format(new Date(start))} to ${dfmt.format(new Date(start + 29 * DAY))}. Ensemble ${fmtN(f.lgbm_ridge_ensemble, 2)}, LightGBM ${fmtN(f.lightgbm, 2)}, seasonal naive ${fmtN(f.seasonal_naive, 2)} EUR/MWh.`}
      what="The folds cover 2022, the year of the European energy crisis, which is why the misses there are about three times larger than in the held-out test. Every model beats the seasonal-naive baseline (Wilcoxon signed-rank, p of 0.001 or less). The differences between the models are not statistically significant on 12 folds. The ensemble has the lowest mean, but I cannot claim it is reliably better than LightGBM alone (p = 0.73)."
      tryThis={['Select fold 8, where the ensemble and seasonal naive miss the most.', 'Untick seasonal naive to compare the models more closely.']}
    >
      <p class="small">
        <strong>Timeline, 2021 to 2026.</strong> Each fold trains on everything before it and tests on the next 30 days. The
        held-out test model was trained once, on data before 1 November 2024.
      </p>
      <svg class="svg-chart" viewBox={`0 0 ${W} 120`} role="group" aria-label="Validation timeline">
        <rect x={x(T0)} y="20" width={x(TEST0) - x(T0)} height="26" fill="color-mix(in srgb, var(--series-1) 18%, transparent)" stroke="var(--series-1)" />
        <text x={x(T0) + 6} y="38" style={{ fill: 'var(--ink)' }}>
          Training data
        </text>
        <rect x={x(TEST0)} y="20" width={x(T1) - x(TEST0)} height="26" fill="color-mix(in srgb, var(--series-2) 20%, transparent)" stroke="var(--series-2)" />
        <text x={x(TEST0) + 6} y="38" style={{ fill: 'var(--ink)' }}>
          Held-out test
        </text>
        {folds.map((_, k) => (
          <rect
            x={x(foldStart(k))}
            y="56"
            width={Math.max(3, x(foldStart(k) + 30 * DAY) - x(foldStart(k)) - 1)}
            height="22"
            fill={k === fold ? 'var(--ink)' : 'color-mix(in srgb, var(--series-3) 35%, transparent)'}
            stroke="var(--series-3)"
            tabIndex={0}
            role="button"
            aria-label={`Fold ${k + 1}`}
            aria-pressed={k === fold}
            style={{ cursor: 'pointer' }}
            onClick={() => setFold(k)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setFold(k))}
          />
        ))}
        <text x={x(FOLD0)} y="96">
          12 folds, 15 January 2022 to 10 January 2023
        </text>
        {[2021, 2022, 2023, 2024, 2025, 2026].map((yr) => (
          <text x={x(Date.parse(`${yr}-01-01T00:00:00Z`))} y="14">
            {yr}
          </text>
        ))}
      </svg>
      <div class="field" style={{ maxWidth: '260px' }}>
        <label for="fold-sel">Fold</label>
        <select id="fold-sel" value={fold} onChange={(e) => setFold(Number((e.target as HTMLSelectElement).value))}>
          {folds.map((_, k) => (
            <option value={k}>
              Fold {k + 1}, from {dfmt.format(new Date(foldStart(k)))}
            </option>
          ))}
        </select>
      </div>
      <div class="chart-bars" style={{ marginBottom: '20px' }}>
        {foldModels.map((m) => (
          <div class="bar-row">
            <span>{m.label}</span>
            <span class="bar-track">
              <span class="bar-fill" style={{ width: `${(f[m.key] / ymax) * 100}%`, background: colours[m.key] }} />
            </span>
            <span class="num">{fmtN(f[m.key], 2)}</span>
          </div>
        ))}
      </div>
      <fieldset>
        <legend>Models in the chart</legend>
        <div class="btn-row">
          {foldModels.map((m) => (
            <label class="check">
              <input type="checkbox" checked={shown.includes(m.key)} onChange={() => toggle(m.key)} />
              <svg width="18" height="12" aria-hidden="true">
                <rect x="1" y="1" width="16" height="10" fill={colours[m.key]} stroke="var(--ink)" stroke-dasharray={dash[m.key]} />
              </svg>
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>
      <svg class="svg-chart" viewBox={`0 0 ${GW} ${GH}`} role="img" aria-label="Average miss for each of the 12 folds, by model.">
        {[0, 35, 70, 105, 140].map((v) => (
          <g>
            <line class="grid" x1="40" x2={GW - 6} y1={gy(v)} y2={gy(v)} />
            <text x="34" y={gy(v) + 4} text-anchor="end">
              {v}
            </text>
          </g>
        ))}
        {folds.map((fr, k) => {
          const bw = (groupW - 6) / Math.max(1, shown.length);
          return (
            <g>
              {foldModels
                .filter((m) => shown.includes(m.key))
                .map((m, j) => (
                  <rect x={44 + k * groupW + 3 + j * bw} y={gy(fr[m.key])} width={Math.max(1, bw - 1)} height={gy(0) - gy(fr[m.key])} fill={colours[m.key]} stroke={k === fold ? 'var(--ink)' : 'none'} stroke-dasharray={dash[m.key]}>
                    <title>
                      Fold {k + 1}, {m.label}: {fmtN(fr[m.key], 2)}
                    </title>
                  </rect>
                ))}
              <text x={44 + k * groupW + groupW / 2} y={GH - 10} text-anchor="middle" style={k === fold ? { fill: 'var(--ink)', fontWeight: 650 } : undefined}>
                {k + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col" class="r">
                Mean miss over 12 folds
              </th>
              <th scope="col" class="r">
                Lowest fold
              </th>
              <th scope="col" class="r">
                Highest fold
              </th>
            </tr>
          </thead>
          <tbody>
            {foldModels.map((m) => (
              <tr>
                <th scope="row">{m.label}</th>
                <td class="r">{fmtN(mean(m.key), 2)}</td>
                <td class="r">{fmtN(Math.min(...folds.map((x) => x[m.key])), 2)}</td>
                <td class="r">{fmtN(Math.max(...folds.map((x) => x[m.key])), 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ShowData>
        <table>
          <thead>
            <tr>
              <th scope="col">Fold</th>
              {foldModels.map((m) => (
                <th scope="col" class="r">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {folds.map((fr, k) => (
              <tr>
                <td>{k + 1}</td>
                {foldModels.map((m) => (
                  <td class="r">{fmtN(fr[m.key], 2)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ShowData>
    </Frame>
  );
}
