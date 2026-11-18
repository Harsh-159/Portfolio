// Section 10.4: scoring rules for the prompt test bench, as pure functions.
// The test sets themselves live in src/content/promptSets.ts.

export type Format = 'string' | 'array' | 'json';
export type Matching = 'exact' | 'semantic';
export type Post = 'none' | 'trim' | 'lower' | 'trimLower';
export type Verdict = 'pass' | 'fail' | 'blocked';

export interface Guards {
  validJson: boolean;
  noEmpty: boolean;
  maxChars: number | null;
}

export const NO_GUARDS: Guards = { validJson: false, noEmpty: false, maxChars: null };

export const postLabels: Record<Post, string> = {
  none: 'None',
  trim: '.trim()',
  lower: '.toLowerCase()',
  trimLower: '.trim().toLowerCase()',
};

export function applyPost(answer: string, post: Post): string {
  switch (post) {
    case 'trim':
      return answer.trim();
    case 'lower':
      return answer.toLowerCase();
    case 'trimLower':
      return answer.trim().toLowerCase();
    default:
      return answer;
  }
}

/** Lower-case, take every run of letters or digits as a word, cosine of the count vectors. */
export function wordSimilarity(a: string, b: string): number {
  const count = (s: string) => {
    const m = new Map<string, number>();
    for (const w of s.toLowerCase().match(/[a-z0-9]+/g) ?? []) m.set(w, (m.get(w) ?? 0) + 1);
    return m;
  };
  const ca = count(a);
  const cb = count(b);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [w, v] of ca) {
    na += v * v;
    dot += v * (cb.get(w) ?? 0);
  }
  for (const v of cb.values()) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

function tryParse(s: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return { ok: false };
  }
}

/** Deep equality where key order does not matter and value types do. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === 'object') {
    if (Array.isArray(b)) return false;
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.hasOwn(b as object, k) && deepEqual((a as never)[k], (b as never)[k]));
  }
  return false;
}

export interface GuardResult {
  ok: boolean;
  failed: string[];
}

export function checkGuards(answer: string, g: Guards): GuardResult {
  const failed: string[] = [];
  if (g.validJson && !tryParse(answer).ok) failed.push('Valid JSON');
  if (g.noEmpty && answer.trim() === '') failed.push('No empty answer');
  if (g.maxChars !== null && answer.length > g.maxChars) failed.push(`character_count <= ${g.maxChars}`);
  return { ok: failed.length === 0, failed };
}

export interface CompareResult {
  pass: boolean;
  similarity?: number;
}

export function compare(
  expected: string,
  answer: string,
  format: Format,
  matching: Matching,
  threshold: number,
): CompareResult {
  if (format === 'string') {
    if (matching === 'semantic') {
      const similarity = wordSimilarity(expected, answer);
      return { pass: similarity >= threshold - 1e-9, similarity };
    }
    return { pass: expected === answer };
  }
  const e = tryParse(expected);
  const a = tryParse(answer);
  if (!e.ok || !a.ok) return { pass: false };
  if (format === 'array') {
    if (!Array.isArray(e.value) || !Array.isArray(a.value)) return { pass: false };
    return { pass: deepEqual(e.value, a.value) };
  }
  return { pass: deepEqual(e.value, a.value) };
}

export interface Settings {
  format: Format;
  matching: Matching;
  threshold: number;
  post: Post;
  guards: Guards;
  iterations: 1 | 2 | 3;
}

export interface RunRow {
  caseIndex: number;
  iteration: number;
  expected: string;
  raw: string;
  answer: string;
  verdict: Verdict;
  similarity?: number;
  latency: number;
  failedGuards: string[];
}

export interface Case {
  inputs: Record<string, string>;
  expected: string;
  /** Fixed answers per iteration, set A and set B. */
  answersA: [string, string, string];
  answersB: [string, string, string];
  latency: number;
}

export function scoreRun(c: Case, i: number, iteration: number, set: 'a' | 'b', s: Settings): RunRow {
  const raw = (set === 'a' ? c.answersA : c.answersB)[iteration];
  const answer = applyPost(raw, s.post);
  const g = checkGuards(answer, s.guards);
  const base = { caseIndex: i, iteration, expected: c.expected, raw, answer, latency: c.latency, failedGuards: g.failed };
  if (!g.ok) return { ...base, verdict: 'blocked' };
  const r = compare(c.expected, answer, s.format, s.matching, s.threshold);
  return { ...base, verdict: r.pass ? 'pass' : 'fail', similarity: r.similarity };
}

export interface BenchResult {
  rows: RunRow[];
  passed: number;
  total: number;
  accuracy: number;
  consistency: { same: number; cases: number } | null;
  avgLatency: number;
}

export function runBench(cases: Case[], s: Settings, set: 'a' | 'b'): BenchResult {
  const rows: RunRow[] = [];
  for (let it = 0; it < s.iterations; it++) cases.forEach((c, i) => rows.push(scoreRun(c, i, it, set, s)));
  const passed = rows.filter((r) => r.verdict === 'pass').length;
  let consistency: BenchResult['consistency'] = null;
  if (s.iterations > 1) {
    let same = 0;
    cases.forEach((_, i) => {
      const v = rows.filter((r) => r.caseIndex === i).map((r) => r.verdict === 'pass');
      if (v.every((x) => x === v[0])) same++;
    });
    consistency = { same, cases: cases.length };
  }
  const avgLatency = rows.reduce((t, r) => t + r.latency, 0) / rows.length;
  return { rows, passed, total: rows.length, accuracy: passed / rows.length, consistency, avgLatency };
}

// --------------------------------------------------------------- analysis stand-in (10.8)

const stripEndPunct = (s: string) => s.trim().toLowerCase().replace(/[.!?,;:]+$/, '');

