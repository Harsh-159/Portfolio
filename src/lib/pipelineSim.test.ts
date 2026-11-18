import { describe, it, expect } from 'vitest';
import { callCount, totalSeconds, schedule, startOrder, activeCalls, activeNodes, type Ops } from './pipelineSim';
import { nodes, edges, builderSlugs } from '../content/pipeline';

const combos: Ops[] = [];
for (const add of [null, 'users'] as const)
  for (const update of [null, 'approval-group'] as const)
    for (const del of [false, true]) combos.push({ add, update, del });

describe('topology', () => {
  it('has 19 distinct prompts and 22 AI call sites', () => {
    const ai = nodes.filter((n) => n.kind === 'ai');
    expect(ai.length).toBe(1 + 3 + 7 + 3 + 7 + 1); // 22 call sites
    // split + delete + condition + semantic + classify are shared across branches: 5 routing prompts
    expect(5 + 7 + 7).toBe(19);
  });
  it('every edge joins known nodes', () => {
    const ids = new Set(nodes.map((n) => n.id));
    for (const [a, b] of edges) {
      expect(ids.has(a)).toBe(true);
      expect(ids.has(b)).toBe(true);
    }
  });
  it('has seven list builders', () => expect(builderSlugs.length).toBe(7));
});

describe('call counts for every combination', () => {
  it.each(combos)('%o', (ops) => {
    const expected = 1 + (ops.add ? 4 : 0) + (ops.update ? 4 : 0) + (ops.del ? 1 : 0);
    expect(callCount(ops)).toBe(expected);
    expect(activeCalls(ops).length).toBe(expected);
  });
});

describe('timing rules', () => {
  it('delete only is 2 calls, about 10 s either way', () => {
    const ops: Ops = { add: null, update: null, del: true };
    expect(callCount(ops)).toBe(2);
    expect(totalSeconds(ops, 'seq')).toBe(10);
    expect(totalSeconds(ops, 'par')).toBe(10);
  });
  it('one add is 5 calls, about 25 s against about 20 s', () => {
    const ops: Ops = { add: 'users', update: null, del: false };
    expect(totalSeconds(ops, 'seq')).toBe(25);
    expect(totalSeconds(ops, 'par')).toBe(20);
  });
  it('preset 4 is 10 calls, about 50 s against about 20 s', () => {
    const ops: Ops = { add: 'management-hierarchy', update: 'approval-group', del: true };
    expect(callCount(ops)).toBe(10);
    expect(totalSeconds(ops, 'seq')).toBe(50);
    expect(totalSeconds(ops, 'par')).toBe(20);
  });
  it('sequential bars sit end to end', () => {
    const s = schedule({ add: 'users', update: null, del: true }, 'seq');
    s.slots.forEach((slot, i) => expect(slot.start).toBe(i * 5));
    expect(s.overhead).toBeNull();
  });
  it('parallel adds an unbroken-down bar up to 20 s', () => {
    const s = schedule({ add: 'users', update: 'users', del: true }, 'par');
    expect(s.callsEnd).toBe(15);
    expect(s.overhead).toEqual({ start: 15, end: 20 });
  });
});

describe('start order', () => {
  it('starts Split first, then Condition, Classify and Delete, then Semantic and builders', () => {
    const order = startOrder({ add: 'users', update: 'approval-group', del: true }, 'par');
    expect(order[0]).toBe('split');
    expect(order.slice(1, 6).sort()).toEqual(
      ['add.classify', 'add.condition', 'delete', 'update.classify', 'update.condition'].sort(),
    );
    expect(order.slice(6).sort()).toEqual(
      ['add.builder.users', 'add.semantic', 'update.builder.approval-group', 'update.semantic'].sort(),
    );
  });
});

describe('unused branches never run', () => {
  it.each(combos)('%o', (ops) => {
    const active = activeNodes(ops);
    for (const id of active) {
      if (id.startsWith('add.')) expect(ops.add).not.toBeNull();
      if (id.startsWith('update.')) expect(ops.update).not.toBeNull();
      if (id === 'delete') expect(ops.del).toBe(true);
    }
    // Only the chosen builder runs in each branch.
    const builderRuns = [...active].filter((id) => id.includes('.builder.'));
    expect(builderRuns.length).toBe((ops.add ? 1 : 0) + (ops.update ? 1 : 0));
  });
});
