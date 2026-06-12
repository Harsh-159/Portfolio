import { useEffect, useMemo, useState } from 'react';
import { DemoChrome } from '../../components/DemoChrome';
import pipeline from '../../content/pipeline.json';

interface PNode {
  id: string;
  label: string;
  col: number;
  role: string;
  inputs: string;
  outputs: string;
  guards: string;
}

const NODES = pipeline.nodes as PNode[];
const EDGES = pipeline.edges as [string, string][];
const ORDER = new Map(NODES.map((n, i) => [n.id, i]));

const NODE_W = 116;
const NODE_H = 32;
const COL_GAP = 150;
const ROW_GAP = 46;

interface Pos {
  x: number;
  y: number;
}

function layout(): { positions: Map<string, Pos>; width: number; height: number } {
  const cols = [...new Set(NODES.map((n) => n.col))].sort((a, b) => a - b);
  const byCol = new Map<number, PNode[]>();
  for (const n of NODES) {
    const arr = byCol.get(n.col) ?? [];
    arr.push(n);
    byCol.set(n.col, arr);
  }
  const maxRows = Math.max(...[...byCol.values()].map((a) => a.length));
  const positions = new Map<string, Pos>();

  cols.forEach((col, colIndex) => {
    const colNodes = byCol.get(col)!;
    const offset = ((maxRows - colNodes.length) / 2) * ROW_GAP;
    colNodes.forEach((n, rowIndex) => {
      positions.set(n.id, {
        x: colIndex * COL_GAP + 12,
        y: offset + rowIndex * ROW_GAP + 16,
      });
    });
  });

  return {
    positions,
    width: cols.length * COL_GAP + NODE_W,
    height: maxRows * ROW_GAP + 28,
  };
}

export default function Pipeline() {
  const { positions, width, height } = useMemo(layout, []);
  const total = NODES.length;

  const [step, setStep] = useState(0); // number of nodes activated
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<PNode | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (step >= total) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => Math.min(s + 1, total)), 420);
    return () => clearTimeout(id);
  }, [playing, step, total]);

  const isDone = (id: string) => (ORDER.get(id) ?? Infinity) < step;
  const isCurrent = (id: string) => ORDER.get(id) === step - 1;

  return (
    <DemoChrome labId="pipeline">
      <div className="mb-4 rounded-md border border-planned/40 bg-planned/10 px-4 py-2 font-mono text-xs text-planned">
        Anonymised reconstruction of a production pipeline I built at Oracle. Names, prompts, and
        data removed.
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (step >= total) setStep(0);
            setPlaying((p) => !p);
          }}
          className="rounded-md bg-live px-3 py-1.5 font-mono text-sm font-semibold text-bg"
        >
          {playing ? 'Pause' : step >= total ? 'Replay' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setStep(0);
          }}
          className="rounded-md border border-line px-3 py-1.5 font-mono text-sm text-muted"
        >
          Reset
        </button>
        <label className="flex flex-1 items-center gap-3 font-mono text-xs text-muted">
          <span className="whitespace-nowrap">
            step {step}/{total}
          </span>
          <input
            type="range"
            min={0}
            max={total}
            value={step}
            onChange={(e) => {
              setPlaying(false);
              setStep(Number(e.target.value));
            }}
            aria-label="Pipeline step scrubber"
            className="w-full accent-[var(--color-live)]"
          />
        </label>
      </div>

      {/* Desktop DAG */}
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface/40 p-4 md:block">
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="19-agent pipeline graph">
          {EDGES.map(([from, to], i) => {
            const a = positions.get(from)!;
            const b = positions.get(to)!;
            const x1 = a.x + NODE_W;
            const y1 = a.y + NODE_H / 2;
            const x2 = b.x;
            const y2 = b.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            const lit = isDone(from) && isDone(to);
            const pulsing = isCurrent(from);
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={lit || pulsing ? 'var(--color-live)' : 'var(--color-line)'}
                strokeWidth={pulsing ? 2 : 1}
                opacity={lit || pulsing ? 0.85 : 0.4}
              />
            );
          })}
          {NODES.map((n) => {
            const p = positions.get(n.id)!;
            const done = isDone(n.id);
            const current = isCurrent(n.id);
            return (
              <g
                key={n.id}
                transform={`translate(${p.x}, ${p.y})`}
                onClick={() => setSelected(n)}
                className="cursor-pointer"
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  fill={current ? 'rgba(190,242,100,0.18)' : 'var(--color-bg)'}
                  stroke={done || current ? 'var(--color-live)' : 'var(--color-line)'}
                  strokeWidth={current ? 2 : 1}
                />
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="'JetBrains Mono Variable', monospace"
                  fill={done || current ? 'var(--color-fg)' : 'var(--color-muted)'}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mobile vertical flow */}
      <ol className="space-y-2 md:hidden">
        {NODES.map((n) => {
          const done = isDone(n.id);
          const current = isCurrent(n.id);
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => setSelected(n)}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left font-mono text-sm ${
                  current
                    ? 'border-live bg-live/15 text-live'
                    : done
                      ? 'border-live/50 text-fg'
                      : 'border-line text-muted'
                }`}
              >
                <span className="text-xs text-muted/60">{(ORDER.get(n.id) ?? 0) + 1}</span>
                {n.label}
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
              <dt className="font-mono text-xs uppercase tracking-wider text-muted/70">Guards against</dt>
              <dd className="mt-1 text-sm text-fg">{selected.guards}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-wider text-muted/70">Inputs</dt>
              <dd className="mt-1 font-mono text-sm text-muted">{selected.inputs}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-wider text-muted/70">Outputs</dt>
              <dd className="mt-1 font-mono text-sm text-muted">{selected.outputs}</dd>
            </div>
          </dl>
        </div>
      )}
    </DemoChrome>
  );
}
