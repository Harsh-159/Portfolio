// Section 16.2: Figure 1, the simulator. Engine and tests unchanged.
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  STOCKS,
  basePrices,
  stepPrices,
  mulberry32,
  initialPortfolio,
  buy,
  sell,
  deposit,
  unrealisedPnL,
  holdingsValue,
  totalValue,
  type Portfolio,
} from '../lib/stockSim';
import { Frame, useReducedMotion } from './shared/ui';

const usd = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', currencyDisplay: 'code' });
const plain = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const HIST = 40;

function seedHistory() {
  const rand = mulberry32(2024);
  let p = basePrices();
  const h: number[][] = [p];
  for (let i = 0; i < HIST - 1; i++) {
    p = stepPrices(p, rand);
    h.push(p);
  }
  return { rand, h };
}

function Spark({ values, label }: { values: number[]; label: string }) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * 100).toFixed(1)},${(28 - ((v - lo) / (hi - lo || 1)) * 26).toFixed(1)}`).join('');
  return (
    <svg viewBox="0 0 100 30" width="100%" height="30" preserveAspectRatio="none" role="img" aria-label={label}>
      <path d={d} fill="none" stroke="var(--series-1)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    </svg>
  );
}

export default function Stocks() {
  const init = useRef(seedHistory());
  const [hist, setHist] = useState<number[][]>(init.current.h);
  const [sel, setSel] = useState(0);
  const [pf, setPf] = useState<Portfolio>(initialPortfolio());
  const [buyQ, setBuyQ] = useState('10');
  const [sellQ, setSellQ] = useState('1');
  const [cashQ, setCashQ] = useState('1000');
  const [err, setErr] = useState<{ field: 'buy' | 'sell' | 'cash'; msg: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const reduce = useReducedMotion();

  const prices = hist[hist.length - 1];
  const priceOf = (t: string) => prices[STOCKS.findIndex((s) => s.ticker === t)];
  const s = STOCKS[sel];

  const advance = () => setHist((h) => [...h.slice(-(HIST - 1)), stepPrices(h[h.length - 1], init.current.rand)]);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(advance, 2000);
    return () => window.clearInterval(id);
  }, [reduce]);

  const parseQ = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
  const doBuy = () => {
    const q = parseQ(buyQ);
    const r = buy(pf, s.ticker, q, prices[sel], Date.now());
    if (r.ok) {
      setPf(r.portfolio);
      setErr(null);
    } else if (r.error === 'invalid_quantity') setErr({ field: 'buy', msg: 'Enter a whole number of shares, 1 or more.' });
    else setErr({ field: 'buy', msg: `Not enough cash. ${q} shares of ${s.ticker} cost ${usd.format(q * prices[sel])} and you have ${usd.format(pf.cash)}.` });
  };
  const doSell = () => {
    const q = parseQ(sellQ);
    const r = sell(pf, s.ticker, q, prices[sel], Date.now());
    if (r.ok) {
      setPf(r.portfolio);
      setErr(null);
    } else if (r.error === 'invalid_quantity') setErr({ field: 'sell', msg: 'Enter a whole number of shares, 1 or more.' });
    else setErr({ field: 'sell', msg: `You hold ${pf.holdings[s.ticker]?.shares ?? 0} shares of ${s.ticker}, so you cannot sell ${q}.` });
  };
  const doCash = () => {
    const a = Number(cashQ);
    const r = deposit(pf, a, Date.now());
    if (r.ok) {
      setPf(r.portfolio);
      setErr(null);
    } else setErr({ field: 'cash', msg: 'Enter an amount above zero.' });
  };

  const positions = Object.values(pf.holdings);
  const hv = holdingsValue(pf, priceOf);
  const tv = totalValue(pf, priceOf);
  const words = `You hold ${positions.length} ${positions.length === 1 ? 'position' : 'positions'} worth ${usd.format(hv)}. Total with cash: ${usd.format(tv)}.`;

  const Err = ({ f }: { f: 'buy' | 'sell' | 'cash' }) =>
    err?.field === f ? (
      <p class="err" id={`err-${f}`} role="alert">
        {err.msg}
      </p>
    ) : null;

  return (
    <Frame
      id="simulator"
      num={1}
      title="The simulator"
      badge="simulation"
      wide
      words={words}
      what="Eight invented tickers on a seeded random walk that moves every 2 seconds. Buying, selling and adding cash use the same portfolio rules as the original project."
      tryThis={['Buy 10 shares of ACME and watch the gain or loss move.', 'Try to sell more shares than you hold.']}
      noCopy
    >
      <div class="st">
        <div>
          <h4>Market</h4>
          <ul class="st-market">
            {STOCKS.map((x, i) => (
              <li>
                <button type="button" class="st-tick" aria-pressed={i === sel} onClick={() => setSel(i)}>
                  <span>
                    <strong>{x.ticker}</strong>
                    <span class="small soft"> {x.sector}</span>
                  </span>
                  <span class="num">{plain.format(prices[i])}</span>
                </button>
              </li>
            ))}
          </ul>
          {reduce && (
            <button class="btn btn-small" type="button" onClick={advance} style={{ marginTop: '8px' }}>
              Advance prices
            </button>
          )}
        </div>
        <div>
          <h4>
            {s.ticker} <span class="soft small">{s.sector}</span>
          </h4>
          <p class="pb-big num">{usd.format(prices[sel])}</p>
          <Spark values={hist.map((h) => h[sel])} label={`Recent prices for ${s.ticker}`} />
          <div class="field" style={{ marginTop: '12px' }}>
            <label for="st-buy">Buy shares</label>
            <div class="btn-row">
              <input id="st-buy" type="number" min={1} step={1} value={buyQ} onInput={(e) => setBuyQ((e.target as HTMLInputElement).value)} style={{ width: '8rem' }} aria-describedby={err?.field === 'buy' ? 'err-buy' : undefined} />
              <button class="btn btn-primary" type="button" onClick={doBuy}>
                Buy {s.ticker}
              </button>
            </div>
            <Err f="buy" />
          </div>
          <div class="field">
            <label for="st-sell">Sell shares</label>
            <div class="btn-row">
              <input id="st-sell" type="number" min={1} step={1} value={sellQ} onInput={(e) => setSellQ((e.target as HTMLInputElement).value)} style={{ width: '8rem' }} aria-describedby={err?.field === 'sell' ? 'err-sell' : undefined} />
              <button class="btn" type="button" onClick={doSell}>
                Sell {s.ticker}
              </button>
            </div>
            <Err f="sell" />
          </div>
          <div class="field">
            <label for="st-cash">Add cash, US dollars</label>
            <div class="btn-row">
              <input id="st-cash" type="number" min={1} value={cashQ} onInput={(e) => setCashQ((e.target as HTMLInputElement).value)} style={{ width: '8rem' }} aria-describedby={err?.field === 'cash' ? 'err-cash' : undefined} />
              <button class="btn" type="button" onClick={doCash}>
                Add cash
              </button>
            </div>
            <Err f="cash" />
          </div>
        </div>
        <div>
          <h4>Portfolio</h4>
          <table>
            <tbody>
              <tr>
                <th scope="row">Cash</th>
                <td class="r">{usd.format(pf.cash)}</td>
              </tr>
              <tr>
                <th scope="row">Holdings</th>
                <td class="r">{usd.format(hv)}</td>
              </tr>
              <tr>
                <th scope="row">Total</th>
                <td class="r">
                  <strong>{usd.format(tv)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <h4 style={{ marginTop: '16px' }}>Positions</h4>
          {positions.length ? (
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Ticker</th>
                    <th scope="col" class="r">
                      Shares
                    </th>
                    <th scope="col" class="r">
                      Avg cost
                    </th>
                    <th scope="col" class="r">
                      Value
                    </th>
                    <th scope="col" class="r">
                      Gain or loss
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((h) => {
                    const pnl = unrealisedPnL(h, priceOf(h.ticker));
                    const up = pnl >= 0;
                    return (
                      <tr>
                        <td>{h.ticker}</td>
                        <td class="r">{h.shares}</td>
                        <td class="r">{plain.format(h.avgCost)}</td>
                        <td class="r">{plain.format(h.shares * priceOf(h.ticker))}</td>
                        <td class="r" style={{ color: up ? 'var(--pass)' : 'var(--fail)' }}>
                          {up ? '+' : '−'}
                          {plain.format(Math.abs(pnl))} {up ? 'gain' : 'loss'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p class="small soft">No positions yet.</p>
          )}
          <h4 style={{ marginTop: '16px' }}>History</h4>
          {pf.history.length ? (
            <ul class="guard-log small">
              {[...pf.history].reverse().map((t) => (
                <li>
                  {t.side === 'deposit'
                    ? `Added ${usd.format(t.amount ?? 0)}`
                    : `${t.side === 'buy' ? 'Bought' : 'Sold'} ${t.shares} ${t.ticker} at ${usd.format(t.price ?? 0)}`}
                </li>
              ))}
            </ul>
          ) : (
            <p class="small soft">No trades yet.</p>
          )}
          <div class="btn-row" style={{ marginTop: '12px' }}>
            {confirmReset ? (
              <>
                <span class="small">Clear positions and history?</span>
                <button
                  class="btn btn-small"
                  type="button"
                  onClick={() => {
                    setPf(initialPortfolio());
                    setConfirmReset(false);
                    setErr(null);
                  }}
                >
                  Yes, reset
                </button>
                <button class="btn btn-small" type="button" onClick={() => setConfirmReset(false)}>
                  Keep it
                </button>
              </>
            ) : (
              <button class="linklike" type="button" onClick={() => setConfirmReset(true)}>
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </Frame>
  );
}
