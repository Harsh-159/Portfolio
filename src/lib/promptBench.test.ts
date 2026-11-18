import { describe, it, expect } from 'vitest';
import { runBench, wordSimilarity, analyse, inWords, type Settings, type Post } from './promptBench';
import { testSets } from '../content/promptSets';

const [builder, jlh, explain] = testSets;

const settings = (set: (typeof testSets)[number], over: Partial<Settings> = {}): Settings => ({
  format: set.format,
  matching: set.matching,
  threshold: set.threshold,
  post: 'none',
  guards: set.guards,
  iterations: 1,
  ...over,
});

describe('test set 1: pick the list builder', () => {
  it.each<[Post, number]>([
    ['none', 4],
    ['trim', 5],
    ['lower', 5],
    ['trimLower', 6],
  ])('iteration 1 with %s passes %i of 8', (post, passed) => {
    expect(runBench(builder.cases, settings(builder, { post }), 'a').passed).toBe(passed);
  });
  it('three iterations: 13 of 24, consistency 5 of 8', () => {
    const r = runBench(builder.cases, settings(builder, { iterations: 3 }), 'a');
    expect(r.passed).toBe(13);
    expect(r.total).toBe(24);
    expect(r.consistency).toEqual({ same: 5, cases: 8 });
  });
  it('average latency 908.5 ms', () => {
    expect(runBench(builder.cases, settings(builder), 'a').avgLatency).toBe(908.5);
  });
  it('answer set B: 8 of 8 on one iteration, 23 of 24 on three', () => {
    expect(runBench(builder.cases, settings(builder), 'b').passed).toBe(8);
    expect(runBench(builder.cases, settings(builder, { iterations: 3 }), 'b').passed).toBe(23);
  });
  it('default in-words line', () => {
    const r = runBench(builder.cases, settings(builder), 'a');
    expect(inWords(r, 'string')).toBe(
      '4 of 8 answers passed. Two of the four failures differ only by capital letters or a trailing space.',
    );
  });
  it('analysis finds case, punctuation and wrong answers', () => {
    const f = analyse(runBench(builder.cases, settings(builder), 'a'), 'string');
    expect(f.map((x) => [x.kind, x.count])).toEqual([
      ['caseSpace', 2],
      ['punct', 1],
      ['wrong', 1],
    ]);
  });
});

describe('test set 2: Job Level Hierarchy node', () => {
  it('JSON format: 3 of 5', () => {
    expect(runBench(jlh.cases, settings(jlh), 'a').passed).toBe(3);
  });
  it('String format: 1 of 5', () => {
    expect(runBench(jlh.cases, settings(jlh, { format: 'string' }), 'a').passed).toBe(1);
  });
  it('Valid JSON guardrail: 3 of 5 and case 3 is Blocked', () => {
    const r = runBench(jlh.cases, settings(jlh, { guards: { ...jlh.guards, validJson: true } }), 'a');
    expect(r.passed).toBe(3);
    expect(r.rows[2].verdict).toBe('blocked');
  });
  it('average latency 1435 ms', () => {
    expect(runBench(jlh.cases, settings(jlh), 'a').avgLatency).toBe(1435);
  });
  it('answer set B: 5 of 5', () => {
    expect(runBench(jlh.cases, settings(jlh), 'b').passed).toBe(5);
  });
  it('analysis finds wrapped JSON and a number written as text', () => {
    const kinds = analyse(runBench(jlh.cases, settings(jlh), 'a'), 'json').map((x) => x.kind);
    expect(kinds).toEqual(['wrapped', 'type']);
  });
});

describe('test set 3: explain a rule', () => {
  it('similarities match the stated values', () => {
    const sims = explain.cases.map((c) => Number(wordSimilarity(c.expected, c.answersA[0]).toFixed(3)));
    expect(sims).toEqual([0.983, 0.614, 0.866, 0.616, 0.093]);
    expect(Number(wordSimilarity(explain.cases[4].expected, explain.cases[4].answersB[0]).toFixed(3))).toBe(0.934);
  });
  it('answer lengths match', () => {
    expect(explain.cases.map((c) => c.answersA[0].length)).toEqual([97, 69, 60, 185, 38]);
  });
  it('semantic 0.80 with guardrail: 2 of 5 and case 4 Blocked', () => {
    const r = runBench(explain.cases, settings(explain), 'a');
    expect(r.passed).toBe(2);
    expect(r.rows[3].verdict).toBe('blocked');
  });
  it('semantic 0.60 with guardrail: 3 of 5', () => {
    expect(runBench(explain.cases, settings(explain, { threshold: 0.6 }), 'a').passed).toBe(3);
  });
  it('semantic 0.60 without guardrail: 4 of 5', () => {
    expect(
      runBench(explain.cases, settings(explain, { threshold: 0.6, guards: { ...explain.guards, maxChars: null } }), 'a')
        .passed,
    ).toBe(4);
  });
  it('exact: 0 of 5', () => {
    expect(runBench(explain.cases, settings(explain, { matching: 'exact' }), 'a').passed).toBe(0);
  });
  it('average latency 1136.8 ms', () => {
    expect(runBench(explain.cases, settings(explain), 'a').avgLatency).toBeCloseTo(1136.8, 6);
  });
  it('answer set B: 5 of 5 at 0.80', () => {
    expect(runBench(explain.cases, settings(explain), 'b').passed).toBe(5);
  });
});
