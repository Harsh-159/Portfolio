// Runs the MaxSAT port off the main thread, one generation per task so it can pause.
import { parseWcnf, solve, type SolverSettings } from '../lib/maxsat';

type Msg =
  | { type: 'start'; text: string; settings: SolverSettings; compare: boolean }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' };

let paused = false;
let stopped = false;
let pump: (() => void) | null = null;

self.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data;
  if (m.type === 'pause') paused = true;
  else if (m.type === 'resume') {
    paused = false;
    pump?.();
  } else if (m.type === 'stop') stopped = true;
  else if (m.type === 'start') {
    stopped = false;
    paused = false;
    const inst = parseWcnf(m.text);
    const main = solve(inst, m.settings);
    const other = m.compare ? solve(inst, { ...m.settings, lsRate: 0 }) : null;
    const tick = () => {
      if (stopped) return;
      if (paused) return;
      const a = main.next();
      const b = other?.next();
      if (a.done) {
        (self as unknown as Worker).postMessage({ type: 'done' });
        pump = null;
        return;
      }
      (self as unknown as Worker).postMessage({
        type: 'gen',
        generation: a.value.generation,
        best: a.value.best,
        bestOff: b && !b.done ? b.value.best : null,
        top: a.value.top?.map((x) => Array.from(x)),
        numClauses: inst.clauses.length,
        numVars: inst.numVars,
      });
      setTimeout(tick, 0);
    };
    pump = tick;
    tick();
  }
};