export type FindingKind = 'blocked' | 'caseSpace' | 'punct' | 'wrapped' | 'type' | 'inconsistent' | 'wrong';

export interface Finding {
  kind: FindingKind;
  count: number;
  text: string;
}

function typeOnlyDiff(e: unknown, a: unknown): boolean {
  if (typeof e !== 'object' || typeof a !== 'object' || !e || !a || Array.isArray(e) || Array.isArray(a)) return false;
  const ke = Object.keys(e);
  if (ke.length !== Object.keys(a).length) return false;
  let diff = false;
  for (const k of ke) {
    const x = (e as never)[k];
    const y = (a as never)[k];
    if (deepEqual(x, y)) continue;
    if (String(x) === String(y) && typeof x !== typeof y) diff = true;
    else return false;
  }
  return diff;
}

export function classifyFailure(row: RunRow, format: Format): FindingKind {
  if (row.verdict === 'blocked') return 'blocked';
  const e = row.expected;
  const a = row.answer;
  if (e.trim().toLowerCase() === a.trim().toLowerCase()) return 'caseSpace';
  if (stripEndPunct(e) === stripEndPunct(a)) return 'punct';
  if (format === 'json') {
    const pa = tryParse(a);
    if (!pa.ok && /\{[\s\S]*\}/.test(a)) {
      const inner = tryParse(a.slice(a.indexOf('{'), a.lastIndexOf('}') + 1));
      if (inner.ok) return 'wrapped';
    }
    const pe = tryParse(e);
    if (pa.ok && pe.ok && typeOnlyDiff(pe.value, pa.value)) return 'type';
  }
  return 'wrong';
}

const n = (k: number) => String(k);

export function analyse(result: BenchResult, format: Format): Finding[] {
  const failures = result.rows.filter((r) => r.verdict !== 'pass');
  const counts = new Map<FindingKind, number>();
  const guardNames = new Set<string>();
  for (const r of failures) {
    const k = classifyFailure(r, format);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (k === 'blocked') r.failedGuards.forEach((g) => guardNames.add(g));
  }
  const out: Finding[] = [];
  const push = (kind: FindingKind, text: (c: number) => string) => {
    const c = counts.get(kind) ?? 0;
    if (c > 0) out.push({ kind, count: c, text: text(c) });
  };
  push('blocked', (c) => `${n(c)} answers were blocked by the guardrail: ${[...guardNames].join(', ')}.`);
  push('caseSpace', (c) => `${n(c)} failures differ only by capital letters or spaces. A post-processing step would fix them.`);
  push('punct', (c) => `${n(c)} failures have extra punctuation. Tell the model to reply with the name only.`);
  push('wrapped', (c) => `${n(c)} answers wrap the JSON in extra words. Ask for JSON only, or turn on the Valid JSON guardrail.`);
  push('type', (c) => `${n(c)} answers write a number as text.`);
  if (result.consistency && result.consistency.same < result.consistency.cases) {
    const c = result.consistency.cases - result.consistency.same;
    out.push({ kind: 'inconsistent', count: c, text: `${n(c)} cases gave different answers on different runs.` });
  }
  push('wrong', (c) => `${n(c)} answers are wrong, not just formatted differently.`);
  return out;
}

const words = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

export function inWords(result: BenchResult, format: Format): string {
  const failures = result.total - result.passed;
  let s = `${result.passed} of ${result.total} answers passed.`;
  if (failures > 0) {
    const cs = result.rows.filter((r) => r.verdict !== 'pass' && classifyFailure(r, format) === 'caseSpace').length;
    if (cs > 0) {
      const w = words[cs] ?? String(cs);
      s += ` ${w} of the ${words[failures]?.toLowerCase() ?? failures} failures ${cs === 1 ? 'differs' : 'differ'} only by capital letters or a trailing space.`;
    }
  }
  return s;
}

/** Character-level diff for strings: marks positions that differ. */
export function charDiff(a: string, b: string): { text: string; same: boolean }[][] {
  const mk = (s: string, o: string) =>
    [...s].map((ch, i) => ({ text: ch === ' ' && i === s.length - 1 ? '␠' : ch, same: o[i] === ch }));
  return [mk(a, b), mk(b, a)];
}

/** Key-level diff for JSON objects. */
export function keyDiff(expected: string, answer: string): { key: string; expected: string; answer: string; same: boolean }[] | null {
  const e = tryParse(expected);
  const a = tryParse(answer);
  if (!e.ok || !a.ok || typeof e.value !== 'object' || typeof a.value !== 'object' || !e.value || !a.value) return null;
  const keys = [...new Set([...Object.keys(e.value), ...Object.keys(a.value)])];
  return keys.map((k) => {
    const x = (e.value as never)[k];
    const y = (a.value as never)[k];
    return { key: k, expected: JSON.stringify(x) ?? 'missing', answer: JSON.stringify(y) ?? 'missing', same: deepEqual(x, y) };
  });
}

export function resultsHtml(result: BenchResult, title: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rows = result.rows
    .map(
      (r) =>
        `<tr><td>${r.caseIndex + 1}</td><td>${r.iteration + 1}</td><td>${esc(r.expected)}</td><td>${esc(r.answer)}</td><td>${r.verdict}</td><td>${r.similarity?.toFixed(3) ?? ''}</td><td>${r.latency}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body><h1>${esc(title)}</h1><p>${result.passed} of ${result.total} runs passed. Average latency ${result.avgLatency.toFixed(1)} ms.</p><table border="1" cellpadding="6"><thead><tr><th>Case</th><th>Iteration</th><th>Expected</th><th>Answer</th><th>Verdict</th><th>Similarity</th><th>Latency ms</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}
