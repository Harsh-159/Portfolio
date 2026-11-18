// Section 14: five concept sketches. No dissertation data or result appears here.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { signs, reservoirStep, fadeSteps, inputAt, gateValue, blend, CALM_EXPERT, TURBULENT_EXPERT, runId, type InputKind } from '../lib/reservoir';
import { Frame, Icon, Seg, Slider, useUrlState, codecs, useReducedMotion, token, useTheme, fmtN } from './shared/ui';

// ------------------------------------------------------------------ Figure 1
const BLOCKS = [
  { id: 'encoder', title: 'Encoder', sub: 'A frozen Simple Cycle Reservoir', text: 'Reads recent market history and turns it into a rich summary. It is fixed. Nothing in it is trained' },
  { id: 'gate', title: 'Gate', sub: 'Regime gating', text: 'Reads the summary and decides how much weight each expert gets, according to the market regime' },
  { id: 'experts', title: 'Experts', sub: 'Expert policies', text: 'Each expert is a policy that proposes portfolio weights. Each can specialise in one kind of market' },
  {
    id: 'ledger',
    title: 'Ledger',
    sub: 'Differentiable scoring',
    text: 'Applies the blended weights, books the returns that follow and scores them with the Sharpe ratio. Every step is differentiable, so the score trains the gate and the experts directly',
  },
] as const;
type BlockId = (typeof BLOCKS)[number]['id'];

export function Architecture() {
  const [block, setBlock] = useUrlState<BlockId>('block', 'encoder', codecs.str(BLOCKS.map((b) => b.id)));
  const [sig, setSig] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const timer = useRef(0);
  const order: BlockId[] = ['ledger', 'experts', 'gate', 'encoder'];
  const showSignal = () => {
    window.clearInterval(timer.current);
    if (reduce) {
      setSig(3);
      return;
    }
    setSig(0);
    let i = 0;
    timer.current = window.setInterval(() => {
      i++;
      setSig(i);
      if (i >= 3) window.clearInterval(timer.current);
    }, 600);
  };
  useEffect(() => () => window.clearInterval(timer.current), []);
  const b = BLOCKS.find((x) => x.id === block)!;
  const at = sig !== null ? order[sig] : null;
  return (
    <Frame
      id="architecture"
      num={1}
      title="The model in four parts"
      badge="concept"
      onReset={() => {
        setBlock('encoder');
        setSig(null);
      }}
      words={
        sig === 3
          ? 'The training signal runs from the Ledger back through the Experts and the Gate. It stops at the Encoder, which is frozen.'
          : `${b.title}: ${b.text}.`
      }
      what="The four parts of the model, left to right in the order data flows. Select a part to read what it does."
      tryThis={['Press Show the training signal and watch where it stops.']}
    >
      <div class="arch" role="group" aria-label="Model parts">
        {BLOCKS.map((x) => (
          <button type="button" class={`arch-block${at === x.id ? ' signal' : ''}`} aria-pressed={block === x.id} onClick={() => setBlock(x.id)}>
            <strong>
              {x.id === 'encoder' && <Icon name="lock" size={16} />} {x.title}
            </strong>
            <span class="small soft">{x.sub}</span>
          </button>
        ))}
      </div>
      <p style={{ marginTop: '14px' }}>
        <strong>{b.title}:</strong> {b.text}.
      </p>
      <button class="btn" type="button" onClick={showSignal}>
        {reduce ? 'Show where the training signal reaches' : 'Show the training signal'}
      </button>
    </Frame>
  );
}

