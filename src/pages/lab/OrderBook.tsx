import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { DemoChrome } from '../../components/DemoChrome';
import {
  MatchingEngine,
  mulberry32,
  nextSimOrder,
  type BookSnapshot,
  type Trade,
  type Side,
  type OrderType,
  type PriceLevel,
} from '../../lib/matchingEngine';

const SEED_MID = 100;

function CumulativeDepth({ snapshot }: { snapshot: BookSnapshot }) {
  const { bids, asks } = snapshot;
  if (bids.length === 0 && asks.length === 0) {
    return <div className="font-mono text-xs text-muted/60">depth appears once the book has orders</div>;
  }

  const bidCum: { price: number; cum: number }[] = [];
  let acc = 0;
  for (const l of bids) {
    acc += l.size;
    bidCum.push({ price: l.price, cum: acc });
  }
  const askCum: { price: number; cum: number }[] = [];
  acc = 0;
  for (const l of asks) {
    acc += l.size;
    askCum.push({ price: l.price, cum: acc });
  }

  const prices = [...bids, ...asks].map((l) => l.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const maxCum = Math.max(1, ...bidCum.map((d) => d.cum), ...askCum.map((d) => d.cum));
  const W = 300;
  const H = 90;
  const x = (p: number) => (maxP === minP ? W / 2 : ((p - minP) / (maxP - minP)) * W);
  const y = (c: number) => H - (c / maxCum) * H;

  const toPath = (data: { price: number; cum: number }[]) => {
    if (data.length === 0) return '';
    const sorted = [...data].sort((a, b) => a.price - b.price);
    const pts = sorted.map((d) => `${x(d.price).toFixed(1)},${y(d.cum).toFixed(1)}`);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return `M ${x(first.price).toFixed(1)},${H} L ${pts.join(' L ')} L ${x(last.price).toFixed(1)},${H} Z`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" preserveAspectRatio="none" aria-hidden="true">
      <path d={toPath(bidCum)} fill="var(--color-live)" opacity="0.18" />
      <path d={toPath(bidCum)} fill="none" stroke="var(--color-live)" strokeWidth="1" opacity="0.7" />
      <path d={toPath(askCum)} fill="var(--color-sell)" opacity="0.18" />
      <path d={toPath(askCum)} fill="none" stroke="var(--color-sell)" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

function LadderRow({
  level,
  side,
  maxSize,
  onCancel,
}: {
  level: PriceLevel;
  side: Side;
  maxSize: number;
  onCancel: (ids: number[]) => void;
}) {
  const mine = level.userIds.length > 0;
  const colour = side === 'sell' ? 'text-sell' : 'text-live';
  const bar = side === 'sell' ? 'bg-sell/15' : 'bg-live/15';
  return (
    <div className="relative grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 px-2 py-0.5 font-mono text-sm">
      <div
        className={`absolute inset-y-0 right-0 ${bar}`}
        style={{ width: `${(level.size / maxSize) * 100}%` }}
        aria-hidden="true"
      />
      <span className={`relative ${colour}`}>{level.price.toFixed(0)}</span>
      <span className="relative text-right text-fg">{level.size}</span>
      <span className="relative text-right text-muted/70">{level.count}</span>
      <span className="relative w-5 text-right">
        {mine && (
          <button
            type="button"
            onClick={() => onCancel(level.userIds)}
            title="Cancel your order at this level"
            aria-label={`Cancel your order at ${level.price}`}
            className="text-muted hover:text-fg"
          >
            <X size={13} />
          </button>
        )}
      </span>
    </div>
  );
}

export default function OrderBook() {
  const engineRef = useRef<MatchingEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new MatchingEngine();
  const engine = engineRef.current;

  const [snapshot, setSnapshot] = useState<BookSnapshot>({ bids: [], asks: [] });
  const [tape, setTape] = useState<Trade[]>([]);
  const [running, setRunning] = useState(false);
  const [announce, setAnnounce] = useState(false);

  const [side, setSide] = useState<Side>('buy');
  const [type, setType] = useState<OrderType>('limit');
  const [price, setPrice] = useState('100');
  const [quantity, setQuantity] = useState('5');

  const rngRef = useRef(mulberry32(20260612));
  const simRef = useRef<number | null>(null);

  useEffect(() => {
    const offBook = engine.on('book', (snap) => setSnapshot(snap));
    const offTrade = engine.on('trade', (t) => setTape((prev) => [t, ...prev].slice(0, 30)));
    return () => {
      offBook();
      offTrade();
    };
  }, [engine]);

  const seedBook = () => {
    const r = mulberry32(7);
    for (let i = 1; i <= 6; i++) {
      engine.submit({ side: 'sell', type: 'limit', price: SEED_MID + i, quantity: 2 + Math.floor(r() * 8), owner: 'seed' });
      engine.submit({ side: 'buy', type: 'limit', price: SEED_MID - i, quantity: 2 + Math.floor(r() * 8), owner: 'seed' });
    }
  };

  const reset = () => {
    setRunning(false);
    engine.reset();
    setTape([]);
  };

  // Market simulation loop, ~3 orders/sec.
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const mid = engine.midPrice() ?? SEED_MID;
      engine.submit(nextSimOrder(rngRef.current, Math.round(mid)));
    };
    simRef.current = window.setInterval(tick, 333);
    return () => {
      if (simRef.current) window.clearInterval(simRef.current);
    };
  }, [running, engine]);

  const submitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;
    if (type === 'limit') {
      const p = Number(price);
      if (!Number.isFinite(p) || p <= 0) return;
      engine.submit({ side, type, price: p, quantity: qty, owner: 'user' });
    } else {
      engine.submit({ side, type, quantity: qty, owner: 'user' });
    }
  };

  const cancel = (ids: number[]) => ids.forEach((id) => engine.cancel(id));

  const maxSize = useMemo(
    () => Math.max(1, ...snapshot.bids.map((l) => l.size), ...snapshot.asks.map((l) => l.size)),
    [snapshot],
  );
  const spread =
    snapshot.bestAsk !== undefined && snapshot.bestBid !== undefined
      ? snapshot.bestAsk - snapshot.bestBid
      : undefined;

  return (
    <DemoChrome labId="orderbook">
      {/* Sim controls */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={seedBook}
          className="rounded-md border border-line px-3 py-1.5 font-mono text-sm text-fg hover:border-muted"
        >
          Seed book
        </button>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className={`rounded-md px-3 py-1.5 font-mono text-sm font-semibold ${
            running ? 'border border-line text-fg' : 'bg-live text-bg'
          }`}
        >
          {running ? 'Pause market' : 'Start market'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-line px-3 py-1.5 font-mono text-sm text-muted"
        >
          Reset
        </button>
        <label className="ml-auto flex items-center gap-2 font-mono text-xs text-muted">
          <input
            type="checkbox"
            checked={announce}
            onChange={(e) => setAnnounce(e.target.checked)}
            className="accent-[var(--color-live)]"
          />
          announce trades
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order entry */}
        <form onSubmit={submitOrder} className="space-y-4 rounded-lg border border-line bg-surface/40 p-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted">Order entry</h2>

          <div className="grid grid-cols-2 gap-2">
            {(['buy', 'sell'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={`rounded-md border px-3 py-1.5 font-mono text-sm capitalize ${
                  side === s
                    ? s === 'buy'
                      ? 'border-live bg-live/15 text-live'
                      : 'border-sell bg-sell/15 text-sell'
                    : 'border-line text-muted'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['limit', 'market'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                title={
                  t === 'limit'
                    ? 'Limit: rests in the book at your price until matched.'
                    : 'Market: takes the best available prices immediately.'
                }
                className={`rounded-md border px-3 py-1.5 font-mono text-sm capitalize ${
                  type === t ? 'border-muted text-fg' : 'border-line text-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="font-mono text-xs text-muted">Price</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={type === 'market'}
              aria-label="Limit price"
              className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-1.5 font-mono text-sm text-fg outline-none focus:border-muted disabled:opacity-40"
            />
          </label>

          <label className="block">
            <span className="font-mono text-xs text-muted">Quantity</span>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-label="Quantity"
              className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-1.5 font-mono text-sm text-fg outline-none focus:border-muted"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-md bg-live px-3 py-2 font-mono text-sm font-semibold text-bg"
          >
            Submit order
          </button>
          <p className="font-mono text-[11px] leading-relaxed text-muted/70">
            Orders fill by price-time priority: best price first, then earliest arrival. Your resting
            orders are highlighted and can be cancelled.
          </p>
        </form>

        {/* Book ladder */}
        <div className="rounded-lg border border-line bg-surface/40 p-4">
          <div className="mb-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-2 font-mono text-[11px] uppercase tracking-wider text-muted/60">
            <span>price</span>
            <span className="text-right">size</span>
            <span className="text-right">queue</span>
            <span className="w-5" />
          </div>

          <div className="flex flex-col-reverse">
            {snapshot.asks.slice(0, 8).map((l) => (
              <LadderRow key={`a-${l.price}`} level={l} side="sell" maxSize={maxSize} onCancel={cancel} />
            ))}
          </div>

          <div className="my-1 flex items-center justify-between border-y border-line px-2 py-1 font-mono text-xs text-muted">
            <span>spread</span>
            <span className="text-fg">{spread !== undefined ? spread.toFixed(0) : '—'}</span>
          </div>

          <div className="flex flex-col">
            {snapshot.bids.slice(0, 8).map((l) => (
              <LadderRow key={`b-${l.price}`} level={l} side="buy" maxSize={maxSize} onCancel={cancel} />
            ))}
          </div>

          {snapshot.bids.length === 0 && snapshot.asks.length === 0 && (
            <p className="px-2 py-6 text-center font-mono text-xs text-muted/60">
              empty book — seed it or submit an order
            </p>
          )}

          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted/60">
              cumulative depth
            </div>
            <CumulativeDepth snapshot={snapshot} />
          </div>
        </div>

        {/* Trade tape */}
        <div className="rounded-lg border border-line bg-surface/40 p-4">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted">Trade tape</h2>
          <div
            className="space-y-0.5"
            aria-live={announce ? 'polite' : 'off'}
            aria-label="Trade tape"
          >
            <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 px-1 font-mono text-[11px] uppercase tracking-wider text-muted/60">
              <span>#</span>
              <span className="text-right">price</span>
              <span className="text-right">qty</span>
              <span className="text-right">side</span>
            </div>
            {tape.length === 0 && (
              <p className="px-1 py-4 font-mono text-xs text-muted/60">no trades yet</p>
            )}
            {tape.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 px-1 font-mono text-xs"
              >
                <span className="text-muted/50">{t.id}</span>
                <span className="text-right text-fg">{t.price.toFixed(0)}</span>
                <span className="text-right text-muted">{t.quantity}</span>
                <span className={`text-right ${t.aggressorSide === 'buy' ? 'text-live' : 'text-sell'}`}>
                  {t.aggressorSide}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DemoChrome>
  );
}
