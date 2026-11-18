// Section 7.2: Figure 1, a compact pipeline trace. Server-renders its final state,
// plays once on load for six seconds at most, then rests with a Replay button.
import { useEffect, useRef, useState } from 'preact/hooks';
import { schedule, sequentialSeconds, callCount, type Ops } from '../lib/pipelineSim';
import { builderName } from '../content/pipeline';
import { badges } from '../content/labs';
import { iconPaths } from '../components/icons';

const OPS: Ops = { add: 'management-hierarchy', update: 'approval-group', del: true };
const SEQ = sequentialSeconds(callCount(OPS)); // 50
const PAR = schedule(OPS, 'par');
/** Real seconds per animation second, so the 50 s bar fills in six seconds. */
const SPEED = SEQ / 6;

const lanes = [
  { key: 'add', label: 'Add', ids: ['add.condition', 'add.semantic', 'add.classify', 'add.builder.management-hierarchy'] },
  {
    key: 'update',
    label: 'Update',
    ids: ['update.condition', 'update.semantic', 'update.classify', 'update.builder.approval-group'],
  },
  { key: 'delete', label: 'Delete', ids: ['delete'] },
];

const label = (id: string) => {
  if (id === 'split') return 'Split';
  if (id === 'delete') return 'Delete';
  if (id.endsWith('.condition')) return 'Condition';
  if (id.endsWith('.semantic')) return 'Semantic match';
  if (id.endsWith('.classify')) return 'Classify';
  if (id.includes('.builder.')) return builderName(id.split('.builder.')[1] as never);
  return id;
};

function Ico({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconPaths[name] }} />
  );
}

export default function HeroTrace() {
  // Real seconds elapsed in the trace. SSR shows the final state.
  const [t, setT] = useState(SEQ);
  const raf = useRef<number>(0);

  const play = () => {
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const tick = (now: number) => {
      const real = ((now - t0) / 1000) * SPEED;
      setT(Math.min(SEQ, real));
      if (real < SEQ) raf.current = requestAnimationFrame(tick);
    };
    setT(0);
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) play();
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const state = (id: string): 'waiting' | 'running' | 'done' => {
    if (id === 'merge') return t >= PAR.total ? 'done' : 'waiting';
    const s = PAR.slots.find((x) => x.id === id)!;
    if (t >= s.end) return 'done';
    if (t >= s.start) return 'running';
    return 'waiting';
  };

  const node = (id: string) => {
    const st = state(id);
    return (
      <li class={`ht-node ht-${st}`} key={id}>
        <span class="ht-label">{label(id)}</span>
        <span class="ht-state">
          <Ico name={st === 'done' ? 'done' : st === 'running' ? 'running' : 'wait'} />
          <span>{st === 'done' ? 'done' : st === 'running' ? 'running' : 'waiting'}</span>
        </span>
      </li>
    );
  };

  const parShown = Math.min(t, PAR.total);
  const b = badges.reconstruction;

  return (
    <figure class="fig hero-fig" id="hero-figure" aria-labelledby="hero-fig-title">
      <div class="fig-frame">
        <div class="fig-head">
          <h2 class="fig-title" id="hero-fig-title">
            <span class="fig-num">Figure 1</span>One request, ten AI calls
          </h2>
          <span class="badge" tabIndex={0} title={b.explanation} aria-label={`${b.label}: ${b.explanation}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconPaths.reconstruction }} />
            <span aria-hidden="true">{b.label}</span>
          </span>
        </div>
        <div class="fig-stage">
          <p class="ht-request">
            <span class="soft">Request: </span>"Add a rule for the Sales department, update the travel rule and delete the old one."
          </p>
          <div class="ht-graph" aria-hidden="true">
            <ul class="ht-col ht-split">{node('split')}</ul>
            <div class="ht-lanes">
              {lanes.map((l) => (
                <div class={`ht-lane ht-lane-${l.key}`} key={l.key}>
                  <span class="ht-lane-label">{l.label}</span>
                  <ul>{l.ids.map(node)}</ul>
                </div>
              ))}
            </div>
            <ul class="ht-col ht-merge">
              <li class={`ht-node ht-code ht-${state('merge')}`}>
                <span class="ht-label">Merge</span>
                <span class="ht-state">
                  <Ico name={state('merge') === 'done' ? 'done' : 'wait'} />
                  <span>{state('merge') === 'done' ? 'done' : 'waiting'}</span>
                </span>
              </li>
            </ul>
          </div>
          <div class="ht-bars">
            <div class="ht-bar">
              <span class="ht-bar-label">One after another: about {SEQ} s</span>
              <span class="ht-track">
                <span class="ht-fill ht-fill-seq" style={{ width: `${(t / SEQ) * 100}%` }} />
              </span>
            </div>
            <div class="ht-bar">
              <span class="ht-bar-label">In parallel: about {PAR.total} s</span>
              <span class="ht-track">
                <span class="ht-fill ht-fill-par" style={{ width: `${(parShown / SEQ) * 100}%` }} />
              </span>
            </div>
          </div>
        </div>
        <div class="fig-words">
          <p>
            <strong>In words: </strong>This request needs 10 AI calls. One after another they take about 50 seconds. In parallel they take about 20.
          </p>
        </div>
      </div>
      <div class="fig-actions hero-actions">
        <button class="btn btn-small" type="button" onClick={play}>
          Replay
        </button>
        <a href="/lab/pipeline">Open the full demo</a>
      </div>
    </figure>
  );
}