// ------------------------------------------------------------------ Figure 2
export function Reservoir() {
  const [n, setN] = useUrlState('n', 20, codecs.int(8, 40));
  const [r, setR] = useUrlState('r', 0.8, codecs.num(0.1, 0.99));
  const [v, setV] = useUrlState('v', 0.5, codecs.num(0.1, 1));
  const [kind, setKind] = useUrlState<InputKind>('signal', 'sine', codecs.str(['sine', 'square', 'regime'] as const));
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [hist, setHist] = useState<number[][]>([]);
  const reduce = useReducedMotion();
  const theme = useTheme();
  const sg = useMemo(() => signs(n), [n]);
  const canvas = useRef<HTMLCanvasElement>(null);

  // Warm up deterministically so the server-rendered ring already shows a state.
  const warm = (N: number) => {
    let x = new Array(N).fill(0);
    const h: number[][] = [];
    for (let k = 0; k < 40; k++) {
      x = reservoirStep(x, inputAt(kind, k), r, v, signs(N));
      h.push(x);
    }
    return h;
  };
  useEffect(() => {
    const h = warm(n);
    setHist(h);
    setT(40);
  }, [n, r, v, kind]);

  const advance = () =>
    setHist((h) => {
      const x = h.length ? h[h.length - 1] : new Array(n).fill(0);
      const nx = reservoirStep(x, inputAt(kind, t), r, v, sg);
      setT((tt) => tt + 1);
      return [...h.slice(-99), nx];
    });

  useEffect(() => {
    if (!playing || reduce) return;
    const id = window.setInterval(advance, 120);
    return () => window.clearInterval(id);
  }, [playing, reduce, t, n, r, v, kind]);

  const x = hist.length ? hist[hist.length - 1] : warm(n).at(-1)!;

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    c.width = 100;
    c.height = n;
    const pos = token('series-1') || '#1d5fb8';
    const neg = token('series-2') || '#c2410c';
    ctx.clearRect(0, 0, 100, n);
    hist.slice(-100).forEach((col, ti) => {
      col.forEach((a, ui) => {
        ctx.globalAlpha = Math.min(1, Math.abs(a) * 1.4);
        ctx.fillStyle = a >= 0 ? pos : neg;
        ctx.fillRect(ti + (100 - Math.min(100, hist.length)), ui, 1, 1);
      });
    });
    ctx.globalAlpha = 1;
  }, [hist, n, theme]);

  const R = 110;
  const steps = fadeSteps(r);
  return (
    <Frame
      id="reservoir"
      num={2}
      title="A Simple Cycle Reservoir you can drive"
      badge="concept"
      onReset={() => {
        setN(20);
        setR(0.8);
        setV(0.5);
        setKind('sine');
        setPlaying(false);
      }}
      words={`With memory at ${r.toFixed(2)}, a pulse fades to 5% after about ${steps} steps.`}
      what={
        <>
          The Simple Cycle Reservoir comes from{' '}
          <a href="https://doi.org/10.1109/TNN.2010.2089641" rel="noopener">
            Rodan and Tino (2011)
          </a>
          . Units sit in a ring and every connection has the same weight. This is a toy on a made-up input, not the
          dissertation's data.
        </>
      }
      tryThis={['Drop Memory to 0.3 and watch the history strip forget quickly.', 'Choose "calm, then turbulent" and press Play.']}
      controls={
        <div class="ctl-grid three">
          <Slider label="Units" value={n} min={8} max={40} step={1} onChange={setN} />
          <Slider label="Memory" value={r} min={0.1} max={0.99} step={0.01} onChange={setR} format={(x) => x.toFixed(2)} />
          <Slider label="Input strength" value={v} min={0.1} max={1} step={0.05} onChange={setV} format={(x) => x.toFixed(2)} />
          <Seg
            label="Input"
            value={kind}
            options={[
              { value: 'sine', label: 'Sine wave' },
              { value: 'square', label: 'Square wave' },
              { value: 'regime', label: 'Calm, then turbulent' },
            ]}
            onChange={setKind}
          />
          <div class="btn-row" style={{ alignSelf: 'end', marginBottom: '16px' }}>
            {!reduce && (
              <button class="btn btn-primary" type="button" onClick={() => setPlaying(!playing)}>
                <Icon name={playing ? 'pause' : 'play'} size={16} /> {playing ? 'Pause' : 'Play'}
              </button>
            )}
            <button class="btn" type="button" onClick={advance}>
              <Icon name="step" size={16} /> Step
            </button>
          </div>
        </div>
      }
    >
      <div class="ring-wrap">
        <svg viewBox="-140 -140 280 280" class="svg-chart" role="img" aria-label={`A ring of ${n} units. Each unit's activation is shown by size and colour.`}>
          <circle r={R} fill="none" stroke="var(--rule)" />
          {x.map((a, i) => {
            const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
            return (
              <circle
                cx={Math.cos(ang) * R}
                cy={Math.sin(ang) * R}
                r={3 + Math.abs(a) * 10}
                fill={a >= 0 ? 'var(--series-1)' : 'var(--series-2)'}
                stroke={sg[i] > 0 ? 'none' : 'var(--ink)'}
                stroke-dasharray="2 2"
                opacity={0.35 + Math.abs(a) * 0.65}
              />
            );
          })}
          <text text-anchor="middle" y="4">
            t = {t}
          </text>
        </svg>
        <div class="history">
          <p class="small">
            <strong>History</strong>, last 100 steps by unit. Blue is positive, orange is negative. Units with a dashed edge have a minus sign.
          </p>
          <canvas ref={canvas} width={100} height={n} aria-hidden="true" style={{ aspectRatio: `100 / ${Math.max(n, 20)}` }} />
        </div>
      </div>
    </Frame>
  );
}

