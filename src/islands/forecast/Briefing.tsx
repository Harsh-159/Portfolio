// Section 13.7: Figure 6, the briefing audit. A port of the project's validator runs on the text shown.
import { useMemo, useState } from 'preact/hooks';
import { audit, extractCitations, splitAuthors, formatLike, CITATION_RE, type EvidencePackage } from '../../lib/citations';
import { Frame, Seg, Icon, useUrlState, codecs } from '../shared/ui';
import { useData } from './data';

interface Brief {
  date: string;
  sections: { title: string; text: string }[];
  evidence: EvidencePackage & Record<string, { source_file: string; row_id?: string; row_ids?: unknown; fields: Record<string, unknown> }>;
  stored: { total: number; verified: number };
  anomaly: { title: string; text: string }[] | null;
}

const DATES = ['2026-03-14', '2026-03-15', '2026-03-21'] as const;
const DLABEL: Record<string, string> = { '2026-03-14': '14 Mar', '2026-03-15': '15 Mar', '2026-03-21': '21 Mar' };
const sentenceCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** Applies edits to cited values, and to the same number written just before the citation. */
function applyEdits(text: string, edits: Record<number, string>, offset: number): string {
  if (!Object.keys(edits).length) return text;
  let i = offset;
  let out = '';
  let last = 0;
  for (const m of text.matchAll(CITATION_RE)) {
    const idx = m.index!;
    let before = text.slice(last, idx);
    const e = edits[i];
    let cite = m[0];
    if (e !== undefined) {
      const val = m[4].trim();
      const pos = before.lastIndexOf(val);
      if (pos >= 0) before = before.slice(0, pos) + e + before.slice(pos + val.length);
      cite = cite.replace(new RegExp(`=\\s*${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]$`), `= ${e}]`);
    }
    out += before + cite;
    last = idx + m[0].length;
    i++;
  }
  return out + text.slice(last);
}

