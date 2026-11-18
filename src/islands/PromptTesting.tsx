// Section 10: Figure 1 (the test bench) and Figure 2 (the improvement loop), which drives Figure 1.
import { useMemo, useState } from 'preact/hooks';
import { testSets, type TestSet } from '../content/promptSets';
import {
  runBench,
  analyse,
  inWords,
  charDiff,
  keyDiff,
  resultsHtml,
  postLabels,
  type Format,
  type Matching,
  type Post,
  type Guards,
} from '../lib/promptBench';
import { Frame, Seg, Slider, State, Icon, useUrlState, codecs, fmtN } from './shared/ui';

const SET_IDS = ['builder', 'jlh', 'explain'] as const;
const GUARD_IDS = ['json', 'empty', 'chars'] as const;
type GuardId = (typeof GUARD_IDS)[number];

const guardsOf = (s: TestSet): GuardId[] => [
  ...(s.guards.validJson ? (['json'] as const) : []),
  ...(s.guards.noEmpty ? (['empty'] as const) : []),
  ...(s.guards.maxChars !== null ? (['chars'] as const) : []),
];

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function Gauge({ value }: { value: number }) {
  const r = 34;
  const c = Math.PI * r;
  return (
    <svg width="90" height="54" viewBox="0 0 90 54" aria-hidden="true">
      <path d="M11 47 A34 34 0 0 1 79 47" fill="none" stroke="var(--rule)" stroke-width="9" />
      <path
        d="M11 47 A34 34 0 0 1 79 47"
        fill="none"
        stroke="var(--accent)"
        stroke-width="9"
        stroke-dasharray={`${c * value} ${c}`}
        style={{ transition: 'stroke-dasharray 200ms ease-out' }}
      />
    </svg>
  );
}

