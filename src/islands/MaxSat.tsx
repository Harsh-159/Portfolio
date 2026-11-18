// Section 15.2: Figure 1, run the solver. A JavaScript port of exercise3.py in a Web Worker.
import { useEffect, useRef, useState } from 'preact/hooks';
import { DEFAULT_SETTINGS } from '../lib/maxsat';
import { Frame, Icon, Slider, useUrlState, codecs, token, useTheme, ShowData } from './shared/ui';

const PROBLEMS = [
  { id: 'sbox_4', vars: 147, clauses: 387 },
  { id: 'johnson8-4-4', vars: 70, clauses: 630 },
  { id: 'hamming6-4', vars: 64, clauses: 1376 },
  { id: 'brock200_1', vars: 200, clauses: 5266 },
] as const;
type ProblemId = (typeof PROBLEMS)[number]['id'];

interface Point {
  g: number;
  best: number;
  off: number | null;
}

export default function MaxSat() {
  const [problem, setProblem] = useUrlState<ProblemId>('problem', 'sbox_4', codecs.str(PROBLEMS.map((p) => p.id)));
  const [pop, setPop] = useUrlState('pop', 100, codecs.int(20, 200));
  const [mut, setMut] = useUrlState('mut', 1, codecs.num(0.25, 4));
  const [tour, setTour] = useUrlState('tour', 5, codecs.int(2, 10));
  const [ls, setLs] = useUrlState('ls', 15, codecs.int(0, 50));
  const [gens, setGens] = useUrlState('gens', 60, codecs.int(10, 200));
  const [seed, setSeed] = useUrlState('seed', 42, codecs.int(0, 2 ** 31));
  const [compare, setCompare] = useUrlState('compare', true, codecs.bool());
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'paused' | 'done' | 'error'>('idle');
  const [points, setPoints] = useState<Point[]>([]);
  const [top, setTop] = useState<number[][]>([]);
  const worker = useRef<Worker | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  const P = PROBLEMS.find((p) => p.id === problem)!;

  const stop = () => {
    worker.current?.terminate();
    worker.current = null;
  };
  useEffect(() => stop, []);

  const run = async () => {
    stop();
    setPoints([]);
    setTop([]);
    setStatus('loading');
    let text: string;
    try {
      const r = await fetch(`/data/maxsat/${problem}.wcnf`);
      if (!r.ok) throw new Error();
      text = await r.text();
    } catch {
      setStatus('error');
      return;
    }
    const w = new Worker(new URL('../workers/maxsat.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'gen') {
        setPoints((p) => [...p, { g: m.generation, best: m.best, off: m.bestOff }]);
        if (m.top) setTop(m.top);
      } else if (m.type === 'done') setStatus('done');
    };
    w.onerror = () => setStatus('error');
    w.postMessage({
      type: 'start',
      text,
      settings: { popSize: pop, mutation: mut, tournament: tour, lsRate: ls / 100, generations: gens, seed },
      compare,
    });
    setStatus('running');
  };
  const pause = () => {
    if (status === 'running') {
      worker.current?.postMessage({ type: 'pause' });
      setStatus('paused');
    } else if (status === 'paused') {
      worker.current?.postMessage({ type: 'resume' });
      setStatus('running');
    }
  };
  const reset = () => {
    stop();
    setStatus('idle');
    setPoints([]);
    setTop([]);
    setProblem('sbox_4');
    setPop(DEFAULT_SETTINGS.popSize);
    setMut(1);
    setTour(5);
    setLs(15);
    setGens(60);
    setSeed(42);
    setCompare(true);
  };

  // Population view: best 30 candidates, one cell per variable.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !top.length) return;
    const ctx = c.getContext('2d')!;
    c.width = P.vars;
    c.height = top.length;
    const on = token('ink') || '#12261e';
    const off = token('sheet') || '#fff';
    top.forEach((row, y) =>
      row.forEach((b, x) => {
        ctx.fillStyle = b ? on : off;
        ctx.fillRect(x, y, 1, 1);
      }),
    );
  }, [top, theme, P.vars]);

  const last = points[points.length - 1];
  const W = 640;
  const H = 240;
  const all = points.flatMap((p) => [p.best, p.off ?? p.best]);
  const lo = all.length ? Math.min(...all) - 2 : P.clauses * 0.8;
  const hi = P.clauses;
  const x = (g: number) => 50 + (g / gens) * (W - 60);
  const y = (v: number) => H - 30 - ((v - lo) / Math.max(1, hi - lo)) * (H - 50);
  const line = (k: 'best' | 'off') =>
    points
      .filter((p) => p[k] !== null)
      .map((p, i) => `${i ? 'L' : 'M'}${x(p.g).toFixed(1)},${y(p[k] as number).toFixed(1)}`)
      .join('');

  const words =
    status === 'idle'
      ? `Not run yet. ${problem} has ${P.vars} variables and ${P.clauses.toLocaleString('en-GB')} clauses.`
      : status === 'loading'
        ? 'Loading data'
        : status === 'error'
          ? 'The data for this figure did not load.'
          : status === 'done' && compare && last?.off != null
            ? `With local search: ${last.best} of ${P.clauses}. Without: ${last.off} of ${P.clauses}.`
            : `Best so far: ${last?.best ?? 0} of ${P.clauses} clauses satisfied after ${last?.g ?? 0} generations.`;

  const busy = status === 'running' || status === 'paused';

  return (
    <Frame
      id="solver"
      num={1}
      title="Run the solver"
      badge="live"
      wide
      onReset={reset}
      words={words}
      what="The coursework solver, ported function for function, running in a background thread in your browser. The solid line is the best answer so far. The dashed line is the same seed with local search switched off."
      tryThis={['Press Run with the defaults and compare the two lines.', 'Set the polished share to 0% and run again.', 'Press New seed: results for a given seed are identical on every run.']}
      controls={
        <div class="ctl-grid three">
          <div class="field">
            <label for="ms-p">Problem</label>
            <select id="ms-p" value={problem} onChange={(e) => setProblem((e.target as HTMLSelectElement).value as ProblemId)} disabled={busy}>
              {PROBLEMS.map((p) => (
                <option value={p.id}>
                  {p.id}: {p.vars} variables, {p.clauses.toLocaleString('en-GB')} clauses
                </option>
              ))}
            </select>
          </div>
          <Slider label="Population size" value={pop} min={20} max={200} step={10} onChange={setPop} />
          <Slider label="Mutation rate, times 1/n" value={mut} min={0.25} max={4} step={0.25} onChange={setMut} format={(v) => v.toFixed(2)} />
          <Slider label="Tournament size" value={tour} min={2} max={10} step={1} onChange={setTour} />
          <Slider label="Children polished by local search" value={ls} min={0} max={50} step={1} onChange={setLs} format={(v) => `${v}%`} />
          <Slider label="Generations" value={gens} min={10} max={200} step={10} onChange={setGens} />
          <div class="field">
            <label for="ms-seed">Seed</label>
            <div class="btn-row">
              <input id="ms-seed" type="number" min={0} value={seed} style={{ width: '9rem' }} onInput={(e) => setSeed(Math.max(0, Math.floor(Number((e.target as HTMLInputElement).value) || 0)))} />
              <button class="btn btn-small" type="button" onClick={() => setSeed(Math.floor(Math.random() * 1e6))}>
                New seed
              </button>
            </div>
          </div>
          <label class="check">
            <input type="checkbox" checked={compare} onChange={() => setCompare(!compare)} />
            Compare with local search off
          </label>
          <div class="btn-row" style={{ alignSelf: 'end', marginBottom: '16px' }}>
            <button class="btn btn-primary" type="button" onClick={run}>
              <Icon name="play" size={16} /> Run
            </button>
            <button class="btn" type="button" onClick={pause} disabled={!busy}>
              {status === 'paused' ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>
      }
    >
      <p aria-live="polite">
        <strong>
          {status === 'idle' ? 'Press Run to start.' : `Best so far: ${last?.best ?? 0} of ${P.clauses} clauses satisfied after ${last?.g ?? 0} generations.`}
        </strong>
      </p>
      <div class="legend-keys">
        <span class="lk lk-solid lk-s1">With local search</span>
        {compare && <span class="lk lk-dashed lk-s4">Local search off, same seed</span>}
      </div>
      <svg class="svg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={words}>
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <g>
            <line class="grid" x1="50" x2={W - 10} y1={y(v)} y2={y(v)} />
            <text x="44" y={y(v) + 4} text-anchor="end">
              {Math.round(v)}
            </text>
          </g>
        ))}
        <text x="50" y={H - 8}>
          0
        </text>
        <text x={W - 10} y={H - 8} text-anchor="end">
          {gens} generations
        </text>
        <path d={line('best')} fill="none" stroke="var(--series-1)" stroke-width="2.2" />
        {compare && <path d={line('off')} fill="none" stroke="var(--series-4)" stroke-width="2" stroke-dasharray="6 4" />}
      </svg>
      <div class="pop-view">
        <p class="small">
          <strong>Population view.</strong> The best 30 candidates, one row each, one cell per variable. Dark is true. Rows grow alike as the population converges.
        </p>
        {top.length ? <canvas ref={canvas} aria-hidden="true" style={{ aspectRatio: `${P.vars} / ${Math.max(30, top.length) * 1.5}` }} /> : <p class="soft small">Appears once a run starts.</p>}
      </div>
      {points.length > 0 && (
        <ShowData>
          <table>
            <thead>
              <tr>
                <th scope="col">Generation</th>
                <th scope="col" class="r">
                  Best, with local search
                </th>
                {compare && (
                  <th scope="col" class="r">
                    Best, without
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr>
                  <td>{p.g}</td>
                  <td class="r">{p.best}</td>
                  {compare && <td class="r">{p.off ?? ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </ShowData>
      )}
    </Frame>
  );
}