export default function Briefing() {
  const [date, setDate] = useUrlState<(typeof DATES)[number]>('brief', '2026-03-14', codecs.str(DATES));
  const [broken, setBroken] = useUrlState('broken', false, codecs.bool());
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [who, setWho] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const data = useData<Brief[]>('/data/forecast/briefings.json');
  const brief = data.status === 'ready' ? data.data.find((b) => b.date === date)! : null;

  // Citation index offsets per section, and the index of the first premium citation.
  const offsets = useMemo(() => {
    if (!brief) return [];
    let n = 0;
    return brief.sections.map((s) => {
      const o = n;
      n += extractCitations(s.text).length;
      return o;
    });
  }, [brief]);
  const premiumIdx = useMemo(() => {
    if (!brief) return -1;
    const all = extractCitations(brief.sections.map((s) => s.text).join('\n'));
    return all.findIndex((c) => c.column === 'signal_month_base');
  }, [brief]);

  const allEdits = useMemo(() => {
    if (!broken || premiumIdx < 0 || !brief) return edits;
    const c = extractCitations(brief.sections.map((s) => s.text).join('\n'))[premiumIdx];
    const val = Number(c.value);
    return { [premiumIdx]: date === '2026-03-14' ? '21.0' : (val + 3).toFixed(c.value.split('.')[1]?.length ?? 0), ...edits };
  }, [broken, edits, premiumIdx, brief, date]);

  const texts = brief ? brief.sections.map((s, si) => applyEdits(s.text, allEdits, offsets[si])) : [];
  const result = brief ? audit(texts.join('\n'), brief.evidence) : null;
  const bad = result ? result.rows.filter((r) => r.verdict !== 'VERIFIED') : [];
  const anomalyAudit = brief?.anomaly ? audit(brief.anomaly.map((a) => a.text).join('\n'), brief.evidence) : null;

  const reset = () => {
    setEdits({});
    setBroken(false);
    setActive(null);
    setEditing(null);
  };

  const auditLine = !result
    ? data.status === 'error'
      ? 'The data for this figure did not load.'
      : 'Loading data. Each stored run verifies 21 of 21 citations.'
    : bad.length === 0
      ? `${result.verified} of ${result.total} citations verified. Clean.`
      : `${result.verified} of ${result.total} verified. ${bad.length} ${bad.length === 1 ? 'mismatch' : 'mismatches'}: ${bad
          .map((b) => (b.actual === null ? `cited ${b.value}, not found in the evidence` : `cited ${b.value}, data says ${formatLike(b.actual, b.value)}`))
          .join('. ')}.`;

  // Which evidence row the active chip points at.
  const activeRow = active !== null && result ? result.rows[active] : null;

  const renderSentence = (text: string, startIdx: number) => {
    const parts: (string | { i: number; c: ReturnType<typeof extractCitations>[number] })[] = [];
    let last = 0;
    let i = startIdx;
    for (const c of extractCitations(text)) {
      parts.push(text.slice(last, c.start));
      parts.push({ i, c });
      last = c.end;
      i++;
    }
    parts.push(text.slice(last));
    return parts.map((p) => {
      if (typeof p === 'string') return p;
      const row = result?.rows[p.i];
      const ok = row?.verdict === 'VERIFIED';
      return (
        <>
          {editing === p.i ? (
            <input
              class="num-input"
              type="text"
              aria-label={`Cited value for ${p.c.column}`}
              value={p.c.value}
              autoFocus
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value.replace(/[\]\[]/g, '');
                const next = { ...edits };
                if (v.trim()) next[p.i] = v.trim();
                else delete next[p.i];
                setEdits(next);
              }}
              onBlur={() => setEditing(null)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && setEditing(null)}
            />
          ) : (
            <button class="num-edit" type="button" onClick={() => setEditing(p.i)} aria-label={`Edit cited value ${p.c.value} for ${p.c.column}`}>
              {p.c.value}
            </button>
          )}
          <button
            type="button"
            class={`cite-chip${ok ? '' : ' bad'}${active === p.i ? ' active' : ''}`}
            onClick={() => {
              setActive(p.i);
              document.getElementById(`ev-${p.c.file}-${p.c.column}`)?.scrollIntoView({ block: 'nearest' });
            }}
            aria-label={`Citation ${p.i + 1}: ${p.c.file}, ${p.c.row}, ${p.c.column}. ${ok ? 'Verified' : 'Mismatch'}`}
          >
            <Icon name={ok ? 'check' : 'cross'} size={12} />
            {p.i + 1}
          </button>
        </>
      );
    });
  };

  // Show each citation's cited value as the editable number, so strip the duplicate number written before it.
  const stripLeadingNumbers = (text: string) =>
    text.replace(new RegExp(`(\\S+?)(\\s*(?:EUR/MWh|MW)?\\s*)(${CITATION_RE.source})`, 'g'), (m, num: string, unit: string, cite: string, _f: string, _r: string, _c: string, val: string) =>
      num === val.trim() ? `${unit.trim() ? `${unit.trim()} ` : ''}${cite}` : m,
    );

  return (
    <Frame
      id="briefing"
      num={6}
      title="The briefing audit"
      badge="replay"
      wide
      onReset={reset}
      words={auditLine}
      what="The model writes the commentary. Code writes every sentence that contains a number, and attaches where the number came from. A validator then checks each citation against the data. Change a number and watch it fail."
      tryThis={['Press Break a citation.', 'Select any underlined number and type a different value.', 'Turn on Show who wrote what.']}
      extra={<p class="small">Model: gemini-2.5-flash-lite, with gemini-2.5-flash as fallback. The prompt tells it to write no numbers.</p>}
      controls={
        <div class="btn-row">
          <Seg
            label="Date"
            value={date}
            options={DATES.map((d) => ({ value: d, label: DLABEL[d] }))}
            onChange={(d) => {
              setDate(d);
              reset();
            }}
          />
          <label class="check">
            <input type="checkbox" checked={who} onChange={() => setWho(!who)} />
            Show who wrote what
          </label>
        </div>
      }
    >
      {brief ? (
        <div class="brief">
          <div class="brief-text">
            <p class="small soft">Briefing for {DLABEL[date]} 2026. Underlined numbers are the cited values. Each numbered chip is a citation.</p>
            {brief.sections.map((sec, si) => {
              let idx = offsets[si];
              const parts = splitAuthors(texts[si]);
              return (
                <>
                  <h4>{sentenceCase(sec.title)}</h4>
                  <p>
                    {parts.map((p) => {
                      const n = extractCitations(p.text).length;
                      const start = idx;
                      idx += n;
                      const body = renderSentence(n ? stripLeadingNumbers(p.text) : p.text, start);
                      return who ? (
                        <span class={`brief-sent by-${p.by}`}>
                          <span class="who">{p.by}</span>
                          {body}
                        </span>
                      ) : (
                        <>{body} </>
                      );
                    })}
                  </p>
                </>
              );
            })}
            {brief.anomaly && (
              <details class="pb-panel">
                <summary class="linklike">Anomaly report for 14 March</summary>
                <p class="small">
                  The wind flag fired after wind fell by 24,347 MW in a day. The report's own citations verify {anomalyAudit?.verified} of {anomalyAudit?.total}.
                </p>
                {brief.anomaly.map((a) => (
                  <>
                    <h4>{sentenceCase(a.title)}</h4>
                    <p class="small">{a.text}</p>
                  </>
                ))}
              </details>
            )}
          </div>
          <div class="evidence" tabIndex={0} aria-label="Evidence package">
            <p class="small">
              <strong>Evidence package</strong>, stored with the run
            </p>
            {Object.entries(brief.evidence)
              .filter(([, b]) => b && typeof b === 'object' && 'fields' in (b as object))
              .map(([k, b]) => {
                const blk = b as { source_file: string; row_id?: string; row_ids?: unknown; fields: Record<string, unknown> };
                return (
                  <div key={k}>
                    <h4>
                      {blk.source_file}, {typeof blk.row_id === 'string' ? blk.row_id : Array.isArray(blk.row_ids) ? 'trailing 7 days' : String(blk.row_ids ?? '')}
                    </h4>
                    <dl>
                      {Object.entries(blk.fields).map(([f, v]) => {
                        const hit = activeRow && activeRow.column === f && blk.source_file.toLowerCase().includes(activeRow.file.toLowerCase());
                        return (
                          <>
                            <dt id={`ev-${blk.source_file.split(' ')[0]}-${f}`} class={hit ? 'hit' : ''}>
                              {f}
                            </dt>
                            <dd class={hit ? 'hit' : ''}>{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
                          </>
                        );
                      })}
                    </dl>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <p class="soft">{data.status === 'error' ? 'The data for this figure did not load.' : 'Loading data'}</p>
      )}
      {data.status === 'error' && (
        <button class="btn btn-small" type="button" onClick={data.retry}>
          Try again
        </button>
      )}
      <div class="audit-bar" aria-live="polite">
        <span class={`state ${bad.length ? 'state-fail' : 'state-pass'}`}>
          <Icon name={bad.length ? 'cross' : 'check'} size={16} />
          Audit: {auditLine}
        </span>
        <button class="btn btn-small" type="button" onClick={() => setBroken(true)} disabled={broken || !brief}>
          Break a citation
        </button>
        <button class="btn btn-small" type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </Frame>
  );
}
