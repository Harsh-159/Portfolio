import { useEffect, useMemo, useState } from 'react';
import { DemoChrome } from '../../components/DemoChrome';
import { computeEdit, levenshteinDistance, type EditOp } from '../../lib/levenshtein';

const MAX_RENDER = 25;

const OP_STYLE: Record<EditOp, string> = {
  keep: 'text-muted',
  substitute: 'text-planned',
  insert: 'text-live',
  delete: 'text-sell',
};

function describe(op: {
  op: EditOp;
  aChar?: string;
  bChar?: string;
}): string {
  switch (op.op) {
    case 'keep':
      return `keep "${op.aChar}"`;
    case 'substitute':
      return `substitute "${op.aChar}" → "${op.bChar}"`;
    case 'insert':
      return `insert "${op.bChar}"`;
    case 'delete':
      return `delete "${op.aChar}"`;
  }
}

export default function Levenshtein() {
  const [a, setA] = useState('approval rule');
  const [b, setB] = useState('aproval rules');

  const tooLong = a.length > MAX_RENDER || b.length > MAX_RENDER;

  const result = useMemo(() => (tooLong ? null : computeEdit(a, b)), [a, b, tooLong]);
  const longDistance = useMemo(() => (tooLong ? levenshteinDistance(a, b) : 0), [a, b, tooLong]);

  const totalCells = result ? (a.length + 1) * (b.length + 1) : 0;
  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(12); // cells per tick

  // Restart the fill animation whenever the inputs change.
  useEffect(() => {
    setRevealed(0);
    setPlaying(true);
  }, [a, b]);

  useEffect(() => {
    if (tooLong || !playing) return;
    if (revealed >= totalCells) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setRevealed((r) => Math.min(r + speed, totalCells)), 40);
    return () => clearTimeout(id);
  }, [playing, revealed, totalCells, speed, tooLong]);

  const complete = result !== null && revealed >= totalCells;
  const pathSet = useMemo(
    () => new Set((result?.path ?? []).map((c) => `${c.i},${c.j}`)),
    [result],
  );

  // Map a flat reveal counter to a (i,j) cutoff in row-major order.
  const isRevealed = (i: number, j: number) => i * (b.length + 1) + j < revealed;

  return (
    <DemoChrome labId="levenshtein">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">String A</span>
          <input
            value={a}
            onChange={(e) => setA(e.target.value)}
            aria-label="String A"
            className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-muted"
          />
        </label>
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">String B</span>
          <input
            value={b}
            onChange={(e) => setB(e.target.value)}
            aria-label="String B"
            className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-muted"
          />
        </label>
      </div>

      {tooLong ? (
        <div className="mt-8 rounded-lg border border-line bg-surface/40 p-6">
          <p className="font-mono text-sm text-muted">
            Strings over {MAX_RENDER} characters skip the matrix render. Edit distance ={' '}
            <span className="text-fg">{longDistance}</span>.
          </p>
        </div>
      ) : (
        result && (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (complete) {
                    setRevealed(0);
                    setPlaying(true);
                  } else {
                    setPlaying((p) => !p);
                  }
                }}
                className="rounded-md bg-live px-3 py-1.5 font-mono text-sm font-semibold text-bg"
              >
                {complete ? 'Replay' : playing ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setRevealed(totalCells);
                }}
                disabled={complete}
                className="rounded-md border border-line px-3 py-1.5 font-mono text-sm text-fg disabled:opacity-40"
              >
                Instant finish
              </button>
              <label className="flex items-center gap-2 font-mono text-xs text-muted">
                speed
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  aria-label="Fill speed"
                  className="accent-[var(--color-live)]"
                />
              </label>
              <span className="font-mono text-sm text-muted">
                distance: <span className="text-fg">{result.distance}</span>
              </span>
            </div>

            <div className="mt-6 overflow-auto">
              <table className="border-collapse font-mono text-xs">
                <tbody>
                  <tr>
                    <td className="h-7 w-7" />
                    <td className="h-7 w-7 text-center text-muted/50">ε</td>
                    {Array.from(b).map((ch, j) => (
                      <td key={j} className="h-7 w-7 text-center text-muted">
                        {ch === ' ' ? '␣' : ch}
                      </td>
                    ))}
                  </tr>
                  {result.matrix.map((row, i) => (
                    <tr key={i}>
                      <td className="h-7 w-7 text-center text-muted">
                        {i === 0 ? 'ε' : a[i - 1] === ' ' ? '␣' : a[i - 1]}
                      </td>
                      {row.map((val, j) => {
                        const shown = isRevealed(i, j);
                        const onPath = complete && pathSet.has(`${i},${j}`);
                        return (
                          <td
                            key={j}
                            className={`h-7 w-7 border border-line/40 text-center transition-colors ${
                              onPath
                                ? 'bg-live/25 text-live'
                                : shown
                                  ? 'bg-surface text-fg'
                                  : 'text-transparent'
                            }`}
                          >
                            {shown ? val : '·'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {complete && (
              <div className="mt-6 rounded-lg border border-line bg-surface/40 p-4">
                <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
                  Operations ({result.operations.filter((o) => o.op !== 'keep').length} edits)
                </h2>
                <div className="flex flex-wrap gap-2">
                  {result.operations.map((op, i) => (
                    <span
                      key={i}
                      className={`rounded border border-line px-2 py-1 font-mono text-xs ${OP_STYLE[op.op]}`}
                    >
                      {describe(op)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      )}
    </DemoChrome>
  );
}
