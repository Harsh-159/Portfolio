import type { LabStatus } from '../content/labs';

const CONFIG: Record<LabStatus, { glyph: string; label: string; className: string; live?: boolean }> = {
  live: {
    glyph: '●',
    label: 'LIVE',
    className: 'text-live border-live/40',
    live: true,
  },
  'in-training': {
    glyph: '◐',
    label: 'IN TRAINING',
    className: 'text-planned border-planned/40',
  },
  planned: {
    glyph: '○',
    label: 'PLANNED',
    className: 'text-planned border-planned/50',
  },
};

export function StatusChip({ status }: { status: LabStatus }) {
  const c = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${c.className}`}
    >
      <span className={c.live ? 'live-dot' : ''} aria-hidden="true">
        {c.glyph}
      </span>
      {c.label}
    </span>
  );
}
