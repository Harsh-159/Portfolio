// Section 5.2: every text pair is 4.5:1 or better in both themes.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)) out[m[1]] = m[2];
  return out;
}

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const light = block(':root {');
const dark = { ...light, ...block(":root[data-theme='dark']") };

const pairs: [string, string][] = [
  ['ink', 'paper'],
  ['ink', 'sheet'],
  ['ink-soft', 'paper'],
  ['ink-soft', 'sheet'],
  ['accent', 'paper'],
  ['accent', 'sheet'],
  ['pass', 'sheet'],
  ['fail', 'sheet'],
  ['warn', 'sheet'],
  ['info', 'sheet'],
  ['marker-ink', 'marker'],
  ['paper', 'ink'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme', (_, t) => {
  it.each(pairs)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

it('light body text is 14.7:1 and secondary text 7.0:1', () => {
  expect(ratio(light.ink, light.paper)).toBeGreaterThan(14.5);
  expect(ratio(light['ink-soft'], light.paper)).toBeGreaterThan(6.9);
});
