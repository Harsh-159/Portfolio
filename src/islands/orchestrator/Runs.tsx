// Section 12.3: Figure 2, recorded runs. A sortable table of the 11 live scenarios, then three replayed traces.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { scenarios, traceMeta, type ScenarioRow } from '../../content/orchestrator';
import { Frame, Icon, State, useUrlState, codecs, useReducedMotion } from '../shared/ui';

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
  error: string | null;
}
interface Turn {
  telemetry: { seconds: number; routed: number; toolCalls: number; modelCalls: number; tokensIn: number; tokensOut: number; cost: number };
  messages: { role: string; content: string }[];
  toolCalls: ToolCall[];
}
interface Trace {
  id: string;
  turns: Turn[];
}

type SortKey = 'id' | 'seconds' | 'routed' | 'toolCalls' | 'modelCalls' | 'tokensIn' | 'cost';
const TRACE_IDS = ['email-to-slack', 'missing-file', 'asks-then-acts'] as const;

const short = (v: unknown, n = 60): string => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

function summarise(result: unknown): string {
  if (result === null || typeof result !== 'object') return short(result, 90);
  const entries = Object.entries(result as Record<string, unknown>);
  const shown = entries.slice(0, 3).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: ${v.length} ${v.length === 1 ? 'item' : 'items'}`;
    if (v && typeof v === 'object') return `${k}: {…}`;
    return `${k}: ${short(v, 40)}`;
  });
  const more = entries.length - 3;
  return shown.join(', ') + (more > 0 ? `, and ${more} more fields` : '');
}

const fmtTok = (n: number) => n.toLocaleString('en-GB');

export default function Runs() {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'id', dir: 1 });
  const [open, setOpen] = useState<string | null>(null);
  const [traceId, setTraceId] = useUrlState<(typeof TRACE_IDS)[number]>('trace', 'email-to-slack', codecs.str(TRACE_IDS));
  const [step, setStep] = useUrlState('step', 99, codecs.int(0, 99));
  const [full, setFull] = useState(false);
  const [data, setData] = useState<Trace[] | null>(null);
  const [failed, setFailed] = useState(false);
  const reduce = useReducedMotion();
  const timer = useRef<number>(0);

  const load = () => {
    setFailed(false);
    fetch('/data/orchestrator/runs.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d.traces))
      .catch(() => setFailed(true));
  };
  useEffect(load, []);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const rows = useMemo(() => {
    const order = (r: ScenarioRow) => scenarios.indexOf(r);
    return [...scenarios].sort((a, b) => {
      if (sort.key === 'id') return (order(a) - order(b)) * sort.dir;
      return ((a[sort.key] as number) - (b[sort.key] as number)) * sort.dir;
    });
  }, [sort]);
  const maxT = Math.max(...scenarios.map((s) => s.seconds));
  const maxC = Math.max(...scenarios.map((s) => s.cost));

  const trace = data?.find((t) => t.id === traceId);
  type Item = { kind: 'request' | 'routed' | 'call' | 'reply' | 'telemetry'; turn: number; call?: ToolCall; text?: string; t?: Turn };
  const items: Item[] = useMemo(() => {
    if (!trace) return [];
    const out: Item[] = [];
    trace.turns.forEach((t, ti) => {
      const userMsgs = t.messages.filter((m) => m.role === 'user');
      out.push({ kind: 'request', turn: ti, text: userMsgs[userMsgs.length - 1]?.content });
      out.push({ kind: 'routed', turn: ti, t });
      t.toolCalls.forEach((c) => out.push({ kind: 'call', turn: ti, call: c }));
      out.push({ kind: 'reply', turn: ti, text: t.messages[t.messages.length - 1]?.content });
      out.push({ kind: 'telemetry', turn: ti, t });
    });
    return out;
  }, [trace]);
  const shown = Math.min(step, items.length);

  const play = () => {
    window.clearInterval(timer.current);
    if (reduce) {
      setStep(items.length);
      return;
    }
    setStep(1);
    let i = 1;
    timer.current = window.setInterval(() => {
      i++;
      setStep(i);
      if (i >= items.length) window.clearInterval(timer.current);
    }, 600);
  };

  const th = (key: SortKey, label: string, cls = '') => (
    <th scope="col" class={cls} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setSort({ key, dir: sort.key === key ? ((-sort.dir) as 1 | -1) : 1 })}>
        {label}
      </button>
    </th>
  );

  const meta = traceMeta[traceId];

  return (
    <Frame
      id="runs"
      num={2}
      title="Recorded runs"
      badge="replay"
      wide
      onReset={() => {
        setTraceId('email-to-slack');
        setStep(99);
        setFull(false);
        setOpen(null);
        setSort({ key: 'id', dir: 1 });
      }}
      words={
        failed
          ? 'The data for this figure did not load.'
          : `All 11 live scenarios passed in 115.1 s on 2 July 2026. Showing the trace "${meta.title}": ${meta.outcome}.`
      }
      what="The live scenario tests from the test log of 2 July 2026, then three full traces from the batch run logged the same day. Requests, tool names and replies are taken word for word from the log."
      tryThis={['Sort the table by cost.', 'Open row 6 to see what the test checks.', 'Choose "Asks, then acts" and press Play.']}
      extra={<p class="small">The mock world is frozen at Wednesday 8 April 2026, New York time. People and files in it are fixtures supplied with the exercise.</p>}
    >
      <p class="small">69 of 69 fast unit tests also pass, 14 of them mine and the rest supplied with the exercise.</p>
      <div class="table-wrap">
        <table class="runs-table">
          <caption>11 live scenarios. All passed in 115.1 s.</caption>
          <thead>
            <tr>
              {th('id', '#')}
              <th scope="col">Scenario</th>
              <th scope="col">Result</th>
              {th('seconds', 'Time s', 'r')}
              {th('routed', 'Tools routed', 'r')}
              {th('toolCalls', 'Tool calls', 'r')}
              {th('modelCalls', 'Model calls', 'r')}
              {th('tokensIn', 'Tokens in / out', 'r')}
              {th('cost', 'Est. cost', 'r')}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <>
                <tr class={open === r.id ? 'exp' : ''}>
                  <td>{r.id}</td>
                  <td>
                    <button class="linklike" type="button" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)} style={{ minHeight: 0, textAlign: 'left' }}>
                      {r.scenario}
                    </button>
                    <div class="small soft">{r.request}</div>
                  </td>
                  <td>{r.id === '5a' ? <span class="soft small">First turn</span> : <State kind="pass" />}</td>
                  <td class="r">
                    {r.seconds.toFixed(2)}
                    <span class="ib" style={{ width: `${(r.seconds / maxT) * 40}px` }} aria-hidden="true" />
                  </td>
                  <td class="r">{r.routed}</td>
                  <td class="r">{r.toolCalls}</td>
                  <td class="r">{r.modelCalls}</td>
                  <td class="r">
                    {fmtTok(r.tokensIn)} / {fmtTok(r.tokensOut)}
                  </td>
                  <td class="r">
                    ${r.cost.toFixed(4)}
                    <span class="ib" style={{ width: `${(r.cost / maxC) * 40}px`, background: 'var(--series-2)' }} aria-hidden="true" />
                  </td>
                </tr>
                {open === r.id && (
                  <tr class="exp">
                    <td />
                    <td colSpan={8}>{r.asserts}</td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <h4 style={{ marginTop: '28px' }}>Three traces</h4>
      <div class="btn-row" style={{ marginBottom: '12px' }}>
        <label class="visually-hidden" for="trace-sel">
          Trace
        </label>
        <select
          id="trace-sel"
          value={traceId}
          onChange={(e) => {
            window.clearInterval(timer.current);
            setTraceId((e.target as HTMLSelectElement).value as never);
            setStep(99);
          }}
          style={{ width: 'auto' }}
        >
          {TRACE_IDS.map((id) => (
            <option value={id}>{traceMeta[id].title}</option>
          ))}
        </select>
        <button class="btn btn-primary" type="button" onClick={play}>
          <Icon name="play" size={16} /> Play
        </button>
        <button
          class="btn"
          type="button"
          onClick={() => {
            window.clearInterval(timer.current);
            setStep(shown >= items.length ? 1 : shown + 1);
          }}
        >
          <Icon name="step" size={16} /> Step
        </button>
        <label class="check">
          <input type="checkbox" checked={full} onChange={() => setFull(!full)} />
          Show full arguments
        </label>
      </div>
      {failed && (
        <p>
          The data for this figure did not load.{' '}
          <button class="btn btn-small" type="button" onClick={load}>
            Try again
          </button>
        </p>
      )}
      {!data && !failed && (
        <p class="soft">
          Loading data. Request: "{meta.request}" Outcome: {meta.outcome}.
        </p>
      )}
      {trace && (
        <ol class="trace" aria-live="polite">
          {items.map((it, i) => {
            const pending = i >= shown;
            const turnLabel = trace.turns.length > 1 ? `Turn ${it.turn + 1}. ` : '';
            if (it.kind === 'request')
              return (
                <li class={pending ? 'pending' : ''}>
                  <span class="small soft">{turnLabel}Request</span>
                  <p>"{it.text}"</p>
                </li>
              );
            if (it.kind === 'routed')
              return (
                <li class={pending ? 'pending' : ''}>
                  <span class="small soft">Tools routed</span>
                  <p>{it.t!.telemetry.routed} tools shown to the model</p>
                </li>
              );
            if (it.kind === 'call') {
              const c = it.call!;
              return (
                <li class={pending ? 'pending' : ''}>
                  <span class="small soft">Tool call</span>
                  <p class="tool">{c.name}</p>
                  <pre class="json">
                    {full
                      ? JSON.stringify(c.arguments, null, 2)
                      : Object.entries(c.arguments)
                          .slice(0, 4)
                          .map(([k, v]) => `${k}: ${short(v, 70)}`)
                          .join('\n') + (Object.keys(c.arguments).length > 4 ? `\nand ${Object.keys(c.arguments).length - 4} more fields` : '')}
                  </pre>
                  <p class="small">
                    {c.error ? <State kind="fail">Error: {c.error}</State> : <>Result: {summarise(c.result)}</>}
                  </p>
                </li>
              );
            }
            if (it.kind === 'reply')
              return (
                <li class={pending ? 'pending' : ''}>
                  <span class="small soft">Reply, word for word</span>
                  <p class="reply">{it.text}</p>
                </li>
              );
            const tm = it.t!.telemetry;
            return (
              <li class={pending ? 'pending' : ''}>
                <span class="small soft">Telemetry</span>
                <p class="small mono">
                  {tm.seconds.toFixed(2)} s, {tm.routed} tools routed, {tm.toolCalls} tool {tm.toolCalls === 1 ? 'call' : 'calls'}, {tm.modelCalls} model calls, {fmtTok(tm.tokensIn)} in / {fmtTok(tm.tokensOut)} out tokens, est. ${tm.cost.toFixed(4)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Frame>
  );
}
