// Section 11: Figure 1 (the matcher) and Figure 2 (tune the costs). Engine unchanged.
import { useMemo, useState } from 'preact/hooks';
import { matchDetail, MATCHER_CONFIG, type AlignOp, type MatchFlags } from '../lib/fuzzyMatcher';
import { computeEdit } from '../lib/levenshtein';
import { Frame, Slider, useUrlState, codecs } from './shared/ui';

const ENTRIES = [
  'select approval database',
  'update manager hierarchy rule',
  'delete expense escalation rule',
  'create routing list for managers',
  'approval rule for purchase orders',
  'receive approval notification settings',
  'manager approval delegation policy',
];

const EXAMPLES = [
  { label: 'Typo', q: 'recive aproval notification', target: 5 },
  { label: 'Swapped words', q: 'approval select database', target: 0 },
  { label: 'Missing word', q: 'approval database', target: 0 },
  { label: 'Unrelated words', q: 'approval zebra umbrella xylophone quasar', target: 0 },
];

/** Interface names for the engine's labels (section 11.5). */
const typeName: Record<AlignOp['type'], string> = {
  exact: 'exact',
  typo: 'typo',
  swapped: 'swapped',
  inserted: 'extra',
  deleted: 'missing',
  foreign: 'unrelated',
};

const DEFAULT_COSTS = {
  typoCost: MATCHER_CONFIG.typoCost,
  transpositionCost: MATCHER_CONFIG.transpositionCost,
  gapCost: MATCHER_CONFIG.gapCost,
  mismatchCost: MATCHER_CONFIG.mismatchCost,
  foreignPenalty: MATCHER_CONFIG.foreignPenalty,
};

const words = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

function describe(ops: AlignOp[]): string {
  const c = (t: AlignOp['type']) => ops.filter((o) => o.type === t).length;
  const parts: string[] = [];
  const typo = c('typo');
  if (typo) parts.push(`${words[typo] ?? typo} ${typo === 1 ? 'word is' : 'words are'} misspelt.`);
  if (c('swapped')) parts.push(`${words[c('swapped')]} pair of words ${c('swapped') === 1 ? 'is' : 'are'} swapped.`);
  if (c('inserted')) parts.push(`${words[c('inserted')] ?? c('inserted')} ${c('inserted') === 1 ? 'word is' : 'words are'} missing from the search.`);
  if (c('deleted')) parts.push(`${words[c('deleted')] ?? c('deleted')} search ${c('deleted') === 1 ? 'word has' : 'words have'} no match in the entry.`);
  if (c('foreign')) parts.push(`${words[c('foreign')] ?? c('foreign')} search ${c('foreign') === 1 ? 'word is' : 'words are'} unrelated.`);
  if (!parts.length) parts.push('Every word matches exactly.');
  return parts.join(' ');
}

