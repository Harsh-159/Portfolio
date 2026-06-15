import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { DemoChrome } from '../../components/DemoChrome';
import {
  STOCKS,
  mulberry32,
  nextPrice,
  basePrices,
  initialPortfolio,
  buy,
  sell,
  deposit,
  unrealisedPnL,
  holdingsValue,
  totalValue,
  type Portfolio,
  type TradeError,
  type TradeResult,
} from '../../lib/stockSim';

const STORAGE_KEY = 'harsh-lab-stocks-v1';
const HISTORY_LEN = 50;

const ERROR_TEXT: Record<TradeError, string> = {
  insufficient_cash: 'Not enough cash for that order.',
  insufficient_shares: 'You do not hold that many shares.',
  invalid_quantity: 'Enter a whole quantity greater than zero.',
};

const money = (n: number) =>
  n.toLocaleString('en-GB', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

interface SavedState {
  portfolio: Portfolio;
  history: number[][];
}

function load(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedState;
    if (
      !data.portfolio ||
      !Array.isArray(data.history) ||
      data.history.length !== STOCKS.length
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function initialHistory(): number[][] {
  return basePrices().map((p) => [p]);
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <div className="h-8 w-24" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / span) * 26}`)
    .join(' ');
  const up = data[data.length - 1] >= data[0];
  return (
    <svg viewBox="0 0 100 28" className="h-8 w-24" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={up ? 'var(--color-live)' : 'var(--color-sell)'}
        strokeWidth="1"
        opacity="0.8"
      />
    </svg>
  );
}

export default function Stocks() {
  const reduced = useReducedMotion();
  const randRef = useRef(mulberry32(20260612));

  const saved = useMemo(() => load(), []);
  const [history, setHistory] = useState<number[][]>(saved?.history ?? initialHistory());
  const [portfolio, setPortfolio] = useState<Portfolio>(saved?.portfolio ?? initialPortfolio());
  const [selected, setSelected] = useState(0);
  const [buyQty, setBuyQty] = useState('10');
  const [sellQty, setSellQty] = useState('1');
  const [cashAmount, setCashAmount] = useState('1000');
  const [error, setError] = useState<string | null>(null);

  const prices = useMemo(() => history.map((h) => h[h.length - 1]), [history]);
  const priceOf = (ticker: string) => prices[STOCKS.findIndex((s) => s.ticker === ticker)] ?? 0;

  // Persist portfolio and prices so the session survives a reload.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ portfolio, history }));
    } catch {
      // storage may be unavailable; the sim still works in-memory.
    }
  }, [portfolio, history]);

  const tick = () => {
    setHistory((prev) =>
      prev.map((h) => {
        const next = [...h, nextPrice(h[h.length - 1], randRef.current)];
        return next.length > HISTORY_LEN ? next.slice(next.length - HISTORY_LEN) : next;
      }),
    );
  };

  // Prices tick every 2s. Under reduced motion the loop is paused; the user can
  // advance prices manually instead.
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [reduced]);

  const apply = (result: TradeResult) => {
    if (result.ok) {
      setPortfolio(result.portfolio);
      setError(null);
    } else {
      setError(ERROR_TEXT[result.error]);
    }
  };

  const reset = () => {
    setPortfolio(initialPortfolio());
    setHistory(initialHistory());
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const sel = STOCKS[selected];
  const selPrice = prices[selected];
  const hValue = holdingsValue(portfolio, priceOf);
  const tValue = totalValue(portfolio, priceOf);
  const holdings = Object.values(portfolio.holdings);

  return (
    <DemoChrome labId="stocks">
      <p className="-mt-2 mb-5 max-w-3xl font-mono text-xs leading-relaxed text-muted">
        A client-side remake of my CS50 stock simulator. The original was Flask + SQL + IEX Cloud
        with full auth; this version trades simulated prices entirely in your browser.{' '}
        <a
          href="https://github.com/Harsh-159/Stock-Simulator"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-fg underline hover:text-live"
        >
          View original on GitHub <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </p>

      {/* Summary bar */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-line bg-surface/40 p-4 font-mono text-sm">
        <span className="text-muted">
          cash <span className="text-fg">{money(portfolio.cash)}</span>
        </span>
        <span className="text-muted">
          holdings <span className="text-fg">{money(hValue)}</span>
        </span>
        <span className="text-muted">
          total <span className="text-fg">{money(tValue)}</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          {reduced && (
            <button
              type="button"
              onClick={tick}
              className="rounded-md border border-line px-3 py-1.5 text-fg hover:border-muted"
            >
              Advance prices
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-line px-3 py-1.5 text-muted hover:text-fg"
          >
            Reset
          </button>
        </div>
      </div>
      <p className="mb-6 font-mono text-[11px] text-muted/60">
        Simulated prices (random walk), not market data.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Market list */}
        <div className="rounded-lg border border-line bg-surface/40 p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Market</h2>
          <div className="space-y-1">
            {STOCKS.map((s, i) => (
              <button
                key={s.ticker}
                type="button"
                onClick={() => setSelected(i)}
                className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                  selected === i ? 'border-live/50 bg-live/5' : 'border-transparent hover:border-line'
                }`}
              >
                <span>
                  <span className="block font-mono text-sm text-fg">{s.ticker}</span>
                  <span className="block font-mono text-[10px] text-muted">{s.sector}</span>
                </span>
                <Sparkline data={history[i]} />
                <span className="w-16 text-right font-mono text-sm text-fg">{money(prices[i])}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Trade panel */}
        <div className="space-y-4 rounded-lg border border-line bg-surface/40 p-4">
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold">{sel.ticker}</h2>
              <span className="font-mono text-lg text-fg">{money(selPrice)}</span>
            </div>
            <p className="font-mono text-xs text-muted">{sel.sector}</p>
            <div className="mt-3">
              <Sparkline data={history[selected]} />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <label className="block">
              <span className="font-mono text-xs text-muted">Buy quantity</span>
              <input
                type="number"
                min={1}
                value={buyQty}
                onChange={(e) => setBuyQty(e.target.value)}
                aria-label={`Buy quantity of ${sel.ticker}`}
                className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-1.5 font-mono text-sm text-fg outline-none focus:border-muted"
              />
            </label>
            <button
              type="button"
              onClick={() => apply(buy(portfolio, sel.ticker, Number(buyQty), selPrice, Date.now()))}
              className="rounded-md bg-live px-4 py-2 font-mono text-sm font-semibold text-bg"
            >
              Buy
            </button>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <label className="block">
              <span className="font-mono text-xs text-muted">Sell quantity</span>
              <input
                type="number"
                min={1}
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                aria-label={`Sell quantity of ${sel.ticker}`}
                className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-1.5 font-mono text-sm text-fg outline-none focus:border-muted"
              />
            </label>
            <button
              type="button"
              onClick={() => apply(sell(portfolio, sel.ticker, Number(sellQty), selPrice, Date.now()))}
              className="rounded-md border border-sell px-4 py-2 font-mono text-sm font-semibold text-sell hover:bg-sell/10"
            >
              Sell
            </button>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-2 border-t border-line pt-4">
            <label className="block">
              <span className="font-mono text-xs text-muted">Add cash</span>
              <input
                type="number"
                min={1}
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                aria-label="Cash to add"
                className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-1.5 font-mono text-sm text-fg outline-none focus:border-muted"
              />
            </label>
            <button
              type="button"
              onClick={() => apply(deposit(portfolio, Number(cashAmount), Date.now()))}
              className="rounded-md border border-line px-4 py-2 font-mono text-sm text-fg hover:border-muted"
            >
              Add
            </button>
          </div>

          {error && (
            <p role="alert" className="font-mono text-xs text-sell">
              {error}
            </p>
          )}
        </div>

        {/* Holdings + history */}
        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-surface/40 p-4">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Holdings</h2>
            {holdings.length === 0 ? (
              <p className="font-mono text-xs text-muted/60">no positions yet</p>
            ) : (
              <table className="w-full font-mono text-xs">
                <thead className="text-muted/60">
                  <tr className="text-left">
                    <th className="pb-1 font-normal">sym</th>
                    <th className="pb-1 text-right font-normal">qty</th>
                    <th className="pb-1 text-right font-normal">avg</th>
                    <th className="pb-1 text-right font-normal">value</th>
                    <th className="pb-1 text-right font-normal">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => {
                    const pnl = unrealisedPnL(h, priceOf(h.ticker));
                    return (
                      <tr key={h.ticker} className="text-fg">
                        <td className="py-0.5">{h.ticker}</td>
                        <td className="py-0.5 text-right">{h.shares}</td>
                        <td className="py-0.5 text-right text-muted">{h.avgCost.toFixed(2)}</td>
                        <td className="py-0.5 text-right">{money(priceOf(h.ticker) * h.shares)}</td>
                        <td className={`py-0.5 text-right ${pnl >= 0 ? 'text-live' : 'text-sell'}`}>
                          {pnl >= 0 ? '+' : ''}
                          {pnl.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-lg border border-line bg-surface/40 p-4">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">History</h2>
            {portfolio.history.length === 0 ? (
              <p className="font-mono text-xs text-muted/60">no transactions yet</p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-auto">
                {portfolio.history.map((t) => (
                  <div key={t.id} className="grid grid-cols-[auto_1fr_auto] gap-2 font-mono text-xs">
                    <span className="text-muted/50">
                      {new Date(t.ts).toLocaleTimeString('en-GB', { hour12: false })}
                    </span>
                    <span
                      className={
                        t.side === 'buy'
                          ? 'text-live'
                          : t.side === 'sell'
                            ? 'text-sell'
                            : 'text-muted'
                      }
                    >
                      {t.side === 'deposit'
                        ? `deposit ${money(t.amount ?? 0)}`
                        : `${t.side} ${t.shares} ${t.ticker} @ ${(t.price ?? 0).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DemoChrome>
  );
}
