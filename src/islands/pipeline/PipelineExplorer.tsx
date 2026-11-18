// Section 9.4: Figure 2, the pipeline explorer. Everything is computed from src/content/pipeline.ts.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  builders,
  builderName,
  builderSlugs,
  nodes,
  edges,
  presets,
  inspectorOut,
  PROMPT_TOTAL_LINE,
  type BuilderSlug,
} from '../../content/pipeline';
import {
  activeNodes,
  callCount,
  schedule,
  startOrder,
  sequentialSeconds,
  parallelSeconds,
  progressLine,
  type Mode,
  type Ops,
} from '../../lib/pipelineSim';
import { Frame, Icon, Seg, useUrlState, codecs, useReducedMotion } from '../shared/ui';
import { confirmed } from '../../content/site';

/** Feature flag (section 9.8). Off until the real failure handling is confirmed. */
const showFailureInjection = false;

type NodeState = 'waiting' | 'running' | 'done' | 'unused';
const OPS_KEYS = ['add', 'update', 'delete'] as const;

const nodeById = (id: string) => nodes.find((n) => n.id === id)!;
const upstream = (id: string) => edges.find(([, b]) => b === id)?.[0];

export default function PipelineExplorer() {
  const [ops, setOps] = useUrlState<(typeof OPS_KEYS)[number][]>('ops', ['add', 'update', 'delete'], codecs.list(OPS_KEYS));
  const [addB, setAddB] = useUrlState<BuilderSlug>('add', 'management-hierarchy', codecs.str(builderSlugs));
  const [updB, setUpdB] = useUrlState<BuilderSlug>('upd', 'approval-group', codecs.str(builderSlugs));
  const [mode, setMode] = useUrlState<Mode>('mode', 'par', codecs.str(['seq', 'par'] as const));
  const [selected, setSelected] = useState('split');
  const [t, setT] = useState<number | null>(null); // seconds into a played run
  const [k, setK] = useState<number | null>(null); // calls finished when stepping
  const [announce, setAnnounce] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sheet, setSheet] = useState(false);
  const reduce = useReducedMotion();
  const raf = useRef(0);

  const o: Ops = useMemo(
    () => ({ add: ops.includes('add') ? addB : null, update: ops.includes('update') ? updB : null, del: ops.includes('delete') }),
    [ops, addB, updB],
  );
  const calls = callCount(o);
  const sched = useMemo(() => schedule(o, mode), [o, mode]);
  const order = useMemo(() => startOrder(o, mode), [o, mode]);
  const active = useMemo(() => activeNodes(o), [o]);
  const preset = presets.find(
    (p) => p.ops.add === o.add && p.ops.update === o.update && p.ops.del === o.del,
  );

  const clear = () => {
    cancelAnimationFrame(raf.current);
    setT(null);
    setK(null);
  };
  useEffect(clear, [o, mode]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const stateOf = (id: string): NodeState => {
    if (!active.has(id)) return 'unused';
    if (id === 'request') return t !== null || k !== null ? 'done' : 'waiting';
    if (id === 'merge' || id === 'render') {
      if (t !== null && t >= sched.total) return 'done';
      if (k !== null && k >= order.length) return 'done';
      return 'waiting';
    }
    if (k !== null) {
      const i = order.indexOf(id);
      return i < k ? 'done' : i === k ? 'running' : 'waiting';
    }
    if (t === null) return 'waiting';
    const s = sched.slots.find((x) => x.id === id)!;
    return t >= s.end ? 'done' : t >= s.start ? 'running' : 'waiting';
  };

  // Announce progress when states change.
  const prevStates = useRef<Record<string, NodeState>>({});
  useEffect(() => {
    const finished: string[] = [];
    const started: string[] = [];
    for (const id of order) {
      const s = stateOf(id);
      const p = prevStates.current[id];
      if (s === 'done' && p !== 'done') finished.push(id);
      if (s === 'running' && p !== 'running') started.push(id);
      prevStates.current[id] = s;
    }
    if (finished.length || started.length) setAnnounce(progressLine(finished, started));
    if ((t !== null && t >= sched.total) || (k !== null && k >= order.length))
      setAnnounce(`Merge finished. The rules are drawn after about ${mode === 'seq' ? sequentialSeconds(calls) : parallelSeconds(calls)} seconds.`);
  }, [t, k]);

  const play = () => {
    clear();
    if (reduce) {
      setT(sched.total);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const sim = ((now - t0) / 1000) * 10; // ten times real speed
      setT(Math.min(sched.total, sim));
      if (sim < sched.total) raf.current = requestAnimationFrame(tick);
    };
    setT(0);
    raf.current = requestAnimationFrame(tick);
  };
  const step = () => {
    cancelAnimationFrame(raf.current);
    setT(null);
    setK((x) => (x === null ? 0 : Math.min(order.length, x + 1)));
  };
  const reset = () => {
    clear();
    setOps(['add', 'update', 'delete']);
    setAddB('management-hierarchy');
    setUpdB('approval-group');
    setMode('par');
    setSelected('split');
  };

  const toggleOp = (key: (typeof OPS_KEYS)[number]) => {
    const has = ops.includes(key);
    if (has && ops.length === 1) return; // at least one stays on
    setOps(has ? ops.filter((x) => x !== key) : OPS_KEYS.filter((x) => x === key || ops.includes(x)));
  };
  const applyPreset = (id: number) => {
    const p = presets.find((x) => x.id === id)!;
    const next: (typeof OPS_KEYS)[number][] = [];
    if (p.ops.add) {
      next.push('add');
      setAddB(p.ops.add);
    }
    if (p.ops.update) {
      next.push('update');
      setUpdB(p.ops.update);
    }
    if (p.ops.del) next.push('delete');
    setOps(next);
  };

  // ------------------------------------------------------------- keyboard: execution order
  const navOrder = ['request', ...order, 'merge', 'render'];
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onNodeKey = (e: KeyboardEvent, id: string) => {
    const list = navOrder.includes(id) ? navOrder : [...navOrder, id];
    const i = list.indexOf(id);
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = Math.min(list.length - 1, i + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = Math.max(0, i - 1);
    if (j >= 0) {
      e.preventDefault();
      nodeRefs.current[list[j]]?.focus();
    }
  };
  const select = (id: string) => {
    setSelected(id);
    if (window.matchMedia('(max-width: 767px)').matches) setSheet(true);
  };

  // ------------------------------------------------------------- edges, drawn from measured positions
  const graphRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<{ d: string; on: boolean }[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    const measure = () => {
      const gr = g.getBoundingClientRect();
      const rect = (id: string) => {
        const el = g.querySelector<HTMLElement>(`[data-node="${id}"]`);
        if (!el || el.offsetParent === null) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left - gr.left, y: r.top - gr.top, w: r.width, h: r.height };
      };
      const seen = new Set<string>();
      const out: { d: string; on: boolean }[] = [];
      for (const [a0, b0] of edges) {
        const a = a0.includes('.builder.') ? `${a0.split('.builder.')[0]}.builders` : a0;
        const b = b0.includes('.builder.') ? `${b0.split('.builder.')[0]}.builders` : b0;
        const key = `${a}>${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const ra = rect(a);
        const rb = rect(b);
        if (!ra || !rb) continue;
        const on = (active.has(a0) || a.endsWith('.builders')) && (active.has(b0) || b.endsWith('.builders'));
        const branchOn = (id: string) => (id.startsWith('add') ? !!o.add : id.startsWith('update') ? !!o.update : true);
        const lit = on && branchOn(a) && branchOn(b) && (a !== 'delete' || o.del) && (b !== 'delete' || o.del);
        const horizontal = rb.x >= ra.x + ra.w - 4;
        let d: string;
        if (horizontal) {
          const x1 = ra.x + ra.w;
          const y1 = ra.y + ra.h / 2;
          const x2 = rb.x;
          const y2 = rb.y + rb.h / 2;
          const mx = (x1 + x2) / 2;
          d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
        } else {
          const x1 = ra.x + ra.w / 2;
          const y1 = ra.y + ra.h;
          const x2 = rb.x + rb.w / 2;
          const y2 = rb.y;
          const my = (y1 + y2) / 2;
          d = `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
        }
        out.push({ d, on: lit });
      }
      setPaths(out);
      setBox({ w: gr.width, h: gr.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(g);
    return () => ro.disconnect();
  }, [o, expanded]);

  // ------------------------------------------------------------- rendering helpers
  const stateIcon = { waiting: 'wait', running: 'running', done: 'done', unused: 'skip' } as const;
  const stateWord = { waiting: 'waiting', running: 'running', done: 'done', unused: 'not used' } as const;

  const Node = ({ id, label, small }: { id: string; label?: string; small?: boolean }) => {
    const n = nodeById(id);
    const st = stateOf(id);
    return (
      <button
        type="button"
        data-node={id}
        ref={(el) => {
          nodeRefs.current[id] = el;
        }}
        class={`px-node px-${n.kind} px-${st}${selected === id ? ' px-sel' : ''}${small ? ' px-small' : ''}`}
        aria-pressed={selected === id}
        tabIndex={selected === id ? 0 : -1}
        onClick={() => select(id)}
        onKeyDown={(e) => {
          onNodeKey(e as unknown as KeyboardEvent, id);
          if (e.key === 'Enter') select(id);
        }}
        aria-label={`${label ?? n.label}, ${n.kind === 'ai' ? 'AI call' : n.kind === 'code' ? 'code step' : 'input'}, ${stateWord[st]}`}
      >
        <span class="px-label">{label ?? n.label}</span>
        <span class="px-state">
          <Icon name={stateIcon[st]} size={14} />
          {stateWord[st]}
        </span>
      </button>
    );
  };

  const Builders = ({ branch }: { branch: 'add' | 'update' }) => {
    const chosen = branch === 'add' ? addB : updB;
    const on = branch === 'add' ? !!o.add : !!o.update;
    const open = !!expanded[branch];
    return (
      <div class={`px-builders${on ? '' : ' px-off'}${open ? ' px-open' : ''}`} data-node={`${branch}.builders`}>
        <span class="px-group-label">List builders, one runs</span>
        <div class="px-builder-list">
          {builders.map((b) => (
            <div class={`px-builder-item${b.slug === chosen ? ' chosen' : ''}`}>
              <Node id={`${branch}.builder.${b.slug}`} small />
            </div>
          ))}
        </div>
        <button
          type="button"
          class="linklike px-expand"
          aria-expanded={open}
          onClick={() => setExpanded({ ...expanded, [branch]: !open })}
        >
          {open ? 'Show the chosen one only' : 'One of seven. Show all'}
        </button>
      </div>
    );
  };

  const Lane = ({ branch }: { branch: 'add' | 'update' }) => {
    const on = branch === 'add' ? !!o.add : !!o.update;
    return (
      <div class={`px-lane${on ? '' : ' px-off'}`}>
        <span class="px-lane-label">{branch === 'add' ? 'Add' : 'Update'}</span>
        <div class="px-pair">
          <Node id={`${branch}.condition`} />
          <Node id={`${branch}.semantic`} />
        </div>
        <div class="px-pair">
          <Node id={`${branch}.classify`} />
          <Builders branch={branch} />
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------- inspector
  const sel = nodeById(selected);
  const slot = sched.slots.find((s) => s.id === selected);
  const outOf = (id: string): unknown => {
    if (id in inspectorOut) return inspectorOut[id];
    const n = nodeById(id);
    if (n.builder) return { node: builderName(n.builder), action: 'Approval required', ...builders.find((b) => b.slug === n.builder)!.example };
    return null;
  };
  const up = upstream(selected);
  const goesIn = selected === 'split' ? inspectorOut.request : up ? outOf(up.includes('.builder.') ? up : up) : null;
  const goesInForBuilder = sel.builder ? outOf(`${sel.branch}.classify`) : goesIn;
  const fmtJson = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));

  const Inspector = (
    <div class="px-inspector" aria-label="Inspector">
      <h4>{sel.label}</h4>
      <p class="small soft">
        {sel.kind === 'ai' ? 'AI call' : sel.kind === 'code' ? 'Code' : 'Input'}
        {!active.has(selected) && '. Not used by this request'}
      </p>
      <p class="small">
        <strong>What it does:</strong> {sel.does}.
      </p>
      {selected !== 'request' && goesInForBuilder != null && (
        <>
          <p class="small">
            <strong>Goes in</strong>
          </p>
          <pre class="json" tabIndex={0}>{fmtJson(goesInForBuilder)}</pre>
        </>
      )}
      {outOf(selected) != null && (
        <>
          <p class="small">
            <strong>Comes out</strong>
          </p>
          <pre class="json" tabIndex={0}>{fmtJson(outOf(selected))}</pre>
        </>
      )}
      {slot && active.has(selected) && (
        <p class="small">
          In this run: {slot.start} s to {slot.end} s.
        </p>
      )}
      <p class="small soft">Examples are illustrative.</p>
    </div>
  );

  // ------------------------------------------------------------- timeline
  const axisMax = Math.max(sequentialSeconds(calls), 20);
  const pct = (s: number) => `${(s / axisMax) * 100}%`;
  const ticks = Array.from({ length: Math.floor(axisMax / 5) + 1 }, (_, i) => i * 5);
  const now = t ?? (k !== null ? (k >= order.length ? sched.total : sched.slots.find((s) => s.id === order[k])?.start ?? 0) : null);

  const words = (
    <>
      This request needs {calls} AI calls. One after another: about {sequentialSeconds(calls)} s. In parallel: about{' '}
      {parallelSeconds(calls)} s. Showing {mode === 'seq' ? 'one after another' : 'in parallel'}.
    </>
  );

  return (
    <Frame
      id="stages"
      num={2}
      title="Pipeline explorer"
      badge="reconstruction"
      wide
      onReset={reset}
      words={words}
      what="Every AI call in the real pipeline, in the order it runs. Choose what the administrator asks for, then play the run one after another or in parallel. Select any step to see what goes in and what comes out."
      tryThis={[
        'Press Play in parallel, then switch to one after another and play again.',
        'Choose the delete-only request and compare the two modes.',
        'Use Step and the arrow keys to walk through the calls one at a time.',
      ]}
      extra={confirmed.promptBreakdown ? <p class="small">{PROMPT_TOTAL_LINE}</p> : undefined}
      controls={
        <div class="px-controls">
          <fieldset>
            <legend>Request</legend>
            {presets.map((p) => (
              <label class="px-preset">
                <input type="radio" name="px-preset" checked={preset?.id === p.id} onChange={() => applyPreset(p.id)} />
                <span>{p.text}</span>
              </label>
            ))}
          </fieldset>
          <div class="px-ops">
            <div class="px-op">
              <label class="check">
                <input type="checkbox" checked={ops.includes('add')} onChange={() => toggleOp('add')} disabled={ops.length === 1 && ops.includes('add')} />
                Add
              </label>
              <label class="visually-hidden" for="px-add-b">
                Approvers come from, for the add
              </label>
              <select id="px-add-b" value={addB} onChange={(e) => setAddB((e.target as HTMLSelectElement).value as BuilderSlug)} disabled={!ops.includes('add')}>
                {builders.map((b) => (
                  <option value={b.slug}>{b.name}</option>
                ))}
              </select>
            </div>
            <div class="px-op">
              <label class="check">
                <input type="checkbox" checked={ops.includes('update')} onChange={() => toggleOp('update')} disabled={ops.length === 1 && ops.includes('update')} />
                Update
              </label>
              <label class="visually-hidden" for="px-upd-b">
                Approvers come from, for the update
              </label>
              <select id="px-upd-b" value={updB} onChange={(e) => setUpdB((e.target as HTMLSelectElement).value as BuilderSlug)} disabled={!ops.includes('update')}>
                {builders.map((b) => (
                  <option value={b.slug}>{b.name}</option>
                ))}
              </select>
            </div>
            <div class="px-op">
              <label class="check">
                <input type="checkbox" checked={ops.includes('delete')} onChange={() => toggleOp('delete')} disabled={ops.length === 1 && ops.includes('delete')} />
                Delete
              </label>
            </div>
            {ops.length === 1 && <p class="small soft">At least one of add, update and delete stays on.</p>}
          </div>
          <div class="px-run">
            <Seg
              label="Mode"
              value={mode}
              options={[
                { value: 'seq', label: 'One after another' },
                { value: 'par', label: 'In parallel' },
              ]}
              onChange={setMode}
            />
            <div class="btn-row">
              <button class="btn btn-primary" type="button" onClick={play}>
                <Icon name="play" size={16} /> {reduce ? 'Show the result' : 'Play'}
              </button>
              <button class="btn" type="button" onClick={step}>
                <Icon name="step" size={16} /> Step
              </button>
              <button class="btn" type="button" onClick={clear}>
                Reset
              </button>
              {showFailureInjection && (
                <button class="btn" type="button">
                  Fail a call
                </button>
              )}
            </div>
          </div>
        </div>
      }
    >
      <p class="visually-hidden" aria-live="polite">
        {announce}
      </p>
      <div class="px-legend small">
        <span class="px-key px-key-ai">AI call</span>
        <span class="px-key px-key-code">Code step</span>
        <span>Faint steps are not used by this request.</span>
      </div>
      <div class="px-body">
        <div class="px-graph-wrap">
          <div class="px-graph" ref={graphRef}>
            <svg class="px-edges" aria-hidden="true" width={box.w} height={box.h}>
              {paths.map((p) => (
                <path d={p.d} class={p.on ? 'on' : ''} />
              ))}
            </svg>
            <div class="px-start">
              <Node id="request" />
              <Node id="split" />
            </div>
            <div class="px-lanes">
              <Lane branch="add" />
              <Lane branch="update" />
              <div class={`px-lane px-lane-delete${o.del ? '' : ' px-off'}`}>
                <span class="px-lane-label">Delete</span>
                <Node id="delete" />
              </div>
            </div>
            <div class="px-end">
              <Node id="merge" />
              <Node id="render" />
            </div>
          </div>
        </div>
        <div class={`px-side${sheet ? ' px-sheet-open' : ''}`}>
          <button type="button" class="btn btn-small px-sheet-close" onClick={() => setSheet(false)}>
            Close
          </button>
          {Inspector}
        </div>
      </div>
      <div class="px-timeline" role="img" aria-label={`Timeline: ${calls} AI calls, about ${sched.total} seconds ${mode === 'seq' ? 'one after another' : 'in parallel'}.`}>
        <p class="small">
          <strong>Timeline,</strong> one bar per AI call, in seconds
        </p>
        <div class="px-tl-rows">
          {sched.slots.map((s) => {
            const n = nodeById(s.id);
            const st = stateOf(s.id);
            const lab = s.id.startsWith('add.') ? `Add: ${n.label}` : s.id.startsWith('update.') ? `Update: ${n.label}` : n.label;
            return (
              <div class="px-tl-row">
                <span class="px-tl-label">{lab}</span>
                <span class="px-tl-track">
                  <span class={`px-tl-bar px-tl-${st}`} style={{ left: pct(s.start), width: pct(s.end - s.start) }} />
                </span>
              </div>
            );
          })}
          {sched.overhead && (
            <div class="px-tl-row">
              <span class="px-tl-label">Pre- and post-processing, merge and drawing. Not broken down.</span>
              <span class="px-tl-track">
                <span class="px-tl-bar px-tl-hatch" style={{ left: pct(sched.overhead.start), width: pct(sched.overhead.end - sched.overhead.start) }} />
              </span>
            </div>
          )}
          <div class="px-tl-row px-tl-axis">
            <span class="px-tl-label" />
            <span class="px-tl-track">
              {ticks.map((x) => (
                <span class="px-tick" style={{ left: pct(x) }}>
                  {x} s
                </span>
              ))}
              {now !== null && <span class="px-now" style={{ left: pct(now) }} />}
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
}
