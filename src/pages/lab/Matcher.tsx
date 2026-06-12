import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { DemoChrome } from '../../components/DemoChrome';
import { levenshteinMatrix } from '../../lib/levenshtein';
import {
  matchDetail,
  type MatchFlags,
  type AlignType,
  type AlignOp,
  DEFAULT_FLAGS,
} from '../../lib/fuzzyMatcher';

interface Entry {
  id: number;
  text: string;
}

const DEFAULT_ENTRIES: string[] = [
  'select approval database',
  'update manager hierarchy rule',
  'delete expense escalation rule',
  'create routing list for managers',
  'approval rule for purchase orders',
  'receive approval notification settings',
  'manager approval delegation policy',
];

const CHIP: Record<AlignType, { label: string; className: string }> = {
  exact: { label: 'exact', className: 'border-live/50 text-live' },
  typo: { label: 'typo', className: 'border-sky-400/50 text-sky-400' },
  swapped: { label: 'swapped', className: 'border-planned/50 text-planned' },
  inserted: { label: 'inserted', className: 'border-line text-muted' },
  deleted: { label: 'deleted', className: 'border-line text-muted' },
  foreign: { label: 'foreign', className: 'border-sell/50 text-sell' },
};

const PRESETS: { label: string; query: string; target: string }[] = [
  { label: 'Typo', query: 'recive aproval notification', target: 'receive approval notification settings' },
  { label: 'Swapped words', query: 'approval select database', target: 'select approval database' },
  { label: 'Missing word', query: 'approval database', target: 'select approval database' },
  { label: 'Foreign words', query: 'approval zebra umbrella xylophone quasar', target: 'select approval database' },
];