export default function Matcher() {
  const [q, setQ] = useUrlState('q', 'select aproval database', codecs.str());
  const [typo, setTypo] = useUrlState('typo', true, codecs.bool());
  const [swap, setSwap] = useUrlState('swap', true, codecs.bool());
  const [pen, setPen] = useUrlState('pen', true, codecs.bool());
  const [selIdx, setSelIdx] = useUrlState<number>('sel', -1, codecs.int(0, 50));
  const [extra, setExtra] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [typoFocus, setTypoFocus] = useState<number | null>(null);
  const [costs, setCosts] = useState(DEFAULT_COSTS);

  const entries = [...ENTRIES, ...extra];
  const flags: MatchFlags = { typo, transpose: swap, foreign: pen };

  const ranked = useMemo(
    () =>
      entries
        .map((e, i) => ({ i, e, d: matchDetail(q, e, flags) }))
        .sort((a, b) => b.d.score - a.d.score || a.i - b.i),
    [q, typo, swap, pen, extra],
  );
  const cfg = { ...MATCHER_CONFIG, ...costs };
  const rankedCosts = useMemo(
    () =>
      entries
        .map((e, i) => ({ i, e, d: matchDetail(q, e, flags, cfg) }))
        .sort((a, b) => b.d.score - a.d.score || a.i - b.i),
    [q, typo, swap, pen, extra, costs],
  );

  const selected = selIdx >= 0 && selIdx < entries.length ? selIdx : ranked[0].i;
  const detail = ranked.find((r) => r.i === selected)!.d;
  const best = ranked[0];

  const reset = () => {
    setQ('select aproval database');
    setTypo(true);
    setSwap(true);
    setPen(true);
    setSelIdx(-1);
    setTypoFocus(null);
  };

  const typoOp = typoFocus !== null ? detail.ops[typoFocus] : null;
  const edit = typoOp?.queryWord && typoOp.candWord ? computeEdit(typoOp.queryWord, typoOp.candWord) : null;
  const pathSet = new Set(detail.path.map((p) => `${p.i},${p.j}`));

  const fmtCost = (v: number) => v.toFixed(2);

  return (
    <>
      <Frame
        id="matcher"
        num={1}
        title="The matcher"
        badge="reconstruction"
        onReset={reset}
        words={
          q.trim()
            ? `Best match: ${best.e}, score ${best.d.score}. ${describe(best.d.ops)}`
            : 'Type a search to rank the entries.'
        }
        what="A ranked list of approval-rule entries for your search, with the word-by-word alignment for the selected entry and the cost table the score comes from."
        tryThis={[
          'Press Unrelated words, then turn off the penalty for unrelated words.',
          'Press Swapped words and read the alignment chips.',
          'Focus a typo chip to see the letter-by-letter edits.',
        ]}
        controls={
          <>
            <div class="field">
              <label for="mt-q">Search for a rule</label>
              <input id="mt-q" type="search" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} autocomplete="off" />
            </div>
            <div class="chips" role="group" aria-label="Examples">
              {EXAMPLES.map((x) => (
                <button
                  class="chip"
                  type="button"
                  aria-pressed={q === x.q}
                  onClick={() => {
                    setQ(x.q);
                    setSelIdx(x.target);
                    setTypoFocus(null);
                  }}
                >
                  {x.label}
                </button>
              ))}
            </div>
            <div class="btn-row" style={{ marginTop: '8px' }}>
              <label class="check">
                <input type="checkbox" role="switch" checked={typo} onChange={() => setTypo(!typo)} />
                Typo tolerance
              </label>
              <label class="check">
                <input type="checkbox" role="switch" checked={swap} onChange={() => setSwap(!swap)} />
                Swapped words
              </label>
              <label class="check">
                <input type="checkbox" role="switch" checked={pen} onChange={() => setPen(!pen)} />
                Penalty for unrelated words
              </label>
            </div>
          </>
        }
      >
        <ol class="mt-results" aria-label="Entries ranked by score">
          {ranked.map((r) => (
            <li>
              <button class="mt-entry" type="button" aria-pressed={r.i === selected} onClick={() => setSelIdx(r.i)}>
                <span>{r.e}</span>
                <span class="bar-track" aria-hidden="true">
                  <span class="bar-fill" style={{ width: `${r.d.score}%` }} />
                </span>
                <span class="num" aria-label={`score ${r.d.score}`}>
                  {r.d.score}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <form
          class="btn-row"
          style={{ margin: '8px 0 20px' }}
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) {
              setExtra([...extra, draft.trim().toLowerCase()]);
              setDraft('');
            }
          }}
        >
          <label class="visually-hidden" for="mt-add">
            Add an entry
          </label>
          <input id="mt-add" type="text" placeholder="Add an entry for this visit" value={draft} onInput={(e) => setDraft((e.target as HTMLInputElement).value)} style={{ flex: '1 1 220px', width: 'auto' }} />
          <button class="btn" type="submit">
            Add entry
          </button>
        </form>
        <h4>Alignment with "{entries[selected]}"</h4>
        <div class="mt-chips">
          {detail.ops.map((op, i) => (
            <button
              type="button"
              class={`mt-chip t-${typeName[op.type]}`}
              onFocus={() => op.type === 'typo' && setTypoFocus(i)}
              onClick={() => op.type === 'typo' && setTypoFocus(i)}
              aria-label={`${op.queryWord ?? ''} ${op.candWord ? `to ${op.candWord}` : ''}: ${typeName[op.type]}`}
            >
              <span>{op.queryWord ?? '·'}{op.candWord && op.candWord !== op.queryWord ? ` → ${op.candWord}` : ''}</span>
              <small>{typeName[op.type]}</small>
            </button>
          ))}
        </div>
        {edit && typoOp && (
          <div class="pb-panel" style={{ marginTop: 0, marginBottom: '16px' }}>
            <p class="small">
              <strong>Typo detail:</strong> "{typoOp.queryWord}" to "{typoOp.candWord}" takes {edit.distance} character {edit.distance === 1 ? 'edit' : 'edits'}.
            </p>
            <div class="table-wrap">
              <table class="mt-matrix" aria-label="Character edit table">
                <thead>
                  <tr>
                    <th />
                    <th>·</th>
                    {[...typoOp.candWord!].map((ch) => (
                      <th>{ch}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {edit.matrix.map((row, i) => (
                    <tr>
                      <th>{i === 0 ? '·' : typoOp.queryWord![i - 1]}</th>
                      {row.map((v, j) => (
                        <td class={edit.path.some((p) => p.i === i && p.j === j) ? 'path' : ''}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p class="small">
          <strong>Cost table,</strong> search words down the side, entry words across the top. The marked cells are the cheapest path.
        </p>
        <div class="table-wrap" tabIndex={0} aria-label="Word cost table">
          <table class="mt-matrix">
            <thead>
              <tr>
                <th />
                <th>·</th>
                {detail.candidate.map((w) => (
                  <th>{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.matrix.map((row, i) => (
                <tr>
                  <th>{i === 0 ? '·' : detail.query[i - 1]}</th>
                  {row.map((v, j) => (
                    <td class={pathSet.has(`${i},${j}`) ? 'path' : ''}>{v.toFixed(2)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Frame>

      <Frame
        id="costs"
        num={2}
        title="Tune the costs"
        badge="reconstruction"
        onReset={() => setCosts(DEFAULT_COSTS)}
        words={`With these costs the best match for "${q}" is ${rankedCosts[0].e}, score ${rankedCosts[0].d.score}.`}
        what="The five costs the engine adds up. The ranked list beside them uses the search from Figure 1 and re-ranks as you move the sliders."
        tryThis={['Drag the unrelated-word penalty to 0 with the Unrelated words example loaded.', 'Make a typo cost as much as a different word.']}
      >
        <div class="ctl-grid two">
          <div>
            <Slider label="Typo" hint="Cost of a word that is nearly right" value={costs.typoCost} min={0} max={1} step={0.05} onChange={(v) => setCosts({ ...costs, typoCost: v })} format={fmtCost} />
            <Slider label="Swapped pair" hint="Cost of two neighbouring words in the wrong order" value={costs.transpositionCost} min={0} max={1} step={0.05} onChange={(v) => setCosts({ ...costs, transpositionCost: v })} format={fmtCost} />
            <Slider label="Missing or extra word" hint="Cost of a word present on one side only" value={costs.gapCost} min={0} max={1} step={0.05} onChange={(v) => setCosts({ ...costs, gapCost: v })} format={fmtCost} />
            <Slider label="Different word" hint="Cost of lining up two words that do not match" value={costs.mismatchCost} min={0.5} max={2} step={0.05} onChange={(v) => setCosts({ ...costs, mismatchCost: v })} format={fmtCost} />
            <Slider label="Unrelated word" hint="Penalty for a search word that resembles nothing in the entry" value={costs.foreignPenalty} min={0} max={3} step={0.05} onChange={(v) => setCosts({ ...costs, foreignPenalty: v })} format={fmtCost} />
            <button class="btn" type="button" onClick={() => setCosts(DEFAULT_COSTS)}>
              Restore defaults
            </button>
          </div>
          <div>
            <p class="small soft">Search: "{q}"</p>
            <ol class="mt-results" aria-label="Entries ranked with these costs">
              {rankedCosts.map((r) => (
                <li class="bar-row" style={{ minHeight: '36px' }}>
                  <span>{r.e}</span>
                  <span class="bar-track" aria-hidden="true">
                    <span class="bar-fill" style={{ width: `${r.d.score}%` }} />
                  </span>
                  <span class="num">{r.d.score}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <p class="small">Score = 100 times (1 minus total cost divided by the number of words in the longer text)</p>
        <p class="small soft">A word counts as a typo when at most about a third of its letters differ.</p>
        <p class="small soft">Only search words of five letters or more can count as unrelated, so short words such as 'for' stay cheap.</p>
      </Frame>
    </>
  );
}
