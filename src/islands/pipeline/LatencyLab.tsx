// Section 9.6: Figure 3, the latency lab. Uses the timing model from section 9.5.
import { sequentialSeconds, parallelSeconds } from '../../lib/pipelineSim';
import { Frame, Slider, ShowData, useUrlState, codecs } from '../shared/ui';

const MIN = 2;
const MAX = 16;
const W = 560;
const H = 260;
const PAD = { l: 48, r: 16, t: 16, b: 40 };
const YMAX = 80;
const x = (c: number) => PAD.l + ((c - MIN) / (MAX - MIN)) * (W - PAD.l - PAD.r);
const y = (s: number) => H - PAD.b - (s / YMAX) * (H - PAD.t - PAD.b);

export default function LatencyLab() {
  const [calls, setCalls] = useUrlState('calls', 8, codecs.int(MIN, MAX));
  const seq = sequentialSeconds(calls);
  const par = parallelSeconds(calls);
  const range = Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i);
  const line = (f: (c: number) => number) => range.map((c, i) => `${i ? 'L' : 'M'}${x(c)},${y(f(c))}`).join('');
  return (
    <Frame
      id="latency"
      num={3}
      title="Sequential versus parallel"
      badge="reconstruction"
      onReset={() => setCalls(8)}
      words={
        <>
          With {calls} AI calls: about {seq} seconds one after another, about {par} in parallel.
        </>
      }
      what="Both lines are estimates built from two figures I measured at the time: about 5 seconds for each call, and about 20 seconds in production after the change. They are from memory and approximate."
      tryThis={['Drag the slider down to 4 calls, where the two lines meet.', 'Drag it to 16 and compare the bars.']}
      controls={<Slider label="AI calls in the request" value={calls} min={MIN} max={MAX} step={1} onChange={setCalls} />}
    >
      <div class="legend-keys">
        <span class="lk lk-solid lk-s4">One after another</span>
        <span class="lk lk-dashed lk-s1">In parallel</span>
      </div>
      <svg
        class="svg-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Waiting time against AI calls. One after another rises 5 seconds per call. In parallel rises to 20 seconds and stays flat. With ${calls} calls: about ${seq} seconds against about ${par}.`}
      >
        {[0, 20, 40, 60, 80].map((s) => (
          <g>
            <line class="grid" x1={PAD.l} x2={W - PAD.r} y1={y(s)} y2={y(s)} />
            <text x={PAD.l - 8} y={y(s) + 4} text-anchor="end">
              {s} s
            </text>
          </g>
        ))}
        {[2, 4, 6, 8, 10, 12, 14, 16].map((c) => (
          <text x={x(c)} y={H - PAD.b + 20} text-anchor="middle">
            {c}
          </text>
        ))}
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} text-anchor="middle">
          AI calls in the request
        </text>
        <path d={line(sequentialSeconds)} fill="none" stroke="var(--series-4)" stroke-width="2.5" />
        <path d={line(parallelSeconds)} fill="none" stroke="var(--series-1)" stroke-width="2.5" stroke-dasharray="7 5" />
        <circle cx={x(calls)} cy={y(seq)} r="6" fill="var(--series-4)" stroke="var(--sheet)" stroke-width="2" />
        <rect x={x(calls) - 6} y={y(par) - 6} width="12" height="12" fill="var(--series-1)" stroke="var(--sheet)" stroke-width="2" />
      </svg>
      <div class="lat-bars">
        <div class="bar-row">
          <span>One after another</span>
          <span class="bar-track">
            <span class="bar-fill" style={{ width: `${(seq / YMAX) * 100}%`, background: 'var(--series-4)' }} />
          </span>
          <span class="num">about {seq} s</span>
        </div>
        <div class="bar-row">
          <span>In parallel</span>
          <span class="bar-track">
            <span class="bar-fill" style={{ width: `${(par / YMAX) * 100}%`, background: 'var(--series-1)' }} />
          </span>
          <span class="num">about {par} s</span>
        </div>
      </div>
      <ShowData>
        <table>
          <thead>
            <tr>
              <th scope="col">AI calls</th>
              <th scope="col" class="r">
                One after another, s
              </th>
              <th scope="col" class="r">
                In parallel, s
              </th>
            </tr>
          </thead>
          <tbody>
            {range.map((c) => (
              <tr>
                <td>{c}</td>
                <td class="r">about {sequentialSeconds(c)}</td>
                <td class="r">about {parallelSeconds(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ShowData>
    </Frame>
  );
}
