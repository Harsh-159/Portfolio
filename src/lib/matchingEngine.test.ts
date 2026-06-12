import { describe, it, expect } from 'vitest';
import { MatchingEngine, mulberry32, nextSimOrder, type Order } from './matchingEngine';

function seedAsks(engine: MatchingEngine, levels: [number, number][]) {
  for (const [price, qty] of levels) {
    engine.submit({ side: 'sell', type: 'limit', price, quantity: qty, owner: 'seed' });
  }
}

describe('MatchingEngine', () => {
  it('crosses a limit order across multiple price levels', () => {
    const e = new MatchingEngine();
    seedAsks(e, [
      [100, 5],
      [101, 5],
      [102, 5],
    ]);
    const { trades } = e.submit({ side: 'buy', type: 'limit', price: 102, quantity: 12 });

    expect(trades.map((t) => [t.price, t.quantity])).toEqual([
      [100, 5],
      [101, 5],
      [102, 2],
    ]);
    const snap = e.snapshot();
    // 3 left resting at 102, nothing below.
    expect(snap.asks).toEqual([{ price: 102, size: 3, count: 1, userIds: [] }]);
    expect(snap.bids).toHaveLength(0);
  });

  it('leaves the correct remainder resting on a partial fill', () => {
    const e = new MatchingEngine();
    seedAsks(e, [[100, 8]]);
    const { order } = e.submit({ side: 'buy', type: 'limit', price: 100, quantity: 12 });
    expect(order.remaining).toBe(4);
    const snap = e.snapshot();
    expect(snap.bids).toEqual([{ price: 100, size: 4, count: 1, userIds: expect.any(Array) }]);
    expect(snap.asks).toHaveLength(0);
  });

  it('walks the book with a market order and discards any remainder', () => {
    const e = new MatchingEngine();
    seedAsks(e, [
      [100, 2],
      [101, 2],
    ]);
    const { order, trades } = e.submit({ side: 'buy', type: 'market', quantity: 10 });
    expect(trades.map((t) => t.quantity)).toEqual([2, 2]);
    expect(order.remaining).toBe(6); // leftover not rested
    expect(e.snapshot().bids).toHaveLength(0);
    expect(e.snapshot().asks).toHaveLength(0);
  });

  it('never fills a cancelled order', () => {
    const e = new MatchingEngine();
    const { order: resting } = e.submit({ side: 'sell', type: 'limit', price: 100, quantity: 5 });
    expect(e.cancel(resting.id)).toBe(true);

    const { trades, order } = e.submit({ side: 'buy', type: 'limit', price: 100, quantity: 5 });
    expect(trades).toHaveLength(0);
    // The buy could not match the tombstoned ask, so it rests as a bid.
    expect(order.remaining).toBe(5);
    expect(e.snapshot().bids).toEqual([{ price: 100, size: 5, count: 1, userIds: expect.any(Array) }]);
  });

  it('respects price-time priority within a level', () => {
    const e = new MatchingEngine();
    const first = e.submit({ side: 'sell', type: 'limit', price: 100, quantity: 3 }).order;
    const second = e.submit({ side: 'sell', type: 'limit', price: 100, quantity: 3 }).order;
    const { trades } = e.submit({ side: 'buy', type: 'limit', price: 100, quantity: 3 });
    // The earlier resting order (first) must fill before the later one.
    expect(trades[0].makerId).toBe(first.id);
    expect(trades[0].makerId).not.toBe(second.id);
  });

  it('conserves quantity across a randomised session', () => {
    const e = new MatchingEngine();
    const rand = mulberry32(42);
    const all: Order[] = [];
    let tradedVolume = 0;
    e.on('trade', (t) => {
      tradedVolume += t.quantity;
    });

    let mid = 100;
    for (let i = 0; i < 500; i++) {
      const input = nextSimOrder(rand, mid);
      const { order } = e.submit(input);
      all.push(order);
      mid = e.midPrice() ?? mid;
      // Occasionally cancel a still-live order.
      if (rand() < 0.1) {
        const live = all.find((o) => !o.cancelled && o.remaining > 0);
        if (live) e.cancel(live.id);
      }
    }

    const originalTotal = all.reduce((s, o) => s + o.quantity, 0);
    const remainingTotal = all.reduce((s, o) => s + o.remaining, 0);
    // Each trade reduces both a maker and a taker by its quantity.
    expect(originalTotal - remainingTotal).toBe(2 * tradedVolume);
  });
});
