// A limit order book with price-time priority.
//
// Design choices, mirroring how I built the original:
//   - Per-price FIFO queues give time priority within a price level.
//   - A monotonically increasing sequence number stamps arrival order.
//   - Market orders walk the book across levels; crossing limit orders fill
//     then rest any remainder.
//   - Cancellation is lazy: orders are tombstoned and skipped or popped when
//     the matcher reaches them, rather than being spliced out eagerly.
//
// The engine is deterministic and emits trade and book-update events the UI
// subscribes to. No framework imports; the demo and the tests share this file.

export type Side = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
export type Owner = 'user' | 'sim' | 'seed';

export interface SubmitInput {
  side: Side;
  type: OrderType;
  price?: number; // required for limit orders, ignored for market orders
  quantity: number;
  owner?: Owner;
}

export interface Order {
  id: number;
  side: Side;
  type: OrderType;
  price: number;
  quantity: number; // original quantity
  remaining: number; // quantity still unfilled
  seq: number; // arrival sequence, for time priority
  cancelled: boolean;
  owner: Owner;
}

export interface Trade {
  id: number;
  price: number;
  quantity: number;
  aggressorSide: Side;
  makerId: number;
  takerId: number;
  seq: number; // logical time
}

export interface PriceLevel {
  price: number;
  size: number; // summed remaining of live orders
  count: number; // number of live orders (queue length)
  /** Ids of the current user's live orders resting at this level. */
  userIds: number[];
}

export interface BookSnapshot {
  bids: PriceLevel[]; // sorted high price to low
  asks: PriceLevel[]; // sorted low price to high
  bestBid?: number;
  bestAsk?: number;
}

interface EngineEvents {
  trade: Trade;
  book: BookSnapshot;
}

type Handler<K extends keyof EngineEvents> = (payload: EngineEvents[K]) => void;

export class MatchingEngine {
  private bids = new Map<number, Order[]>();
  private asks = new Map<number, Order[]>();
  private orders = new Map<number, Order>();
  private nextOrderId = 1;
  private nextTradeId = 1;
  private seq = 1;
  private listeners: { [K in keyof EngineEvents]: Set<Handler<K>> } = {
    trade: new Set(),
    book: new Set(),
  };

  on<K extends keyof EngineEvents>(event: K, handler: Handler<K>): () => void {
    this.listeners[event].add(handler);
    return () => this.listeners[event].delete(handler);
  }

  private emit<K extends keyof EngineEvents>(event: K, payload: EngineEvents[K]): void {
    for (const handler of this.listeners[event]) handler(payload);
  }

  reset(): void {
    this.bids.clear();
    this.asks.clear();
    this.orders.clear();
    this.nextOrderId = 1;
    this.nextTradeId = 1;
    this.seq = 1;
    this.emit('book', this.snapshot());
  }

  getOrder(id: number): Order | undefined {
    return this.orders.get(id);
  }

  /** Submit an order, returning it (with live remaining) and any trades. */
  submit(input: SubmitInput): { order: Order; trades: Trade[] } {
    const order: Order = {
      id: this.nextOrderId++,
      side: input.side,
      type: input.type,
      price: input.type === 'market' ? (input.side === 'buy' ? Infinity : 0) : input.price ?? 0,
      quantity: input.quantity,
      remaining: input.quantity,
      seq: this.seq++,
      cancelled: false,
      owner: input.owner ?? 'user',
    };
    this.orders.set(order.id, order);

    const trades = this.match(order);

    // Rest any remainder of a limit order; market remainder is discarded.
    if (order.type === 'limit' && order.remaining > 0) {
      const book = order.side === 'buy' ? this.bids : this.asks;
      const queue = book.get(order.price);
      if (queue) queue.push(order);
      else book.set(order.price, [order]);
    }

    this.emit('book', this.snapshot());
    return { order, trades };
  }

  /** Lazy cancel: tombstone the order so the matcher skips it. */
  cancel(orderId: number): boolean {
    const order = this.orders.get(orderId);
    if (!order || order.cancelled || order.remaining <= 0) return false;
    order.cancelled = true;
    this.emit('book', this.snapshot());
    return true;
  }

  private match(taker: Order): Trade[] {
    const trades: Trade[] = [];
    const oppositeBook = taker.side === 'buy' ? this.asks : this.bids;
    // Best price first: lowest ask for a buy, highest bid for a sell.
    const prices = [...oppositeBook.keys()].sort((a, b) =>
      taker.side === 'buy' ? a - b : b - a,
    );

    for (const price of prices) {
      if (taker.remaining <= 0) break;
      // Limit orders only cross within their price; market orders walk freely.
      if (taker.type === 'limit') {
        if (taker.side === 'buy' && price > taker.price) break;
        if (taker.side === 'sell' && price < taker.price) break;
      }

      const queue = oppositeBook.get(price)!;
      while (queue.length > 0 && taker.remaining > 0) {
        const maker = queue[0];
        if (maker.cancelled || maker.remaining <= 0) {
          queue.shift(); // pop the tombstone when we reach it
          continue;
        }
        const qty = Math.min(taker.remaining, maker.remaining);
        maker.remaining -= qty;
        taker.remaining -= qty;

        const trade: Trade = {
          id: this.nextTradeId++,
          price: maker.price, // trade executes at the resting (maker) price
          quantity: qty,
          aggressorSide: taker.side,
          makerId: maker.id,
          takerId: taker.id,
          seq: this.seq++,
        };
        trades.push(trade);
        this.emit('trade', trade);

        if (maker.remaining <= 0) queue.shift();
      }

      if (queue.length === 0) oppositeBook.delete(price);
    }

    return trades;
  }

  private aggregate(book: Map<number, Order[]>, ascending: boolean): PriceLevel[] {
    const levels: PriceLevel[] = [];
    for (const [price, queue] of book) {
      let size = 0;
      let count = 0;
      const userIds: number[] = [];
      for (const o of queue) {
        if (o.cancelled || o.remaining <= 0) continue;
        size += o.remaining;
        count += 1;
        if (o.owner === 'user') userIds.push(o.id);
      }
      if (size > 0) levels.push({ price, size, count, userIds });
    }
    levels.sort((a, b) => (ascending ? a.price - b.price : b.price - a.price));
    return levels;
  }

  snapshot(): BookSnapshot {
    const bids = this.aggregate(this.bids, false);
    const asks = this.aggregate(this.asks, true);
    return {
      bids,
      asks,
      bestBid: bids[0]?.price,
      bestAsk: asks[0]?.price,
    };
  }

  midPrice(): number | undefined {
    const snap = this.snapshot();
    if (snap.bestBid === undefined || snap.bestAsk === undefined) return undefined;
    return (snap.bestBid + snap.bestAsk) / 2;
  }
}

// --- Deterministic order-flow generator for the market simulation ----------

/** Small deterministic PRNG so a seed reproduces the same order flow. */
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

/** Generate a plausible next order around `mid`, roughly mean-reverting. */
export function nextSimOrder(rand: () => number, mid: number): SubmitInput {
  const side: Side = rand() < 0.5 ? 'buy' : 'sell';
  const quantity = 1 + Math.floor(rand() * 8);
  // ~12% of flow is marketable; the rest rests near the touch.
  if (rand() < 0.12) {
    return { side, type: 'market', quantity, owner: 'sim' };
  }
  const offset = Math.floor(rand() * 4); // ticks away from mid
  const price = side === 'buy' ? mid - offset : mid + offset;
  return { side, type: 'limit', price, quantity, owner: 'sim' };
}