function CharMatrixTooltip({ a, b }: { a: string; b: string }) {
  const matrix = levenshteinMatrix(a, b);
  return (
    <span className="absolute bottom-full left-0 z-30 mb-1 rounded-md border border-line bg-bg p-2 shadow-xl">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted/70">
        char distance: {matrix[a.length][b.length]}
      </span>
      <table className="border-collapse font-mono text-[10px]">
        <tbody>
          <tr>
            <td className="h-4 w-4" />
            <td className="h-4 w-4 text-center text-muted/50">ε</td>
            {Array.from(b).map((ch, j) => (
              <td key={j} className="h-4 w-4 text-center text-muted">
                {ch}
              </td>
            ))}
          </tr>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="h-4 w-4 text-center text-muted">{i === 0 ? 'ε' : a[i - 1]}</td>
              {row.map((v, j) => (
                <td key={j} className="h-4 w-4 border border-line/40 text-center text-fg">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </span>
  );
}

function AlignChip({ op }: { op: AlignOp }) {
  const [hover, setHover] = useState(false);
  const c = CHIP[op.type];
  const label =
    op.type === 'swapped'
      ? `${op.queryWord} ⇄`
      : op.type === 'inserted'
        ? `+${op.candWord}`
        : op.type === 'deleted'
          ? `−${op.queryWord}`
          : op.queryWord;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-xs ${c.className}`}>
        {label}
        <span className="text-[9px] uppercase tracking-wider opacity-70">{c.label}</span>
        {op.type === 'typo' && <span className="opacity-70">d{op.charDist}</span>}
      </span>
      {op.type === 'typo' && hover && op.queryWord && op.candWord && (
        <CharMatrixTooltip a={op.queryWord} b={op.candWord} />
      )}
    </span>
  );
}

function Breakdown({ query, candidate }: { query: string; candidate: string }) {
  const detail = useMemo(() => matchDetail(query, candidate), [query, candidate]);
  const pathSet = new Set(detail.path.map((p) => `${p.i},${p.j}`));

  return (
    <div className="mt-4 rounded-lg border border-line bg-bg/40 p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {detail.ops.map((op, i) => (
          <AlignChip key={i} op={op} />
        ))}
      </div>
      <div className="overflow-auto">
        <table className="border-collapse font-mono text-[11px]">
          <tbody>
            <tr>
              <td className="h-7 w-16" />
              <td className="h-7 w-12 text-center text-muted/50">ε</td>
              {detail.candidate.map((w, j) => (
                <td key={j} className="h-7 w-12 max-w-12 truncate px-1 text-center text-muted">
                  {w}
                </td>
              ))}
            </tr>
            {detail.matrix.map((row, i) => (
              <tr key={i}>
                <td className="h-7 w-16 truncate pr-1 text-right text-muted">
                  {i === 0 ? 'ε' : detail.query[i - 1]}
                </td>
                {row.map((v, j) => {
                  const onPath = pathSet.has(`${i},${j}`);
                  return (
                    <td
                      key={j}
                      className={`h-7 w-12 border border-line/40 text-center ${
                        onPath ? 'bg-live/20 text-live' : 'text-muted'
                      }`}
                    >
                      {Number.isInteger(v) ? v : v.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-muted">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 rounded-full border transition-colors ${
          on ? 'border-live/60 bg-live/20' : 'border-line bg-bg'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
            on ? 'left-4 bg-live' : 'left-0.5 bg-muted'
          }`}
        />
      </button>
      {label}
    </label>
  );
}

export default function Matcher() {
  const [query, setQuery] = useState('select aproval database');
  const [entries, setEntries] = useState<Entry[]>(
    DEFAULT_ENTRIES.map((text, id) => ({ id, text })),
  );
  const [flags, setFlags] = useState<MatchFlags>(DEFAULT_FLAGS);
  const [selectedId, setSelectedId] = useState<number | null>(0);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const ranked = useMemo(() => {
    return entries
      .map((e) => ({ entry: e, score: matchDetail(query, e.text, flags).score }))
      .sort((a, b) => b.score - a.score);
  }, [entries, query, flags]);

  const setEntryText = (id: number, text: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, text } : e)));

  const runPreset = (preset: (typeof PRESETS)[number]) => {
    setQuery(preset.query);
    const target = entries.find((e) => e.text === preset.target);
    if (target) {
      setSelectedId(target.id);
      setHighlightId(target.id);
      window.setTimeout(() => setHighlightId(null), 1600);
    }
  };

  const selected = entries.find((e) => e.id === selectedId);

  return (
    <DemoChrome labId="matcher">
      <p className="-mt-2 mb-6 max-w-3xl font-mono text-xs leading-relaxed text-muted">
        Clean-room reconstruction of a matcher I built at Oracle for approval-rule search. The
        original code is Oracle internal; this reimplementation reproduces the approach.
      </p>

      <label className="block">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">Query</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search query"
          className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-muted"
        />
      </label>

      {/* Mechanism toggles + presets */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4">
          <Toggle label="typo tolerance" on={flags.typo} onChange={(v) => setFlags((f) => ({ ...f, typo: v }))} />
          <Toggle label="transpositions" on={flags.transpose} onChange={(v) => setFlags((f) => ({ ...f, transpose: v }))} />
          <Toggle label="foreign penalty" on={flags.foreign} onChange={(v) => setFlags((f) => ({ ...f, foreign: v }))} />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => runPreset(p)}
              className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-muted hover:border-muted hover:text-fg"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ranked database */}
      <div className="mt-6 space-y-2">
        {ranked.map(({ entry, score }) => (
          <motion.div
            key={entry.id}
            layout
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-3 rounded-lg border p-2 ${
              highlightId === entry.id
                ? 'border-live bg-live/10'
                : selectedId === entry.id
                  ? 'border-muted/50 bg-surface/60'
                  : 'border-line bg-surface/40'
            }`}
          >
            <input
              value={entry.text}
              onChange={(e) => setEntryText(entry.id, e.target.value)}
              aria-label={`Candidate entry ${entry.id + 1}`}
              className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 py-1 font-mono text-sm text-fg outline-none hover:border-line focus:border-muted"
            />
            <button
              type="button"
              onClick={() => setSelectedId(entry.id)}
              className="flex w-40 shrink-0 items-center gap-2"
              aria-label={`Show score breakdown for entry ${entry.id + 1}`}
            >
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                <span className="block h-full rounded-full bg-live" style={{ width: `${score}%` }} />
              </span>
              <span className="w-8 text-right font-mono text-sm text-fg">{score}</span>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Score breakdown */}
      {selected && (
        <div className="mt-8">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
            Alignment: &quot;{query}&quot; vs &quot;{selected.text}&quot;
          </h2>
          <Breakdown query={query} candidate={selected.text} />
        </div>
      )}
    </DemoChrome>
  );
}
