// Section 9.5: the timing model, used everywhere (hero, Figure 2, Figure 3).
// Pure functions over the topology in src/content/pipeline.ts.

import { nodes, type BuilderSlug } from '../content/pipeline';

export const SECONDS_PER_CALL = 5;
export const PARALLEL_CEILING = 20;

export interface Ops {
  add: BuilderSlug | null;
  update: BuilderSlug | null;
  del: boolean;
}

export type Mode = 'seq' | 'par';

/** 1 for Split, plus 4 for an add, plus 4 for an update, plus 1 for a delete. */
export function callCount(ops: Ops): number {
  return 1 + (ops.add ? 4 : 0) + (ops.update ? 4 : 0) + (ops.del ? 1 : 0);
}

export const sequentialSeconds = (calls: number) => calls * SECONDS_PER_CALL;
export const parallelSeconds = (calls: number) => Math.min(sequentialSeconds(calls), PARALLEL_CEILING);

export function totalSeconds(ops: Ops, mode: Mode): number {
  const c = callCount(ops);
  return mode === 'seq' ? sequentialSeconds(c) : parallelSeconds(c);
}

/** The AI calls a request uses, in sequential execution order. */
export function activeCalls(ops: Ops): string[] {
  const out = ['split'];
  if (ops.add) out.push('add.condition', 'add.semantic', 'add.classify', `add.builder.${ops.add}`);
  if (ops.update) out.push('update.condition', 'update.semantic', 'update.classify', `update.builder.${ops.update}`);
  if (ops.del) out.push('delete');
  return out;
}

/** Every node the request touches, including input and code steps. */
export function activeNodes(ops: Ops): Set<string> {
  return new Set(['request', ...activeCalls(ops), 'merge', 'render']);
}

export interface Slot {
  id: string;
  start: number;
  end: number;
}

export interface Schedule {
  slots: Slot[];
  /** Last AI call end. */
  callsEnd: number;
  /** Wall-clock total from the timing model. */
  total: number;
  /** Unbroken-down time between the last call and the total (parallel only). */
  overhead: { start: number; end: number } | null;
}

/**
 * Sequential: bars end to end. Parallel: Split first, then Condition, Classify and
 * Delete together, then Semantic match and the list builders together.
 */
export function schedule(ops: Ops, mode: Mode): Schedule {
  const calls = activeCalls(ops);
  const total = totalSeconds(ops, mode);
  const S = SECONDS_PER_CALL;
  let slots: Slot[];
  if (mode === 'seq') {
    slots = calls.map((id, i) => ({ id, start: i * S, end: (i + 1) * S }));
  } else {
    const wave = (id: string) => {
      if (id === 'split') return 0;
      if (id.endsWith('.condition') || id.endsWith('.classify') || id === 'delete') return 1;
      return 2;
    };
    slots = calls.map((id) => ({ id, start: wave(id) * S, end: (wave(id) + 1) * S }));
  }
  const callsEnd = Math.max(...slots.map((s) => s.end));
  return {
    slots,
    callsEnd,
    total,
    overhead: total > callsEnd ? { start: callsEnd, end: total } : null,
  };
}

/** Node ids in the order they start. Ties keep sequential order. */
export function startOrder(ops: Ops, mode: Mode): string[] {
  return schedule(ops, mode)
    .slots.map((s, i) => ({ ...s, i }))
    .sort((a, b) => a.start - b.start || a.i - b.i)
    .map((s) => s.id);
}

export function nodeById(id: string) {
  return nodes.find((n) => n.id === id);
}

/** Plain-language progress line for the live region. */
export function progressLine(finished: string[], started: string[]): string {
  const label = (id: string) => {
    const n = nodeById(id);
    if (!n) return id;
    if (id.startsWith('add.')) return `Add ${n.label.toLowerCase()}`;
    if (id.startsWith('update.')) return `Update ${n.label.toLowerCase()}`;
    return n.label;
  };
  const parts: string[] = [];
  if (finished.length) parts.push(`${finished.map(label).join(', ')} finished.`);
  if (started.length) parts.push(`${started.map(label).join(', ')} started.`);
  return parts.join(' ');
}
