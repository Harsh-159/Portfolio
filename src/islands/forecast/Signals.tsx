// Section 13.6: Figure 5, the 500 daily signals, relabelled in the browser.
import { useMemo, useState } from 'preact/hooks';
import { relabel, countLabels, labelInfo, labelOrder, flagNames, type SignalRow, type Label } from '../../lib/signals';
import { Frame, Slider, Icon, useUrlState, codecs, fmtN } from '../shared/ui';
import { useData } from './data';

const STORED: Record<Label, number> = { STRONG_BUY: 111, BUY: 28, HOLD: 37, SELL: 42, STRONG_SELL: 154, INVALIDATED: 118, NO_DATA: 10 };
const FLAG_DAYS: Record<string, number> = { gas_spike: 7, wind_revision: 20, residual_load_swing: 20, negative_price_regime: 74, high_error_regime: 10 };
const dfmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function Signals() {
  const [buy, setBuy] = useUrlState('buy', 3, codecs.num(0.5, 10));
  const [strong, setStrong] = useUrlState('strong', 8, codecs.num(1, 20));
  const [focus, setFocus] = useState<number | null>(null);
  const data = useData<SignalRow[]>('/data/forecast/signals.json');
  const rows = data.status === 'ready' ? data.data : null;
  const strongEff = Math.max(strong, buy);
  const labels = useMemo(() => (rows ? relabel(rows, buy, strongEff) : null), [rows, buy, strongEff]);
  const counts = labels ? countLabels(labels) : STORED;
  const isDefault = buy === 3 && strong === 8;
  const f = focus !== null && rows ? rows[focus] : null;

  const words = `${labelOrder.map((l) => `${labelInfo[l].name.toLowerCase()} ${counts[l]}`).join(', ')}.${isDefault ? ' These match the stored counts exactly.' : ''}`;

  return (
    <Frame
      id="signals"
      num={5}
      title="Signals"
      badge="real"
      wide
      onReset={() => {
        setBuy(3);
        setStrong(8);
        setFocus(null);
      }}
      words={data.status === 'loading' ? `Loading data. Stored counts: ${words}` : data.status === 'error' ? 'The data for this figure did not load.' : words}
      what="One cell per delivery date from 1 November 2024 to 15 March 2026, coded by the month-ahead signal. The premium is the forecast fair value minus the curve proxy. Move the thresholds and every day is relabelled in your browser. Invalidated and no-data days never change."
      tryThis={['Raise "Buy or sell beyond" to 6 and watch holds grow.', 'Focus a cell marked X to see which flag invalidated it.']}
      controls={
        <div class="ctl-grid two">
          <Slider label="Buy or sell beyond" value={buy} min={0.5} max={10} step={0.5} onChange={setBuy} format={(v) => `${fmtN(v, 1)} EUR/MWh`} />
          <Slider label="Strong beyond" value={strong} min={1} max={20} step={0.5} onChange={setStrong} format={(v) => `${fmtN(v, 1)} EUR/MWh`} />
        </div>
      }
    >
      {strong < buy && <p class="small soft">The strong threshold is below the first one, so it is treated as equal to it.</p>}
      <div class="sig-legend">
        {labelOrder.map((l) => (
          <span>
            <i class={`sig-${l}`}>{labelInfo[l].letter}</i>
            {labelInfo[l].name}: <strong class="num">{counts[l]}</strong>
          </span>
        ))}
      </div>
      {rows && labels ? (
        <div class="sig-strip" role="group" aria-label="500 delivery dates">
          {rows.map((r, i) => (
            <button
              type="button"
              class={`sig-cell sig-${labels[i]}`}
              aria-label={`${dfmt.format(new Date(`${r.date}T00:00:00Z`))}: ${labelInfo[labels[i]].name}`}
              onFocus={() => setFocus(i)}
              onMouseEnter={() => setFocus(i)}
              onClick={() => setFocus(i)}
            >
              {labelInfo[labels[i]].letter}
            </button>
          ))}
        </div>
      ) : (
        <p class="soft">{data.status === 'error' ? 'The data for this figure did not load.' : 'Loading data'}</p>
      )}
      {data.status === 'error' && (
        <button class="btn btn-small" type="button" onClick={data.retry}>
          Try again
        </button>
      )}
      <div class="readout" aria-live="polite" style={{ marginTop: '10px' }}>
        {f ? (
          <>
            <strong>{dfmt.format(new Date(`${f.date}T00:00:00Z`))}</strong>: {labelInfo[labels![focus!]].name}. Fair value {f.fv === null ? 'none' : fmtN(f.fv, 2)}, curve proxy{' '}
            {f.curve === null ? 'none' : fmtN(f.curve, 2)}, premium {f.premium === null ? 'none' : `${f.premium > 0 ? '+' : ''}${fmtN(f.premium, 2)}`} EUR/MWh, confidence {f.conf === null ? 'none' : `${fmtN(f.conf * 100, 1)}%`}
            {f.flags.length ? `. Flags: ${f.flags.map((x) => flagNames[x].name).join(', ')}` : ''}.
          </>
        ) : (
          'Point at or focus a day to read its numbers.'
        )}
      </div>
      <div class="table-wrap" style={{ marginTop: '16px' }}>
        <table>
          <caption>Invalidation flags</caption>
          <thead>
            <tr>
              <th scope="col">Flag</th>
              <th scope="col">Trigger</th>
              <th scope="col" class="r">
                Days
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(flagNames).map(([k, v]) => (
              <tr>
                <th scope="row">{v.name}</th>
                <td>{v.trigger}</td>
                <td class="r">{FLAG_DAYS[k]}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Any flag</th>
              <td />
              <td class="r">118</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="callout" style={{ marginTop: '16px' }}>
        <Icon name="warn" />
        <div>
          <p>
            Position sizing was meant to be full above 75% confidence and half between 50% and 75%. Confidence never reached
            75%. It was between 50% and 75% on 250 days and below 50% on 249.
          </p>
          <p>
            The backtest is an illustration only: hit rate 66.5%, Sharpe proxy 1.87, with no costs, no slippage and no risk
            limits. The curve it trades against is a trailing average of past prices, not a real forward curve. Signal and
            outcome correlate at 0.20.
          </p>
        </div>
      </div>
    </Frame>
  );
}
