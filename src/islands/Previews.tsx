// Section 7.4: small live previews for the four featured lab rows. Static until touched.
import { useRef, useState } from 'preact/hooks';
import { runBench } from '../lib/promptBench';
import { testSets } from '../content/promptSets';
import { services } from '../lib/routing';
import { schedule, type Ops } from '../lib/pipelineSim';
import { State } from './shared/ui';

// ------------------------------------------------------------------ row 1: pipeline
const OPS: Ops = { add: 'management-hierarchy', update: 'approval-group', del: true };
const PAR = schedule(OPS, 'par');
const groups = [
  { label: 'Split', ids: ['split'] },
  { label: 'Add', ids: ['add.condition', 'add.semantic', 'add.classify', 'add.builder.management-hierarchy'] },
  { label: 'Update', ids: ['update.condition', 'update.semantic', 'update.classify', 'update.builder.approval-group'] },
  { label: 'Delete', ids: ['delete'] },
  { label: 'Merge', ids: [] as string[] },
];

export function PipelinePreview() {
  const [t, setT] = useState<number | null>(null);
  const raf = useRef(0);
  const play = () => {
    cancelAnimationFrame(raf.current);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setT(PAR.total);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const real = ((now - t0) / 1000) * 10;
      setT(Math.min(PAR.total, real));
      if (real < PAR.total) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const st = (id: string) => {
    if (t === null) return 'idle';
    const s = PAR.slots.find((x) => x.id === id);
    if (!s) return t >= PAR.total ? 'done' : 'idle';
    return t >= s.end ? 'done' : t >= s.start ? 'running' : 'idle';
  };
  const merged = t !== null && t >= PAR.total;
  return (
    <div class="pv pv-pipeline">
      <div class="pv-pipe" aria-hidden="true">
        {groups.map((g) => (
          <div class="pv-pipe-group">
            <span class="pv-pipe-label">{g.label}</span>
            <span class="pv-pipe-dots">
              {g.ids.length ? (
                g.ids.map((id) => <span class={`pv-dot pv-${st(id)}`} />)
              ) : (
                <span class={`pv-dot pv-code ${merged ? 'pv-done' : 'pv-idle'}`} />
              )}
            </span>
          </div>
        ))}
      </div>
      <div class="pv-foot">
        <button class="btn btn-small" type="button" onClick={play}>
          Play
        </button>
        <span class="small soft" aria-live="polite">
          {t === null ? '10 AI calls, run in parallel' : merged ? 'Done in about 20 s' : `About ${Math.round(t)} s`}
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ row 2: prompt bench
const set1 = testSets[0];
export function BenchPreview() {
  const [post, setPost] = useState(false);
  const r = runBench(
    set1.cases,
    {
      format: set1.format,
      matching: set1.matching,
      threshold: set1.threshold,
      post: post ? 'trimLower' : 'none',
      guards: set1.guards,
      iterations: 1,
    },
    'a',
  );
  return (
    <div class="pv pv-bench">
      <ul class="pv-marks" aria-label={`${r.passed} of ${r.total} passed`}>
        {r.rows.map((row) => (
          <li>
            <State kind={row.verdict === 'pass' ? 'pass' : 'fail'}>
              <span class="visually-hidden">{row.verdict === 'pass' ? 'Pass' : 'Fail'}</span>
            </State>
          </li>
        ))}
      </ul>
      <p class="pv-acc">
        <span class="pv-big num">{Math.round(r.accuracy * 100)}%</span>
        <span class="small soft">
          {r.passed} of {r.total} answers passed
        </span>
      </p>
      <button class="chip" type="button" aria-pressed={post} onClick={() => setPost(!post)}>
        Post-processing
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ row 3: tool squares
export function ToolsPreview() {
  const [hot, setHot] = useState<string | null>(null);
  const active = services.find((s) => s.slug === hot);
  return (
    <div class="pv pv-tools">
      <div class="pv-squares" aria-hidden="true">
        {services.map((s) =>
          Array.from({ length: s.count }, () => <span class={`pv-sq${hot === s.slug ? ' on' : ''}`} />),
        )}
      </div>
      <div class="pv-services">
        {services.map((s) => (
          <button
            type="button"
            class="pv-svc"
            aria-pressed={hot === s.slug}
            onMouseEnter={() => setHot(s.slug)}
            onMouseLeave={() => setHot(null)}
            onFocus={() => setHot(s.slug)}
            onBlur={() => setHot(null)}
            onClick={() => setHot(hot === s.slug ? null : s.slug)}
          >
            {s.name}
          </button>
        ))}
      </div>
      <p class="small soft" aria-live="polite">
        {active ? `${active.name}: ${active.count} of 191 tools` : '191 tools in 7 services'}
      </p>
    </div>
  );
}
