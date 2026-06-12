// Stock simulator engine: a seeded price process plus pure portfolio operations.
// A browser remake of my CS50 Flask + SQL + IEX Cloud project. No real market
// data; prices are a simulated random walk. The UI is a thin layer over this.

export interface StockMeta {
  ticker: string;
  sector: string;
  basePrice: number;
}

// Fictional tickers only (never real company symbols).
export const STOCKS: StockMeta[] = [
  { ticker: 'ACME', sector: 'Industrials', basePrice: 142 },
  { ticker: 'NORD', sector: 'Energy', basePrice: 78 },
  { ticker: 'HELIX', sector: 'Biotech', basePrice: 213 },
  { ticker: 'VOLTA', sector: 'Utilities', basePrice: 56 },
  { ticker: 'KESTREL', sector: 'Aerospace', basePrice: 305 },
  { ticker: 'ORBIT', sector: 'Telecom', basePrice: 34 },
  { ticker: 'FERRO', sector: 'Materials', basePrice: 91 },
  { ticker: 'LUMEN', sector: 'Technology', basePrice: 168 },
];

/** Small deterministic PRNG so a seed reproduces the same price path. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Approx standard normal from the uniform PRNG (sum of 4, centred). */
function gauss(rand: () => number): number {
  return rand() + rand() + rand() + rand() - 2;
}

export const TICK_VOL = 0.014;

/** One geometric random-walk step for a single price (always positive). */
export function nextPrice(price: number, rand: () => number, vol = TICK_VOL): number {
  const next = price * Math.exp(vol * gauss(rand));
  return Math.max(1, Math.round(next * 100) / 100);
}

/** Advance every price one step. Deterministic for a given `rand`. */
export function stepPrices(prices: number[], rand: () => number, vol = TICK_VOL): number[] {
  return prices.map((p) => nextPrice(p, rand, vol));
}

export function basePrices(): number[] {
  return STOCKS.map((s) => s.basePrice);
}

// --- Portfolio -------------------------------------------------------------

export interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
}

export type TxnSide = 'buy' | 'sell' | 'deposit';

export interface Transaction {
  id: number;
  ts: number;
  side: TxnSide;
  ticker?: string;
  shares?: number;
  price?: number;
  amount?: number;
}

export interface Portfolio {
  cash: number;
  holdings: Record<string, Holding>;
  history: Transaction[];
  nextTxnId: number;
}

export const STARTING_CASH = 10000;

export function initialPortfolio(): Portfolio {
  return { cash: STARTING_CASH, holdings: {}, history: [], nextTxnId: 1 };
}

export type TradeError = 'insufficient_cash' | 'insufficient_shares' | 'invalid_quantity';

export type TradeResult =
  | { ok: true; portfolio: Portfolio }
  | { ok: false; error: TradeError };

function isValidQuantity(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

export function buy(
  p: Portfolio,
  ticker: string,
  shares: number,
  price: number,
  ts: number,
): TradeResult {
  if (!isValidQuantity(shares)) return { ok: false, error: 'invalid_quantity' };
  const cost = shares * price;
  if (cost > p.cash) return { ok: false, error: 'insufficient_cash' };

  const existing = p.holdings[ticker];
  const newShares = (existing?.shares ?? 0) + shares;
  const newAvgCost = existing
    ? (existing.shares * existing.avgCost + cost) / newShares
    : price;

  return {
    ok: true,
    portfolio: {
      ...p,
      cash: p.cash - cost,
      holdings: { ...p.holdings, [ticker]: { ticker, shares: newShares, avgCost: newAvgCost } },
      history: [
        { id: p.nextTxnId, ts, side: 'buy', ticker, shares, price },
        ...p.history,
      ],
      nextTxnId: p.nextTxnId + 1,
    },
  };
}

export function sell(
  p: Portfolio,
  ticker: string,
  shares: number,
  price: number,
  ts: number,
): TradeResult {
  if (!isValidQuantity(shares)) return { ok: false, error: 'invalid_quantity' };
  const existing = p.holdings[ticker];
  if (!existing || existing.shares < shares) return { ok: false, error: 'insufficient_shares' };

  const remaining = existing.shares - shares;
  const holdings = { ...p.holdings };
  if (remaining === 0) delete holdings[ticker];
  else holdings[ticker] = { ...existing, shares: remaining };

  return {
    ok: true,
    portfolio: {
      ...p,
      cash: p.cash + shares * price,
      holdings,
      history: [
        { id: p.nextTxnId, ts, side: 'sell', ticker, shares, price },
        ...p.history,
      ],
      nextTxnId: p.nextTxnId + 1,
    },
  };
}

export function deposit(p: Portfolio, amount: number, ts: number): TradeResult {
  if (!(amount > 0)) return { ok: false, error: 'invalid_quantity' };
  return {
    ok: true,
    portfolio: {
      ...p,
      cash: p.cash + amount,
      history: [{ id: p.nextTxnId, ts, side: 'deposit', amount }, ...p.history],
      nextTxnId: p.nextTxnId + 1,
    },
  };
}

/** Unrealised profit/loss for a holding at the current price. */
export function unrealisedPnL(holding: Holding, currentPrice: number): number {
  return (currentPrice - holding.avgCost) * holding.shares;
}

/** Total market value of all holdings at the given prices. */
export function holdingsValue(p: Portfolio, priceOf: (ticker: string) => number): number {
  return Object.values(p.holdings).reduce((sum, h) => sum + priceOf(h.ticker) * h.shares, 0);
}

export function totalValue(p: Portfolio, priceOf: (ticker: string) => number): number {
  return p.cash + holdingsValue(p, priceOf);
}
