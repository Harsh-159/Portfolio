import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { DemoChrome } from '../../components/DemoChrome';
import pipelineData from '../../content/pipeline.json';

interface PNode {
  id: string;
  label: string;
  col: number;
  row: number;
  lane: 'splitter' | 'add' | 'update' | 'delete' | 'system';
  branch: 'splitter' | 'ADD' | 'UPDATE' | 'DELETE' | 'system';
  group?: string;
  listType?: string;
  system?: boolean;
  role: string;
  guard: string;
  guardNote: string;
}

interface Chip {
  id: string;
  label: string;
  branches: ('ADD' | 'UPDATE' | 'DELETE')[];
}

const NODES = pipelineData.nodes as unknown as PNode[];
const EDGES = pipelineData.edges as [string, string][];
const CHIPS = pipelineData.chips as unknown as Chip[];
const LIST_TYPES = pipelineData.listTypes as string[];
const PER_AGENT = pipelineData.latency.perAgentSeconds;
const SPEED = pipelineData.latency.replaySpeed;

const NODE_W = 140;
const NODE_H = 26;
const COL_GAP = 180;
const ROW_GAP = 30;
const LANE_GAP = 26;

const byId = new Map(NODES.map((n) => [n.id, n]));

// Lane vertical bands, derived from the data so edits to pipeline.json stay correct.
const laneRows = (lane: string) =>
  Math.max(0, ...NODES.filter((n) => n.lane === lane).map((n) => n.row)) + 1;
const ADD_TOP = 10;
const UPDATE_TOP = ADD_TOP + laneRows('add') * ROW_GAP + LANE_GAP;
const DELETE_TOP = UPDATE_TOP + laneRows('update') * ROW_GAP + LANE_GAP;
const HEIGHT = DELETE_TOP + laneRows('delete') * ROW_GAP + 10;
const WIDTH = 3 * COL_GAP + NODE_W + 20;

function nodePos(n: PNode): { x: number; y: number } {
  const x = n.col * COL_GAP + 10;
  if (n.lane === 'splitter' || n.lane === 'system') return { x, y: HEIGHT / 2 - NODE_H / 2 };
  const top = n.lane === 'add' ? ADD_TOP : n.lane === 'update' ? UPDATE_TOP : DELETE_TOP;
  return { x, y: top + n.row * ROW_GAP };
}

interface Replay {
  activeIds: Set<string>;
  level: Map<string, number>;
  maxLevel: number;
  agentCount: number;
  criticalSteps: number;
  wallClock: number;
  selectedBuilderIds: Set<string>;
}

function buildReplay(branches: string[], listType: string): Replay {
  const idx = LIST_TYPES.indexOf(listType);
  const selectedBuilderIds = new Set<string>();
  const activeIds = new Set<string>(['splitter', 'main-page-update']);

  if (branches.includes('ADD')) {
    ['condition', 'semantic', 'classify'].forEach((id) => activeIds.add(id));
    const b = `add-builder-${idx + 1}`;
    activeIds.add(b);
    selectedBuilderIds.add(b);
  }
  if (branches.includes('UPDATE')) {
    const b = `update-builder-${idx + 1}`;
    activeIds.add(b);
    selectedBuilderIds.add(b);
  }
  if (branches.includes('DELETE')) activeIds.add('delete');

  // Longest-path levels over the active subgraph (col order is a topo order).
  const level = new Map<string, number>();
  level.set('splitter', 1);
  const ordered = [...activeIds].map((id) => byId.get(id)!).sort((a, b) => a.col - b.col);
  for (const node of ordered) {
    for (const [from, to] of EDGES) {
      if (from === node.id && activeIds.has(to)) {
        level.set(to, Math.max(level.get(to) ?? 1, (level.get(node.id) ?? 1) + 1));
      }
    }
  }
  const maxLevel = Math.max(...[...activeIds].map((id) => level.get(id) ?? 1));
  const agentCount = [...activeIds].filter((id) => !byId.get(id)!.system).length;
  const criticalSteps = level.get('main-page-update') ?? maxLevel;

  return {
    activeIds,
    level,
    maxLevel,
    agentCount,
    criticalSteps,
    wallClock: criticalSteps * PER_AGENT,
    selectedBuilderIds,
  };
}

