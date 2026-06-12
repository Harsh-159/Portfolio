import { useEffect, useMemo, useRef, useState } from 'react';
import { DemoChrome, HonestyBadge } from '../../components/DemoChrome';
import {
  trainCharBPE,
  applyLearnedMerges,
  applyByteLevelBPE,
  buildAncestry,
  isValidTokenizerFile,
  tokenizeStats,
  type Merge,
  type Token,
  type AncestryNode,
  type TokenizerFile,
} from '../../lib/bpe';

const DEFAULT_CORPUS = `Once there was a small red fox named Pip. Pip liked to run by the river and watch the fish jump. One day Pip found a shiny blue stone near the old oak tree. The stone felt warm and it made Pip smile. Pip wanted to share the stone, so he ran to find his friend, a kind grey rabbit named Tum. Tum saw the stone and grinned. They sat by the river and watched the sun go down. The sky turned pink and gold, and the fish kept jumping. Pip and Tum were glad to be friends, and they went home as the first stars came out.`;

const DEFAULT_TOKENIZE = 'the fox sat by the river';

/** Stable, distinct colour per token id (light text on a tinted background). */
function tokenStyle(id: number) {
  const hue = (id * 47) % 360;
  return {
    backgroundColor: `hsl(${hue} 42% 26%)`,
    borderColor: `hsl(${hue} 42% 42%)`,
  };
}

function AncestryTree({ node, depth = 0 }: { node: AncestryNode; depth?: number }) {
  return (
    <div style={{ paddingLeft: depth === 0 ? 0 : 12 }}>
      <span className="font-mono text-xs" style={{ whiteSpace: 'pre' }}>
        {depth > 0 && <span className="text-muted/50">└ </span>}
        <span className={node.children ? 'text-fg' : 'text-live'}>{node.text || '␣'}</span>
      </span>
      {node.children && (
        <div>
          <AncestryTree node={node.children[0]} depth={depth + 1} />
          <AncestryTree node={node.children[1]} depth={depth + 1} />
        </div>
      )}
    </div>
  );
}

function TokenChip({ token, merges }: { token: Token; merges: Merge[] }) {
  const [hover, setHover] = useState(false);
  const tree = useMemo(
    () => (hover ? buildAncestry(token.text, merges) : null),
    [hover, token.text, merges],
  );

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span
        className="inline-block rounded border px-1.5 py-0.5 font-mono text-sm text-fg"
        style={{ ...tokenStyle(token.id), whiteSpace: 'pre' }}
      >
        {token.text === ' ' ? '␣' : token.text}
      </span>
      {hover && tree && (
        <span className="absolute bottom-full left-0 z-20 mb-1 min-w-[120px] rounded-md border border-line bg-bg p-2 shadow-xl">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted/70">
            merge ancestry
          </span>
          <AncestryTree node={tree} />
        </span>
      )}
    </span>
  );
}

