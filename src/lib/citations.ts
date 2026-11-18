// Section 13.7: a JavaScript port of the project's citation validator
// (validate_citations, _lookup_evidence_value and _values_match in src/ai_intelligence.py).

export const CITATION_RE = /\[([A-Za-z_]+\.(?:csv|txt|parquet))\s*→\s*([^,\]]+),\s*([^\]=]+?)\s*=\s*([^\]]+?)\]/g;

export interface Citation {
  file: string;
  row: string;
  column: string;
  value: string;
  /** Character offsets in the source text. */
  start: number;
  end: number;
}

export type EvidencePackage = Record<string, unknown>;

export function extractCitations(text: string): Citation[] {
  const out: Citation[] = [];
  for (const m of text.matchAll(CITATION_RE)) {
    out.push({
      file: m[1].trim(),
      row: m[2].trim(),
      column: m[3].trim(),
      value: m[4].trim(),
      start: m.index!,
      end: m.index! + m[0].length,
    });
  }
  return out;
}

/** Python's str() of the stored JSON value. */
function pyStr(v: unknown): string {
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'number') return Number.isInteger(v) && !String(v).includes('.') ? String(v) : String(v);
  return String(v);
}

export function lookup(ev: EvidencePackage, file: string, column: string): string | null {
  const fn = file.trim().toLowerCase();
  for (const block of Object.values(ev)) {
    if (!block || typeof block !== 'object' || !('source_file' in block)) continue;
    const b = block as { source_file: string; fields?: Record<string, unknown> };
    if (b.source_file.toLowerCase().includes(fn)) {
      const fields = b.fields ?? {};
      if (Object.hasOwn(fields, column.trim())) return pyStr(fields[column.trim()]);
    }
  }
  return null;
}

export function valuesMatch(cited: string, actual: string): boolean {
  const c = cited.trim();
  const a = actual.trim();
  if (c === a) return true;
  if (a.toLowerCase() === 'true' || a.toLowerCase() === 'false') return c.toLowerCase() === a.toLowerCase();
  if (a === 'None') return ['none', 'n/a', 'null'].includes(c.toLowerCase());
  const cf = Number(c.replace('+', ''));
  const af = Number(a);
  if (c !== '' && a !== '' && Number.isFinite(cf) && Number.isFinite(af)) {
    const tol = af !== 0 ? Math.max(0.01, Math.abs(af) * 0.005) : 0.01;
    return Math.abs(cf - af) < tol;
  }
  return false;
}

export interface AuditRow extends Citation {
  actual: string | null;
  verdict: 'VERIFIED' | 'MISMATCH' | 'NOT_FOUND';
}

export function audit(text: string, ev: EvidencePackage): { rows: AuditRow[]; verified: number; total: number } {
  const rows = extractCitations(text).map((c): AuditRow => {
    const actual = lookup(ev, c.file, c.column);
    const ok = actual !== null && valuesMatch(c.value, actual);
    return { ...c, actual, verdict: ok ? 'VERIFIED' : actual === null ? 'NOT_FOUND' : 'MISMATCH' };
  });
  const verified = rows.filter((r) => r.verdict === 'VERIFIED').length;
  return { rows, verified, total: rows.length };
}

/** A sentence is written by code when it contains a citation, by the model otherwise. */
export function splitAuthors(sectionText: string): { text: string; by: 'model' | 'code' }[] {
  const saved: string[] = [];
  const masked = sectionText.replace(/\[[^\]]*\]/g, (m) => {
    saved.push(m);
    return `\u0000${saved.length - 1}\u0000`;
  });
  return masked
    .split(/(?<=[.!?])\s+(?=[A-Z'"])/)
    .map((s) => s.replace(/\u0000(\d+)\u0000/g, (_, i) => saved[Number(i)]).trim())
    .filter(Boolean)
    .map((s) => ({ text: s, by: /\[[A-Za-z_]+\.(?:csv|txt|parquet)\s*→/.test(s) ? 'code' : 'model' }));
}

/** Show a stored number with as many decimals as the cited value, as Python printed it. */
export function formatLike(actual: string, cited: string): string {
  const d = cited.includes('.') ? cited.split('.')[1].length : 0;
  const n = Number(actual);
  if (!Number.isFinite(n) || actual.includes('.')) return actual;
  return d > 0 ? n.toFixed(d) : actual;
}