function payloadLines(branches: string[], listType: string, level: number): string[] {
  const ops = branches.map((b) => {
    const base: Record<string, string> = {
      type: b,
      target: b === 'DELETE' ? 'targeted rule' : listType,
      intent: b === 'ADD' ? 'add approval rule' : b === 'UPDATE' ? 'update list entry' : 'remove rule',
    };
    if (level >= 2 && (b === 'ADD' || b === 'UPDATE')) base.route = `${b.toLowerCase()}: ${listType}`;
    if (level >= 3) base.status = b === 'DELETE' ? 'removed' : 'built';
    return base;
  });
  return JSON.stringify({ operations: ops }, null, 2).split('\n');
}

export default function Pipeline() {
  const reduced = useReducedMotion();
  const [chipId, setChipId] = useState<string>('add');
  const [listType, setListType] = useState<string>(LIST_TYPES[0]);
  const [injectFailure, setInjectFailure] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<PNode | null>(null);

  const chip = CHIPS.find((c) => c.id === chipId)!;
  const replay = useMemo(() => buildReplay(chip.branches, listType), [chip, listType]);
  const completed = currentLevel >= replay.maxLevel && currentLevel > 0;

  const start = () => {
    setCurrentLevel(0);
    // Pick a failing agent on the active path (never the splitter or terminal).
    if (injectFailure) {
      const candidates = [...replay.activeIds].filter(
        (id) => id !== 'splitter' && !byId.get(id)!.system,
      );
      setFailedId(candidates[Math.floor(Math.random() * candidates.length)] ?? null);
    } else {
      setFailedId(null);
    }
    if (reduced) {
      setCurrentLevel(replay.maxLevel);
      setPlaying(false);
    } else {
      setCurrentLevel(1);
      setPlaying(true);
    }
  };

  useEffect(() => {
    if (!playing) return;
    if (currentLevel >= replay.maxLevel) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(
      () => setCurrentLevel((l) => l + 1),
      (PER_AGENT / SPEED) * 1000,
    );
    return () => window.clearTimeout(id);
  }, [playing, currentLevel, replay.maxLevel]);

  // Reset replay when the inputs change.
  useEffect(() => {
    setCurrentLevel(0);
    setPlaying(false);
    setFailedId(null);
  }, [chipId, listType, injectFailure]);

  const stateOf = (n: PNode): 'inactive' | 'candidate' | 'pending' | 'firing' | 'done' | 'failed' => {
    if (!replay.activeIds.has(n.id)) {
      if (n.group && chip.branches.includes(n.branch as 'ADD' | 'UPDATE')) return 'candidate';
      return 'inactive';
    }
    const lv = replay.level.get(n.id) ?? 1;
    if (currentLevel < lv) return 'pending';
    if (failedId === n.id && currentLevel === lv) return 'failed';
    return currentLevel === lv ? 'firing' : 'done';
  };

  const NODE_FILL: Record<string, string> = {
    inactive: 'var(--color-bg)',
    candidate: 'var(--color-bg)',
    pending: 'var(--color-bg)',
    firing: 'rgba(190,242,100,0.18)',
    done: 'var(--color-bg)',
    failed: 'rgba(251,113,133,0.18)',
  };
  const strokeOf = (s: string) =>
    s === 'failed'
      ? 'var(--color-sell)'
      : s === 'firing' || s === 'done'
        ? 'var(--color-live)'
        : 'var(--color-line)';
  const opacityOf = (s: string) => (s === 'inactive' ? 0.3 : s === 'candidate' || s === 'pending' ? 0.55 : 1);

  return (
    <DemoChrome labId="pipeline">
      <div className="mb-4 rounded-md border border-planned/40 bg-planned/10 px-4 py-2 font-mono text-xs text-planned">
        Anonymised reconstruction of a production pipeline I built at Oracle. Structure approximate
        from memory; prompts, names, and data omitted.
      </div>

      {/* Request chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChipId(c.id)}
            className={`rounded-md border px-3 py-1.5 text-left font-mono text-xs ${
              chipId === c.id ? 'border-live bg-live/10 text-live' : 'border-line text-muted hover:text-fg'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-mono text-xs text-muted">
          list type
          <select
            value={listType}
            onChange={(e) => setListType(e.target.value)}
            aria-label="List type for routing"
            className="rounded-md border border-line bg-bg px-2 py-1 text-fg outline-none focus:border-muted"
          >
            {LIST_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {lt}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 font-mono text-xs text-muted">
          <input
            type="checkbox"
            checked={injectFailure}
            onChange={(e) => setInjectFailure(e.target.checked)}
            className="accent-[var(--color-live)]"
          />
          inject a failure
        </label>
        <button
          type="button"
          onClick={start}
          className="rounded-md bg-live px-3 py-1.5 font-mono text-sm font-semibold text-bg"
        >
          {completed ? 'Replay' : 'Play'}
        </button>
        <span className="font-mono text-xs text-muted">
          step {Math.min(currentLevel, replay.maxLevel)}/{replay.maxLevel} · {SPEED}x replay (each
          agent ≈ {PER_AGENT}s)
        </span>
      </div>

      {/* JSON payload card */}
      {currentLevel >= 1 && (
        <div className="mb-5 max-w-md rounded-lg border border-line bg-bg/60 p-3">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted/70">
            splitter payload
          </div>
          <pre className="overflow-auto font-mono text-xs leading-relaxed">
            {payloadLines(chip.branches, listType, currentLevel).map((line, i) => {
              const fresh = /"route"|"status"/.test(line);
              return (
                <div key={i} className={fresh ? 'text-live' : 'text-muted'}>
                  {line}
                </div>
              );
            })}
          </pre>
        </div>
      )}

      {/* Summary */}
      {completed && (
        <div className="mb-5 rounded-lg border border-live/40 bg-live/5 p-3 font-mono text-xs text-fg">
          agents invoked: {replay.agentCount} of 19 · critical path: {replay.criticalSteps} steps ·
          est. wall-clock ≈ {replay.wallClock} s{failedId ? ' · 1 retry' : ''}
        </div>
      )}

      {/* Desktop DAG */}
      <div className="hidden overflow-auto rounded-lg border border-line bg-surface/40 p-4 md:block">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width={WIDTH}
          height={HEIGHT}
          role="img"
          aria-label="19-agent pipeline graph"
        >
          {EDGES.map(([from, to], i) => {
            const a = nodePos(byId.get(from)!);
            const b = nodePos(byId.get(to)!);
            const x1 = a.x + NODE_W;
            const y1 = a.y + NODE_H / 2;
            const x2 = b.x;
            const y2 = b.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            const bothActive = replay.activeIds.has(from) && replay.activeIds.has(to);
            const lit =
              bothActive &&
              currentLevel >= (replay.level.get(to) ?? Infinity) &&
              failedId !== to;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={lit ? 'var(--color-live)' : 'var(--color-line)'}
                strokeWidth={lit ? 1.6 : 1}
                opacity={bothActive ? (lit ? 0.85 : 0.4) : 0.12}
              />
            );
          })}
          {NODES.map((n) => {
            const pos = nodePos(n);
            const s = stateOf(n);
            return (
              <g
                key={n.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelected(n)}
                className="cursor-pointer"
                opacity={opacityOf(s)}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={n.system ? 2 : 6}
                  fill={NODE_FILL[s]}
                  stroke={strokeOf(s)}
                  strokeWidth={s === 'firing' || s === 'failed' ? 2 : 1}
                  strokeDasharray={n.system ? '4 2' : undefined}
                  className={s === 'failed' ? 'live-dot' : undefined}
                />
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 3.5}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="'JetBrains Mono Variable', monospace"
                  fill={s === 'inactive' ? 'var(--color-muted)' : 'var(--color-fg)'}
                >
                  {n.system ? `SYSTEM · ${n.label}` : n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mobile vertical flow */}
      <ol className="space-y-1.5 md:hidden">
        {NODES.map((n) => {
          const s = stateOf(n);
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => setSelected(n)}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left font-mono text-xs ${
                  s === 'failed'
                    ? 'border-sell bg-sell/10 text-sell'
                    : s === 'firing' || s === 'done'
                      ? 'border-live/60 text-fg'
                      : s === 'inactive'
                        ? 'border-line/50 text-muted/50'
                        : 'border-line text-muted'
                }`}
              >
                <span className="text-muted/50">{n.lane}</span>
                {n.system ? `SYSTEM · ${n.label}` : n.label}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Node detail */}
      {selected && (
        <div className="mt-6 rounded-lg border border-line bg-surface/40 p-5">
          <div className="flex items-start justify-between">
            <h3 className="font-display text-lg font-semibold">{selected.label}</h3>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="font-mono text-xs text-muted hover:text-fg"
            >
              close
            </button>
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-xs uppercase tracking-wider text-muted/70">Role</dt>
              <dd className="mt-1 text-sm text-fg">{selected.role}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-wider text-muted/70">
                Guard · {selected.guard}
              </dt>
              <dd className="mt-1 text-sm text-fg">{selected.guardNote}</dd>
            </div>
          </dl>
        </div>
      )}
    </DemoChrome>
  );
}
