import { describe, it, expect } from 'vitest';
import {
  initialPortfolio,
  buy,
  sell,
  deposit,
  unrealisedPnL,
  totalValue,
  stepPrices,
  mulberry32,
  basePrices,
  STARTING_CASH,
} from './stockSim';

describe('buy', () => {
  it('debits cash and records the holding', () => {
    const r = buy(initialPortfolio(), 'ACME', 10, 100, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.portfolio.cash).toBe(STARTING_CASH - 1000);
    expect(r.portfolio.holdings.ACME).toEqual({ ticker: 'ACME', shares: 10, avgCost: 100 });
    expect(r.portfolio.history[0]).toMatchObject({ side: 'buy', ticker: 'ACME', shares: 10, price: 100 });
  });

  it('computes a blended average cost across two buys', () => {
    let p = initialPortfolio();
    p = (buy(p, 'ACME', 10, 100, 0) as { portfolio: typeof p }).portfolio;
    p = (buy(p, 'ACME', 10, 200, 1) as { portfolio: typeof p }).portfolio;
    expect(p.holdings.ACME.shares).toBe(20);
    expect(p.holdings.ACME.avgCost).toBe(150); // (10*100 + 10*200)/20
  });

  it('rejects when cash is insufficient', () => {
    const r = buy(initialPortfolio(), 'ACME', 1000, 100, 0); // 100,000 > 10,000
    expect(r).toEqual({ ok: false, error: 'insufficient_cash' });
  });

  it('rejects invalid quantities', () => {
    expect(buy(initialPortfolio(), 'ACME', 0, 100, 0)).toEqual({ ok: false, error: 'invalid_quantity' });
    expect(buy(initialPortfolio(), 'ACME', -5, 100, 0)).toEqual({ ok: false, error: 'invalid_quantity' });
    expect(buy(initialPortfolio(), 'ACME', 1.5, 100, 0)).toEqual({ ok: false, error: 'invalid_quantity' });
  });
});

describe('sell', () => {
  it('credits cash, reduces shares, and keeps average cost', () => {
    let p = initialPortfolio();
    p = (buy(p, 'ACME', 10, 100, 0) as { portfolio: typeof p }).portfolio;
    const r = sell(p, 'ACME', 4, 130, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.portfolio.cash).toBe(STARTING_CASH - 1000 + 4 * 130);
    expect(r.portfolio.holdings.ACME.shares).toBe(6);
    expect(r.portfolio.holdings.ACME.avgCost).toBe(100);
  });

  it('removes the holding when fully sold', () => {
    let p = initialPortfolio();
    p = (buy(p, 'ACME', 10, 100, 0) as { portfolio: typeof p }).portfolio;
    const r = sell(p, 'ACME', 10, 130, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.portfolio.holdings.ACME).toBeUndefined();
  });

  it('rejects selling more shares than held', () => {
    let p = initialPortfolio();
    p = (buy(p, 'ACME', 3, 100, 0) as { portfolio: typeof p }).portfolio;
    expect(sell(p, 'ACME', 5, 130, 1)).toEqual({ ok: false, error: 'insufficient_shares' });
    expect(sell(p, 'NORD', 1, 130, 1)).toEqual({ ok: false, error: 'insufficient_shares' });
  });
});

describe('deposit', () => {
  it('adds cash', () => {
    const r = deposit(initialPortfolio(), 500, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.portfolio.cash).toBe(STARTING_CASH + 500);
  });

  it('rejects non-positive amounts', () => {
    expect(deposit(initialPortfolio(), 0, 0)).toEqual({ ok: false, error: 'invalid_quantity' });
  });
});

describe('valuation', () => {
  it('computes unrealised P&L and total value', () => {
    let p = initialPortfolio();
    p = (buy(p, 'ACME', 10, 100, 0) as { portfolio: typeof p }).portfolio;
    expect(unrealisedPnL(p.holdings.ACME, 130)).toBe(300);
    expect(totalValue(p, () => 130)).toBe(STARTING_CASH - 1000 + 10 * 130);
  });
});

describe('price process', () => {
  it('is deterministic under a fixed seed', () => {
    const run = () => {
      const rand = mulberry32(123);
      let prices = basePrices();
      for (let i = 0; i < 25; i++) prices = stepPrices(prices, rand);
      return prices;
    };
    expect(run()).toEqual(run());
  });

  it('keeps prices positive', () => {
    const rand = mulberry32(7);
    let prices = basePrices();
    for (let i = 0; i < 200; i++) prices = stepPrices(prices, rand);
    expect(prices.every((p) => p >= 1)).toBe(true);
  });
});
