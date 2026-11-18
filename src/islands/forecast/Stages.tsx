// Section 13.4: Figure 3, what each stage adds.
import { useMemo } from 'preact/hooks';
import { groupMae, hourOf, monthKey, type StageKey } from '../../lib/forecastStats';
import { stages } from '../../content/forecast';
import byStage from '../../content/generated/forecastByStage.json';
import { Frame, Seg, ShowData, useUrlState, codecs, fmtN } from '../shared/ui';
import { usePredictions } from './data';

const KEYS = ['naive', 'p1', 'p2', 'pred'] as const;
const monthName = (m: string) =>
  new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${m}-01T00:00:00Z`));

export default function Stages() {
  const [stage, setStage] = useUrlState<StageKey>('stage', 'pred', codecs.str(KEYS));
  const [by, setBy] = useUrlState<'hour' | 'month'>('by', 'hour', codecs.str(['hour', 'month'] as const));
  const data = usePredictions();
  const st = stages.find((x) => x.key === stage)!;

  // Server-rendered from build-time values, recomputed from the predictions once they load.
  const values = useMemo(() => {
    if (data.status === 'ready') {
      if (by === 'hour') {
        const m = groupMae(data.data, hourOf, stage);
        return Array.from({ length: 24 }, (_, h) => ({ label: String(h).padStart(2, '0'), v: m.get(h)! }));
      }
      const m = groupMae(data.data, monthKey, stage);
      return [...m.entries()].map(([k, v]) => ({ label: monthName(k as string), v }));
    }
    const src = byStage[stage];
    return by === 'hour'
      ? src.hour.map((v, h) => ({ label: String(h).padStart(2, '0'), v }))
      : Object.entries(src.month).map(([k, v]) => ({ label: monthName(k), v }));
  }, [data, stage, by]);

  const max = Math.max(...values.map((x) => x.v));
  const worst = values.reduce((a, b) => (b.v > a.v ? b : a));
  const best = values.reduce((a, b) => (b.v < a.v ? b : a));
  const W = 720;
  const H = 230;
  const bw = (W - 50) / values.length;
  const ymax = Math.ceil(max / 10) * 10;
  const y = (v: number) => H - 34 - (v / ymax) * (H - 54);

  const words =
    stage === 'pred' && by === 'hour'
      ? 'The forecast is weakest at 16:00 UTC, with an average miss of 26.65, and strongest overnight, at about 7.5 to 8.5.'
      : `${st.label}: average miss ${fmtN(st.mae, 2)}. By ${by === 'hour' ? 'hour' : 'month'}, the largest miss is ${fmtN(worst.v, 2)} at ${by === 'hour' ? `${worst.label}:00 UTC` : worst.label} and the smallest ${fmtN(best.v, 2)} at ${by === 'hour' ? `${best.label}:00 UTC` : best.label}.`;

  const smax = Math.max(...stages.map((s) => s.mae));

  return (
    <Frame
      id="stages"
      num={3}
      title="What each stage adds"
      badge="real"
      onReset={() => {
        setStage('pred');
        setBy('hour');
      }}
      words={words}
      what="The last step makes the hourly miss slightly worse, from 13.27 to 13.60, to remove a steady bias. It cuts the weekly miss from 7.67 to 5.79 and the monthly miss from 6.94 to 4.00, and the signals are built on weekly and monthly averages."
      tryThis={['Choose Pass 1 and compare its bias with the final stage.', 'Switch the chart to months and find December 2024.']}
      controls={
        <>
          <Seg label="Stage" value={stage} options={stages.map((s) => ({ value: s.key, label: s.label }))} onChange={setStage} />
          <Seg
            label="Average miss by"
            value={by}
            options={[
              { value: 'hour', label: 'Hour of day' },
              { value: 'month', label: 'Month' },
            ]}
            onChange={setBy}
          />
        </>
      }
    >
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col" class="r">
                Average miss
              </th>
              <th scope="col" class="r">
                RMSE
              </th>
              <th scope="col" class="r">
                Mean bias, size
              </th>
              <th scope="col" class="r">
                Directional accuracy
              </th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s) => (
              <tr class={s.key === stage ? 'sel' : ''} style={s.key === stage ? { fontWeight: 650 } : undefined}>
                <th scope="row">{s.label}</th>
                <td class="r">{fmtN(s.mae, 2)}</td>
                <td class="r">{fmtN(s.rmse, 2)}</td>
                <td class="r">{fmtN(s.bias, 2)}</td>
                <td class="r">{s.directional === null ? 'Not defined' : `${fmtN(s.directional, 1)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="small" style={{ marginTop: '16px' }}>
        <strong>Average miss by {by === 'hour' ? 'hour of day, UTC' : 'month'}</strong>, {st.label}, EUR/MWh
      </p>
      <svg class="svg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={words}>
        {[0, ymax / 2, ymax].map((v) => (
          <g>
            <line class="grid" x1="40" x2={W - 6} y1={y(v)} y2={y(v)} />
            <text x="34" y={y(v) + 4} text-anchor="end">
              {v}
            </text>
          </g>
        ))}
        {values.map((x, i) => (
          <g>
            <rect x={44 + i * bw + 1} y={y(x.v)} width={Math.max(2, bw - 3)} height={y(0) - y(x.v)} fill={x === worst ? 'var(--series-2)' : 'var(--series-1)'} opacity={0.85}>
              <title>
                {x.label}: {fmtN(x.v, 2)}
              </title>
            </rect>
            {(by === 'hour' ? i % 3 === 0 : i % 2 === 0) && (
              <text x={44 + i * bw + bw / 2} y={H - 14} text-anchor="middle">
                {x.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <p class="small" style={{ marginTop: '12px' }}>
        <strong>The four stages side by side</strong>, average miss per hour
      </p>
      <div class="chart-bars">
        {stages.map((s) => (
          <div class="bar-row">
            <span>{s.label}</span>
            <span class="bar-track">
              <span class="bar-fill" style={{ width: `${(s.mae / smax) * 100}%`, background: s.key === 'naive' ? 'var(--series-4)' : 'var(--accent)' }} />
            </span>
            <span class="num">{fmtN(s.mae, 2)}</span>
          </div>
        ))}
      </div>
      <ShowData>
        <table>
          <thead>
            <tr>
              <th scope="col">{by === 'hour' ? 'Hour, UTC' : 'Month'}</th>
              <th scope="col" class="r">
                Average miss, EUR/MWh
              </th>
            </tr>
          </thead>
          <tbody>
            {values.map((x) => (
              <tr>
                <td>{x.label}</td>
                <td class="r">{fmtN(x.v, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ShowData>
    </Frame>
  );
}