// ------------------------------------------------------------------ Figure 3
export function Gate() {
  const [turb, setTurb] = useUrlState('turb', 30, codecs.int(0, 100));
  const g = gateValue(turb);
  const mix = blend(g);
  const groups = [
    { label: 'Calm-market expert', w: CALM_EXPERT },
    { label: 'Turbulent-market expert', w: TURBULENT_EXPERT },
    { label: 'Blend', w: mix },
  ];
  const W = 640;
  const H = 220;
  const gw = (W - 40) / 3;
  const y = (v: number) => H - 40 - v * (H - 70) * 1.6;
  return (
    <Frame
      id="gate"
      num={3}
      title="A gate blending two experts"
      badge="concept"
      onReset={() => setTurb(30)}
      words={`The gate gives the turbulent-market expert a weight of ${fmtN(g, 2)}. The blend holds A ${fmtN(mix[0], 2)}, B ${fmtN(mix[1], 2)}, C ${fmtN(mix[2], 2)}, D ${fmtN(mix[3], 2)}.`}
      what="Every number in this figure is invented to show the mechanism. The blend is (1 minus g) times the calm expert's weights plus g times the turbulent expert's, where g comes from the logistic function."
      tryThis={['Drag the slider past 50 and watch the blend swing towards asset D.']}
      controls={<Slider label="How turbulent is the market?" value={turb} min={0} max={100} step={1} onChange={setTurb} />}
    >
      <p class="small soft">Every number in this figure is invented to show the mechanism.</p>
      <svg class="svg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Portfolio weights over assets A to D for each expert and the blend.">
        <line class="axis" x1="20" x2={W - 10} y1={y(0)} y2={y(0)} />
        {groups.map((gr, gi) => (
          <g>
            {gr.w.map((w, i) => {
              const bw = (gw - 30) / 4;
              const x = 30 + gi * gw + i * bw;
              return (
                <g>
                  <rect x={x} y={y(w)} width={bw - 4} height={y(0) - y(w)} fill={gi === 2 ? 'var(--accent)' : gi === 0 ? 'var(--series-1)' : 'var(--series-2)'} />
                  <text x={x + (bw - 4) / 2} y={y(0) + 16} text-anchor="middle">
                    {'ABCD'[i]}
                  </text>
                  <text x={x + (bw - 4) / 2} y={y(w) - 4} text-anchor="middle">
                    {w.toFixed(2)}
                  </text>
                </g>
              );
            })}
            <text x={30 + gi * gw + (gw - 30) / 2} y={H - 6} text-anchor="middle" style={{ fill: 'var(--ink)' }}>
              {gr.label}
            </text>
          </g>
        ))}
      </svg>
    </Frame>
  );
}

// ------------------------------------------------------------------ Figure 4
export function Training() {
  const [mode, setMode] = useUrlState<'predict' | 'decision'>('training', 'predict', codecs.str(['predict', 'decision'] as const));
  const steps = mode === 'predict' ? ['Data', 'Forecast', 'Portfolio'] : ['Data', 'Portfolio', 'Outcome'];
  const scoredAt = mode === 'predict' ? 1 : 2;
  const line =
    mode === 'predict'
      ? 'The model is rewarded for forecasts that are close, whether or not they lead to good holdings'
      : 'The model is rewarded for holdings that turn out well, which is the thing that matters';
  return (
    <Frame
      id="training"
      num={4}
      title="Predict first, or train on the decision"
      badge="concept"
      onReset={() => setMode('predict')}
      words={`${mode === 'predict' ? 'Predict, then decide' : 'Decision-focused'}: the score is taken at the ${steps[scoredAt].toLowerCase()}. ${line}.`}
      what="Two ways to train a portfolio model, with no numbers. The difference is where the score is taken."
      tryThis={['Switch between the two and watch where the score moves.']}
      controls={
        <Seg
          label="Training"
          value={mode}
          options={[
            { value: 'predict', label: 'Predict, then decide' },
            { value: 'decision', label: 'Decision-focused' },
          ]}
          onChange={setMode}
        />
      }
    >
      <ol class="arch" style={{ listStyle: 'none', padding: 0 }}>
        {steps.map((s, i) => (
          <li class={`arch-block${i === scoredAt ? ' signal' : ''}`} style={{ cursor: 'default' }}>
            <strong>{s}</strong>
            {i === scoredAt && <span class="small">Score taken here</span>}
          </li>
        ))}
      </ol>
      <p style={{ marginTop: '14px' }}>{line}.</p>
    </Frame>
  );
}