export default function PromptTesting() {
  const [setId, setSetId] = useUrlState<(typeof SET_IDS)[number]>('set', 'builder', codecs.str(SET_IDS));
  const set = testSets.find((s) => s.id === setId)!;
  const [format, setFormat] = useUrlState<Format>('format', set.format, codecs.str(['string', 'array', 'json'] as const));
  const [matching, setMatching] = useUrlState<Matching>('match', set.matching, codecs.str(['exact', 'semantic'] as const));
  const [threshold, setThreshold] = useUrlState('threshold', set.threshold, codecs.num(0.5, 0.95));
  const [post, setPost] = useUrlState<Post>('post', 'none', codecs.str(['none', 'trim', 'lower', 'trimLower'] as const));
  const [guardIds, setGuardIds] = useUrlState<GuardId[]>('guards', guardsOf(set), codecs.list(GUARD_IDS));
  const [iterations, setIterations] = useUrlState<1 | 2 | 3>('iter', 1, codecs.int(1, 3) as never);
  const [answers, setAnswers] = useUrlState<'a' | 'b'>('answers', 'a', codecs.str(['a', 'b'] as const));
  const [maxChars, setMaxChars] = useState(160);
  const [csv, setCsv] = useState(false);
  const [experimental, setExperimental] = useState(false);
  const [ran, setRan] = useState(false);
  const [selRow, setSelRow] = useState<number | null>(null);
  const [loopStep, setLoopStep] = useState<number | null>(null);
  const [before, setBefore] = useState<{ passed: number; total: number } | null>(null);

  const changeSet = (id: (typeof SET_IDS)[number]) => {
    const s = testSets.find((x) => x.id === id)!;
    setSetId(id);
    setFormat(s.format);
    setMatching(s.matching);
    setThreshold(s.threshold);
    setGuardIds(guardsOf(s));
    setPost('none');
    setAnswers('a');
    setMaxChars(s.guards.maxChars ?? 160);
    setSelRow(null);
    setRan(false);
    setLoopStep(null);
    setBefore(null);
  };

  const guards: Guards = {
    validJson: guardIds.includes('json'),
    noEmpty: guardIds.includes('empty'),
    maxChars: guardIds.includes('chars') ? maxChars : null,
  };
  const effMatching: Matching = format === 'string' ? matching : 'exact';
  const settings = { format, matching: effMatching, threshold, post, guards, iterations };
  const result = useMemo(() => runBench(set.cases, settings, answers), [set, format, effMatching, threshold, post, guardIds, maxChars, iterations, answers]);
  const findings = useMemo(() => analyse(result, format), [result, format]);

  const toggleGuard = (g: GuardId) => setGuardIds(guardIds.includes(g) ? guardIds.filter((x) => x !== g) : [...guardIds, g]);

  const reset = () => changeSet('builder');

  const download = () => {
    const blob = new Blob([resultsHtml(result, `Prompt test results: ${set.name}`)], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `prompt-test-results-${set.id}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ------------------------------------------------------------- loop (Figure 2)
  const loopSteps = ['Run the tests', 'Analyse the failures', 'Suggest a prompt', 'Run again'];
  const nextLoop = () => {
    const n = loopStep === null ? 0 : (loopStep + 1) % 4;
    setLoopStep(n);
    if (n === 0) {
      setAnswers('a');
      setRan(true);
      setExperimental(false);
      setBefore(null);
    } else if (n === 1) {
      setRan(true);
      setExperimental(true);
      setBefore({ passed: result.passed, total: result.total });
    } else if (n === 2) {
      setExperimental(true);
    } else {
      if (!before) setBefore({ passed: result.passed, total: result.total });
      setAnswers('b');
      setRan(true);
    }
  };

  const sel = selRow !== null ? result.rows[selRow] : null;
  const benchWords = ran ? inWords(result, format) : `Not run yet. Press Run tests to score ${set.cases.length * iterations} answers.`;

  const csvText = useMemo(() => {
    const head = [set.variable, 'expected_output'].join(',');
    return [head, ...set.cases.map((c) => [csvCell(c.inputs[set.variable]), csvCell(c.expected)].join(','))].join('\n');
  }, [set]);

  const latMax = Math.max(...result.rows.map((r) => r.latency)) * 1.1;

  const suggestion = (
    <p class="small">
      {set.prompt} <ins class="added">{set.suggestion}</ins>
    </p>
  );

  return (
    <>
      <Frame
        id="bench"
        num={1}
        title="The test bench"
        badge="reconstruction"
        wide
        onReset={reset}
        words={benchWords}
        what="A rebuild of the test workflow. Each fixed answer is post-processed, checked against the guardrails and compared with the expected answer, exactly as the original scored it."
        tryThis={[
          'Run the tests, then change Post-processing to .trim().toLowerCase().',
          'Switch to the Job Level Hierarchy set and turn on the Valid JSON guardrail.',
          'Turn on experimental features and apply the suggested prompt.',
        ]}
      >
        <div class="pb">
          <div class="pb-setup">
            <div class="field">
              <label for="pb-set">Test set</label>
              <select id="pb-set" value={setId} onChange={(e) => changeSet((e.target as HTMLSelectElement).value as never)}>
                {testSets.map((s) => (
                  <option value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div class="field">
              <label for="pb-prompt">Prompt</label>
              <textarea id="pb-prompt" readOnly rows={4} value={set.prompt} />
              <span class="small soft">The prompt is fixed here because the answers are fixed.</span>
            </div>
            <div class="field">
              <span class="label">Test cases</span>
              <label class="check small">
                <input type="checkbox" checked={csv} onChange={() => setCsv(!csv)} />
                View as CSV
              </label>
              {csv ? (
                <>
                  <pre class="json" tabIndex={0} aria-label="Test cases as CSV">
                    {csvText}
                  </pre>
                  <span class="small soft">
                    Header names match the prompt's variables, expected_output is the last column, and a JSON value is
                    wrapped in quotes so its commas do not break the file.
                  </span>
                </>
              ) : (
                <div class="table-wrap">
                  <table class="pb-grid">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">{set.variable}</th>
                        <th scope="col">expected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {set.cases.map((c, i) => (
                        <tr>
                          <td>{i + 1}</td>
                          <td>{c.inputs[set.variable]}</td>
                          <td class="mono" style={{ fontSize: '0.8125rem', wordBreak: 'break-word' }}>
                            {c.expected}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <Seg
              label="Output format"
              value={format}
              options={[
                { value: 'string', label: 'String' },
                { value: 'array', label: 'Array' },
                { value: 'json', label: 'JSON' },
              ]}
              onChange={setFormat}
            />
            <Seg
              label="Matching"
              value={effMatching}
              options={[
                { value: 'exact', label: 'Exact' },
                { value: 'semantic', label: 'Semantic' },
              ]}
              onChange={(v) => format === 'string' && setMatching(v)}
            />
            {format !== 'string' && <p class="small soft">Semantic matching is offered for the String format only.</p>}
            {effMatching === 'semantic' && (
              <Slider label="Similarity threshold" value={threshold} min={0.5} max={0.95} step={0.05} onChange={setThreshold} format={(v) => v.toFixed(2)} />
            )}
            <div class="field">
              <label for="pb-post">Post-processing</label>
              <select id="pb-post" value={post} onChange={(e) => setPost((e.target as HTMLSelectElement).value as Post)}>
                {(Object.keys(postLabels) as Post[]).map((p) => (
                  <option value={p}>{postLabels[p]}</option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend>Guardrails</legend>
              <label class="check">
                <input type="checkbox" checked={guardIds.includes('json')} onChange={() => toggleGuard('json')} />
                Valid JSON
              </label>
              <br />
              <label class="check">
                <input type="checkbox" checked={guardIds.includes('empty')} onChange={() => toggleGuard('empty')} />
                No empty answer
              </label>
              <br />
              <span class="check">
                <input type="checkbox" id="pb-chars" checked={guardIds.includes('chars')} onChange={() => toggleGuard('chars')} />
                <label for="pb-chars" class="mono">
                  character_count &lt;=
                </label>
                <label class="visually-hidden" for="pb-chars-n">
                  Maximum characters
                </label>
                <input
                  id="pb-chars-n"
                  type="number"
                  min={1}
                  max={1000}
                  value={maxChars}
                  style={{ width: '7rem' }}
                  onInput={(e) => setMaxChars(Math.max(1, Number((e.target as HTMLInputElement).value) || 1))}
                />
              </span>
            </fieldset>
            <Seg
              label="Iterations"
              value={String(iterations) as '1' | '2' | '3'}
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
              ]}
              onChange={(v) => setIterations(Number(v) as 1 | 2 | 3)}
            />
            <label class="check">
              <input type="checkbox" role="switch" checked={experimental} onChange={() => setExperimental(!experimental)} />
              Experimental features
            </label>
            <details class="pb-conn">
              <summary class="linklike">Connection settings</summary>
              <p class="small soft">Not needed here. The answers on this page are fixed.</p>
              <div class="ctl-grid two">
                <div class="field">
                  <label for="c-api">API type</label>
                  <select id="c-api" disabled>
                    <option>Completions</option>
                    <option>Prompt Lab</option>
                  </select>
                </div>
                <div class="field">
                  <label for="c-model">Model name</label>
                  <input id="c-model" type="text" disabled value="" />
                </div>
                <div class="field">
                  <label for="c-end">Endpoint</label>
                  <input id="c-end" type="text" disabled value="" />
                </div>
                <div class="field">
                  <label for="c-tok">Access token</label>
                  <input id="c-tok" type="text" disabled value="" />
                </div>
                {['Temperature', 'Max tokens', 'Top-p', 'Top-k', 'Frequency penalty', 'Presence penalty', 'Language'].map((l) => (
                  <div class="field">
                    <label for={`c-${l}`}>{l}</label>
                    <input id={`c-${l}`} type="text" disabled value="" />
                  </div>
                ))}
                <label class="check">
                  <input type="checkbox" disabled /> Persist data
                </label>
              </div>
            </details>
            <div class="btn-row" style={{ marginTop: '16px' }}>
              <button
                class="btn btn-primary"
                type="button"
                onClick={() => {
                  setRan(true);
                  setSelRow(null);
                }}
              >
                Run tests
              </button>
            </div>
          </div>

          <div class="pb-results" aria-live="polite">
            {!ran ? (
              <p class="soft">Results appear here after a run.</p>
            ) : (
              <>
                <div class="pb-gauge">
                  <Gauge value={result.accuracy} />
                  <div>
                    <div class="pb-big num">{Math.round(result.accuracy * 100)}%</div>
                    <div>
                      {result.passed} of {result.total} runs passed
                    </div>
                    {result.consistency && (
                      <div class="small soft">
                        Consistency: {result.consistency.same} of {result.consistency.cases} cases gave the same verdict in every iteration
                      </div>
                    )}
                  </div>
                </div>
                <p class="small">
                  <strong>Latency</strong>, one bar per call. Average {fmtN(result.avgLatency, 1)} ms.
                </p>
                <svg class="svg-chart" viewBox="0 0 400 110" role="img" aria-label={`Latency per call. Average ${fmtN(result.avgLatency, 1)} milliseconds.`}>
                  {result.rows.map((r, i) => {
                    const w = 380 / result.rows.length;
                    const h = (r.latency / latMax) * 90;
                    return <rect x={10 + i * w + 1} y={95 - h} width={Math.max(1, w - 2)} height={h} fill="var(--series-1)" opacity={0.75} />;
                  })}
                  <line x1="10" x2="390" y1={95 - (result.avgLatency / latMax) * 90} y2={95 - (result.avgLatency / latMax) * 90} stroke="var(--series-2)" stroke-width="2" stroke-dasharray="6 4" />
                  <line class="axis" x1="10" x2="390" y1="95" y2="95" />
                  <text x="390" y={90 - (result.avgLatency / latMax) * 90} text-anchor="end">
                    average {fmtN(result.avgLatency, 1)} ms
                  </text>
                </svg>
                <div class="table-wrap">
                  <table class="pb-table">
                    <thead>
                      <tr>
                        <th scope="col">Case</th>
                        <th scope="col">Iter.</th>
                        <th scope="col">Expected</th>
                        <th scope="col">Answer</th>
                        <th scope="col">Verdict</th>
                        {effMatching === 'semantic' && <th scope="col" class="r">Similarity</th>}
                        <th scope="col" class="r">ms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((r, i) => (
                        <tr class={selRow === i ? 'sel' : ''} onClick={() => setSelRow(i)}>
                          <td>
                            <button class="linklike" type="button" onClick={() => setSelRow(i)} aria-label={`Compare case ${r.caseIndex + 1}, iteration ${r.iteration + 1}`} style={{ minHeight: 0 }}>
                              {r.caseIndex + 1}
                            </button>
                          </td>
                          <td>{r.iteration + 1}</td>
                          <td class="ans">{r.expected}</td>
                          <td class="ans">{r.answer.endsWith(' ') ? `${r.answer.slice(0, -1)}␠` : r.answer}</td>
                          <td>
                            <State kind={r.verdict} />
                          </td>
                          {effMatching === 'semantic' && <td class="r">{r.similarity?.toFixed(3)}</td>}
                          <td class="r">{r.latency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sel && (
                  <div class="pb-panel">
                    <h4>
                      Case {sel.caseIndex + 1}, iteration {sel.iteration + 1}
                    </h4>
                    {sel.failedGuards.length > 0 && <p class="small">Blocked by: {sel.failedGuards.join(', ')}.</p>}
                    {format === 'json' && keyDiff(sel.expected, sel.answer) ? (
                      <table class="small">
                        <thead>
                          <tr>
                            <th scope="col">Key</th>
                            <th scope="col">Expected</th>
                            <th scope="col">Answer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keyDiff(sel.expected, sel.answer)!.map((k) => (
                            <tr>
                              <td class="mono">{k.key}</td>
                              <td class="mono">{k.expected}</td>
                              <td class={`mono${k.same ? '' : ' diff-x'}`}>
                                {k.answer}
                                {!k.same && <span class="visually-hidden"> (differs)</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div class="pb-diff">
                        {charDiff(sel.expected, sel.answer).map((side, si) => (
                          <div>
                            <p class="small">
                              <strong>{si === 0 ? 'Expected' : 'Answer'}</strong>
                            </p>
                            <pre class="json">
                              {side.map((ch) => (ch.same ? ch.text : <mark class="diff-x">{ch.text}</mark>))}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div class="btn-row" style={{ marginTop: '12px' }}>
                  <button class="btn" type="button" onClick={download}>
                    Download results (HTML)
                  </button>
                </div>
                {experimental && (
                  <>
                    <div class="pb-panel">
                      <h4>AI analysis</h4>
                      <p class="small soft">In the original, a language model wrote this analysis. Here a rule-based checker stands in for it.</p>
                      {findings.length ? (
                        <ul class="small">
                          {findings.map((f) => (
                            <li>{f.text}</li>
                          ))}
                        </ul>
                      ) : (
                        <p class="small">No failures to analyse.</p>
                      )}
                    </div>
                    <div class="pb-panel">
                      <h4>AI-suggested prompt</h4>
                      {suggestion}
                      <button class="btn" type="button" onClick={() => setAnswers('b')} disabled={answers === 'b'}>
                        Apply suggestion and run again
                      </button>
                      {answers === 'b' && <p class="small soft">Applied. The results above use the answers to the suggested prompt.</p>}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </Frame>

      <Frame
        id="loop"
        num={2}
        title="The improvement loop"
        badge="reconstruction"
        onReset={() => {
          setLoopStep(null);
          setAnswers('a');
          setExperimental(false);
          setBefore(null);
        }}
        words={
          loopStep === null
            ? 'Press Next step to walk round the loop. It drives Figure 1.'
            : loopStep < 3
              ? `${loopSteps[loopStep]}. Accuracy now: ${result.passed} of ${result.total}.`
              : `Run again with the suggested prompt. Accuracy before: ${before?.passed ?? '?'} of ${before?.total ?? '?'}. After: ${result.passed} of ${result.total}.`
        }
        what="The original also had an optimiser that repeated this loop on its own, using test accuracy as its score. It was slow, but it could give great results."
        tryThis={['Press Next step four times and compare accuracy before and after.']}
      >
        <ol class="loop-ring" aria-label="The four steps of the loop">
          {loopSteps.map((s, i) => (
            <li class={loopStep === i ? 'on' : ''} aria-current={loopStep === i ? 'step' : undefined}>
              <span class="small soft">Step {i + 1}</span>
              <strong>{s}</strong>
            </li>
          ))}
        </ol>
        <div class="btn-row">
          <button class="btn btn-primary" type="button" onClick={nextLoop}>
            <Icon name="step" size={16} /> Next step
          </button>
          <a href="#bench">See Figure 1</a>
        </div>
      </Frame>
    </>
  );
}
