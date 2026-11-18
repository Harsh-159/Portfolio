import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { route, presets, services, ANCHOR_TOOLS } from './routing';
import { step, initialLoop, MAX_ITERATIONS, MAX_TOOL_CALLS, type Breakage } from './loopGuards';

const tools: { name: string; service: string }[] = JSON.parse(
  readFileSync(new URL('../../public/data/orchestrator/tools.json', import.meta.url), 'utf8'),
);

describe('catalogue', () => {
  it('has 191 tools in 7 services with the stated counts', () => {
    expect(tools.length).toBe(191);
    for (const s of services) expect(tools.filter((t) => t.service === s.slug).length).toBe(s.count);
  });
  it('every anchor tool exists in the catalogue', () => {
    const names = new Set(tools.map((t) => t.name));
    for (const list of Object.values(ANCHOR_TOOLS)) for (const a of list) expect(names.has(a)).toBe(true);
  });
});

describe('routing presets', () => {
  const byLabel = (l: string) => route(presets.find((p) => p.label === l)!.services);
  it('Slack only (10) and Drive only (20) expose everything', () => {
    expect(byLabel('Slack only')).toEqual({ kind: 'all', total: 10 });
    expect(byLabel('Drive only')).toEqual({ kind: 'all', total: 20 });
  });
  it('Gmail and Slack (30) go to the finder with 4 anchors', () => {
    const o = byLabel('Gmail and Slack');
    expect(o.kind).toBe('finder');
    expect(o.total).toBe(30);
    if (o.kind === 'finder') expect(o.anchors.length).toBe(4);
  });
  it('GitHub (86) goes to the finder with 3 anchors', () => {
    const o = byLabel('GitHub');
    expect(o.total).toBe(86);
    if (o.kind === 'finder') expect(o.anchors.length).toBe(3);
    else throw new Error('expected finder');
  });
  it('Everything (191) goes to the finder with 15 anchors', () => {
    const o = byLabel('Everything');
    expect(o.total).toBe(191);
    if (o.kind === 'finder') expect(o.anchors.length).toBe(15);
    else throw new Error('expected finder');
  });
  it('no service means no tools', () => expect(route([])).toEqual({ kind: 'none', total: 0 }));
  it('the limit is respected', () => expect(route(['gmail', 'slack'], 30).kind).toBe('all'));
});

const runToEnd = (b: Breakage | null) => {
  let s = initialLoop();
  for (let i = 0; i < 20 && !s.finished; i++) s = step(s, b);
  return s;
};

describe('loop guards', () => {
  it('refuses a tool after 2 failures', () => {
    let s = step(initialLoop(), 'failing');
    expect(s.refused).toBe(false);
    s = step(s, 'failing');
    expect(s.refused).toBe(true);
    expect(runToEnd('failing').failures).toBe(2);
  });
  it('serves repeats from the cache', () => expect(runToEnd('repeat').cacheHits).toBeGreaterThan(0));
  it('forces a wrap-up at the limits', () => {
    const s = runToEnd('never-finish');
    expect(s.wrapUp).toBe(true);
    expect(s.iteration).toBeLessThanOrEqual(MAX_ITERATIONS + 1);
    expect(s.toolCalls).toBeLessThanOrEqual(MAX_TOOL_CALLS);
  });
  it('cuts huge results to 6,000 characters', () => expect(runToEnd('huge').truncatedChars).toBe(48210 - 6000));
  it('a normal run ends after two iterations', () => expect(runToEnd(null).iteration).toBe(2));
});