// ------------------------------------------------------------------ Figure 5
const VARIANTS = 13;
const UNIVERSES = 2;
const SEEDS = 5;

export function Discipline() {
  const [cell, setCell] = useState<number | null>(null);
  const [end, setEnd] = useState(55);
  const [blocked, setBlocked] = useState(false);
  const [size, setSize] = useState(200);
  const [experts, setExperts] = useState(3);
  const [seed, setSeed] = useState(1);
  const [id, setId] = useState('');
  useEffect(() => {
    let live = true;
    runId({ reservoirSize: size, experts, seed }).then((x) => live && setId(x));
    return () => {
      live = false;
    };
  }, [size, experts, seed]);
  const LOCK = 80;
  const cellText =
    cell === null
      ? 'Point at a cell to see which run it is.'
      : `Variant ${(cell % VARIANTS) + 1}, universe ${Math.floor(Math.floor(cell / VARIANTS) / SEEDS) + 1}, seed ${(Math.floor(cell / VARIANTS) % SEEDS) + 1}.`;
  return (
    <Frame
      id="discipline"
      num={5}
      title="Experimental discipline"
      badge="concept"
      onReset={() => {
        setCell(null);
        setEnd(55);
        setBlocked(false);
        setSize(200);
        setExperts(3);
        setSeed(1);
      }}
      words={blocked ? 'Blocked. The holdout is firewalled in code.' : `13 variants, 2 universes, 5 seeds: 130 runs. ${cellText}`}
      what="Three practices from the dissertation, each shown on its own. No cell, window or run id shows a result."
      tryThis={['Drag the training window into the locked segment.', 'Change the seed, then change it back, and compare the run ids.']}
    >
      <div class="disc-panels">
        <div>
          <h4>The run grid</h4>
          <div class="runs-grid" role="group" aria-label="130 runs: 13 variants by 10 universe and seed pairs">
            {Array.from({ length: VARIANTS * UNIVERSES * SEEDS }, (_, i) => (
              <button
                type="button"
                class={`${Math.floor(i / VARIANTS) >= SEEDS ? 'u2' : ''}${cell === i ? ' on' : ''}`}
                aria-label={`Variant ${(i % VARIANTS) + 1}, universe ${Math.floor(Math.floor(i / VARIANTS) / SEEDS) + 1}, seed ${(Math.floor(i / VARIANTS) % SEEDS) + 1}`}
                onMouseEnter={() => setCell(i)}
                onFocus={() => setCell(i)}
              />
            ))}
          </div>
          <p class="small" aria-live="polite" style={{ marginTop: '8px' }}>
            {cellText}
          </p>
        </div>
        <div>
          <h4>The holdout firewall</h4>
          <div class="firewall" aria-hidden="true">
            <div class="firewall-train" style={{ width: `${end}%` }} />
            <div class="firewall-lock">
              <Icon name="lock" size={18} />
            </div>
          </div>
          <label class="visually-hidden" for="fw">
            End of the training window
          </label>
          <input
            id="fw"
            type="range"
            min={10}
            max={100}
            value={end}
            onInput={(e) => {
              const want = Number((e.target as HTMLInputElement).value);
              setBlocked(want > LOCK);
              setEnd(Math.min(LOCK, want));
            }}
            aria-valuetext={`Training window ends at ${end}% of the timeline`}
          />
          <p class="small" aria-live="polite">
            {blocked ? (
              <span class="state state-warn">
                <Icon name="lock" size={14} /> Blocked. The holdout is firewalled in code.
              </span>
            ) : (
              'Drag the end of the training window to the right.'
            )}
          </p>
        </div>
        <div>
          <h4>The run registry</h4>
          <div class="field">
            <label for="rr-size">Reservoir size</label>
            <input id="rr-size" type="number" min={10} max={2000} value={size} onInput={(e) => setSize(Number((e.target as HTMLInputElement).value) || 0)} />
          </div>
          <div class="field">
            <label for="rr-exp">Number of experts</label>
            <input id="rr-exp" type="number" min={1} max={12} value={experts} onInput={(e) => setExperts(Number((e.target as HTMLInputElement).value) || 0)} />
          </div>
          <div class="field">
            <label for="rr-seed">Seed</label>
            <input id="rr-seed" type="number" min={0} max={9999} value={seed} onInput={(e) => setSeed(Number((e.target as HTMLInputElement).value) || 0)} />
          </div>
          <p class="small">
            Run id: <code aria-live="polite">{id || 'computing'}</code>
          </p>
          <p class="small soft">The first 10 characters of a SHA-256 hash of the settings. Same settings always give the same id.</p>
        </div>
      </div>
    </Frame>
  );
}
