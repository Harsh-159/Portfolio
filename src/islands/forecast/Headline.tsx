// Section 13.2: Figure 1, headline numbers, recomputed in the browser.
import { useMemo, useState } from 'preact/hooks';
import { headline } from '../../lib/forecastStats';
import { forecastFacts } from '../../content/forecast';
import { Frame, Icon, fmtN } from '../shared/ui';
import { usePredictions } from './data';

export default function Headline() {
  const data = usePredictions();
  const [sums, setSums] = useState(false);
  const h = useMemo(() => (data.status === 'ready' ? headline(data.data) : null), [data]);

  const rows = [
    {
      measure: 'Average miss per hour',
      stored: `${fmtN(forecastFacts.mae, 2)} EUR/MWh`,
      storedN: forecastFacts.mae,
      live: h?.mae,
      liveText: h ? `${fmtN(h.mae, 2)} EUR/MWh` : '',
      means: 'On average the forecast was 13.60 away from the real price',
      sum: 'Mean of the absolute difference between actual and predicted',
      tol: 0.005,
    },
    {
      measure: 'Directional accuracy',
      stored: `${fmtN(forecastFacts.directional, 1)}%`,
      storedN: forecastFacts.directional,
      live: h ? h.directional * 100 : undefined,
      liveText: h ? `${fmtN(h.directional * 100, 1)}%` : '',
      means: 'It was right about the price being above or below the same hour a week earlier',
      sum: `Share of hours where predicted minus last week and actual minus last week have the same sign. Hours with a zero difference are left out: ${h ? fmtN(h.directionalCounted) : '11,989'} remain`,
      tol: 0.05,
    },
    {
      measure: 'Skill against repeating last week',
      stored: `+${fmtN(forecastFacts.skill, 2)}`,
      storedN: forecastFacts.skill,
      live: h?.skill,
      liveText: h ? `+${fmtN(h.skill, 2)}` : '',
      means: '0 would be no better than copying last week. 1 would be perfect',
      sum: `1 minus 13.60 divided by ${h ? fmtN(h.naiveMae, 2) : '34.84'}`,
      tol: 0.005,
    },
    {
      measure: 'Hours tested',
      stored: fmtN(forecastFacts.hours),
      storedN: forecastFacts.hours,
      live: h?.hours,
      liveText: h ? fmtN(h.hours) : '',
      means: '1 November 2024 to 15 March 2026. None were seen in training. One hour is missing from the source',
      sum: 'Count of rows',
      tol: 0.5,
    },
  ];

  const words =
    data.status === 'loading'
      ? 'Loading data. The values shown were stored at build time.'
      : data.status === 'error'
        ? 'The data for this figure did not load. The values shown were stored at build time.'
        : 'All four numbers were recomputed in your browser from 11,999 stored predictions and match the stored values.';

  return (
    <Frame
      id="headline"
      num={1}
      title="Headline numbers, recomputed"
      badge="real"
      words={words}
      what="The four numbers that sum up the held-out test. The page was built with these values, then your browser recomputed each one from the stored predictions."
      tryThis={['Open Show the sum to read how each number is calculated.']}
    >
      <div class="table-wrap">
        <table class="headline-table">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">Value</th>
              <th scope="col">What it means</th>
              {sums && <th scope="col">Formula</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const diff = r.live !== undefined && Math.abs(r.live - r.storedN) > r.tol;
              return (
                <tr>
                  <th scope="row">{r.measure}</th>
                  <td class="v">
                    {r.stored}
                    <br />
                    {r.live !== undefined && !diff && (
                      <span class="tick-ok">
                        <Icon name="check" size={14} /> recomputed in your browser
                      </span>
                    )}
                    {diff && (
                      <span class="state state-warn small">
                        <Icon name="warn" size={14} /> Recomputed: {r.liveText}
                      </span>
                    )}
                  </td>
                  <td>{r.means}</td>
                  {sums && <td class="small">{r.sum}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div class="btn-row" style={{ marginTop: '12px' }}>
        <button class="btn btn-small" type="button" aria-pressed={sums} onClick={() => setSums(!sums)}>
          {sums ? 'Hide the sum' : 'Show the sum'}
        </button>
        {data.status === 'error' && (
          <button class="btn btn-small" type="button" onClick={data.retry}>
            Try again
          </button>
        )}
      </div>
    </Frame>
  );
}