function TrainPanel({
  corpus,
  setCorpus,
  numMerges,
  setNumMerges,
}: {
  corpus: string;
  setCorpus: (v: string) => void;
  numMerges: number;
  setNumMerges: (v: number) => void;
}) {
  const result = useMemo(() => trainCharBPE(corpus, numMerges), [corpus, numMerges]);
  const total = result.steps.length;

  // `step` = number of merges applied so far (0..total).
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(6); // steps per second

  // Reset replay whenever the training inputs change.
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [corpus, numMerges]);

  useEffect(() => {
    if (!playing) return;
    if (step >= total) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => Math.min(s + 1, total)), 1000 / speed);
    return () => clearTimeout(id);
  }, [playing, step, total, speed]);

  const sequence = step < total ? result.steps[step].before : result.finalSequence;
  const current = step < total ? result.steps[step] : null;
  const highlight = new Set(current ? current.positions : []);
  const completed = result.merges.slice(0, step);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Controls */}
      <div className="space-y-4">
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">Corpus</span>
          <textarea
            value={corpus}
            onChange={(e) => setCorpus(e.target.value.slice(0, 2000))}
            rows={7}
            spellCheck={false}
            aria-label="Training corpus"
            className="mt-1 w-full resize-y rounded-md border border-line bg-bg p-3 font-mono text-sm text-fg outline-none focus:border-muted"
          />
          <span className="font-mono text-[11px] text-muted/60">{corpus.length} / 2000 chars</span>
        </label>

        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Merge budget: {numMerges}
          </span>
          <input
            type="range"
            min={10}
            max={300}
            value={numMerges}
            onChange={(e) => setNumMerges(Number(e.target.value))}
            aria-label="Merge budget"
            className="mt-1 w-full accent-[var(--color-live)]"
          />
        </label>

        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Replay speed: {speed}/s
          </span>
          <input
            type="range"
            min={1}
            max={30}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="Replay speed"
            className="mt-1 w-full accent-[var(--color-live)]"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={total === 0}
            className="rounded-md bg-live px-3 py-1.5 font-mono text-sm font-semibold text-bg disabled:opacity-40"
          >
            {playing ? 'Pause' : 'Auto-play'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setStep((s) => Math.min(s + 1, total));
            }}
            disabled={step >= total}
            className="rounded-md border border-line px-3 py-1.5 font-mono text-sm text-fg disabled:opacity-40"
          >
            Step
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setStep(total);
            }}
            disabled={step >= total}
            className="rounded-md border border-line px-3 py-1.5 font-mono text-sm text-fg disabled:opacity-40"
          >
            Train to end
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
        </div>

        <p className="font-mono text-xs text-muted">
          {step} / {total} merges applied
          {total === 0 && ': corpus has no repeating pairs yet'}
        </p>
      </div>

      {/* Visualisation */}
      <div className="space-y-4">
        <div className="rounded-md border border-line bg-bg/40 p-3">
          <div className="mb-2 flex items-center justify-between font-mono text-xs text-muted">
            <span>sequence ({sequence.length} tokens)</span>
            {current && (
              <span className="text-live">
                next merge: &quot;{current.pair[0]}&quot;+&quot;{current.pair[1]}&quot; ×{current.count}
              </span>
            )}
          </div>
          <div className="flex max-h-56 flex-wrap gap-0.5 overflow-auto">
            {sequence.map((sym, i) => {
              const isPair = highlight.has(i) || highlight.has(i - 1);
              return (
                <span
                  key={i}
                  className={`rounded px-1 py-0.5 font-mono text-xs ${
                    isPair ? 'bg-live/25 text-live' : 'bg-surface text-muted'
                  }`}
                  style={{ whiteSpace: 'pre' }}
                >
                  {sym === ' ' ? '␣' : sym}
                </span>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-line bg-bg/40 p-3">
          <div className="mb-2 font-mono text-xs text-muted">merge table</div>
          <div className="max-h-56 overflow-auto">
            <table className="w-full font-mono text-xs">
              <thead className="text-muted/60">
                <tr className="text-left">
                  <th className="pb-1 font-normal">rank</th>
                  <th className="pb-1 font-normal">pair</th>
                  <th className="pb-1 font-normal">new token</th>
                </tr>
              </thead>
              <tbody>
                {completed.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-2 text-muted/50">
                      no merges yet
                    </td>
                  </tr>
                )}
                {completed.map((m, i) => (
                  <tr key={i} className="text-fg">
                    <td className="py-0.5 text-muted">{i + 1}</td>
                    <td className="py-0.5" style={{ whiteSpace: 'pre' }}>
                      {m[0]} + {m[1]}
                    </td>
                    <td className="py-0.5 text-live" style={{ whiteSpace: 'pre' }}>
                      {m[0] + m[1]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TokenizePanel({
  merges,
  realTokenizer,
}: {
  merges: Merge[];
  realTokenizer: TokenizerFile | null;
}) {
  const [text, setText] = useState(DEFAULT_TOKENIZE);
  const [useReal, setUseReal] = useState(false);

  const activeMerges = useReal && realTokenizer ? realTokenizer.merges : merges;
  const tokens = useMemo(
    () =>
      useReal && realTokenizer
        ? applyByteLevelBPE(text, realTokenizer.merges)
        : applyLearnedMerges(text, merges),
    [text, useReal, realTokenizer, merges],
  );
  const stats = tokenizeStats(text, tokens);

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          Tokenize anything
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          spellCheck={false}
          aria-label="Text to tokenize"
          className="mt-1 w-full resize-y rounded-md border border-line bg-bg p-3 font-mono text-sm text-fg outline-none focus:border-muted"
        />
      </label>

      {realTokenizer && (
        <label className="flex items-center gap-2 font-mono text-sm text-muted">
          <input
            type="checkbox"
            checked={useReal}
            onChange={(e) => setUseReal(e.target.checked)}
            className="accent-[var(--color-live)]"
          />
          Use my real tokenizer (byte-level, trained on TinyStories V2-GPT4)
        </label>
      )}

      <div className="flex flex-wrap gap-3 font-mono text-sm">
        <span className="rounded border border-line px-2 py-1 text-muted">
          tokens <span className="text-fg">{stats.tokenCount}</span>
        </span>
        <span className="rounded border border-line px-2 py-1 text-muted">
          chars <span className="text-fg">{stats.charCount}</span>
        </span>
        <span className="rounded border border-line px-2 py-1 text-muted">
          chars/token <span className="text-fg">{stats.compression.toFixed(2)}</span>
        </span>
      </div>

      <div className="rounded-md border border-line bg-bg/40 p-3">
        <div className="mb-2 font-mono text-xs text-muted">
          {tokens.length === 0 ? 'type something above' : 'hover a chip for its merge ancestry'}
        </div>
        <div className="flex flex-wrap gap-1">
          {tokens.map((t, i) => (
            <TokenChip key={i} token={t} merges={activeMerges} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Tokenizer() {
  const [corpus, setCorpus] = useState(DEFAULT_CORPUS);
  const [numMerges, setNumMerges] = useState(80);
  const [mode, setMode] = useState<'train' | 'tokenize'>('train');
  const [realTokenizer, setRealTokenizer] = useState<TokenizerFile | null>(null);
  const fetched = useRef(false);

  const merges = useMemo(() => trainCharBPE(corpus, numMerges).merges, [corpus, numMerges]);

  // Try to load the exported real tokenizer; silently ignore if absent.
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch('/lab/tokenizer/tokenizer.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && isValidTokenizerFile(data)) setRealTokenizer(data);
      })
      .catch(() => {});
  }, []);

  return (
    <DemoChrome labId="tokenizer">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-line p-0.5">
          {(['train', 'tokenize'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1.5 font-mono text-sm capitalize transition-colors ${
                mode === m ? 'bg-live text-bg' : 'text-muted hover:text-fg'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <HonestyBadge>
          Training demo runs character-level BPE for readability. My actual tokenizer is byte-level.
        </HonestyBadge>
      </div>

      {mode === 'train' ? (
        <TrainPanel
          corpus={corpus}
          setCorpus={setCorpus}
          numMerges={numMerges}
          setNumMerges={setNumMerges}
        />
      ) : (
        <TokenizePanel merges={merges} realTokenizer={realTokenizer} />
      )}
    </DemoChrome>
  );
}
