import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Code2 } from 'lucide-react';
import { StatusChip } from './StatusChip';
import { LABS } from '../content/labs';

/** Shared chrome for every lab demo page. */
export function DemoChrome({ labId, children }: { labId: string; children: ReactNode }) {
  const lab = LABS.find((l) => l.id === labId);
  if (!lab) return null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <Link
        to="/#lab"
        className="inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to the lab
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {lab.title}
            </h1>
            <StatusChip status={lab.status} />
          </div>
          <p className="mt-3 max-w-2xl text-muted">
            <span className="font-mono text-xs uppercase tracking-wider text-muted/70">
              Why this exists:{' '}
            </span>
            {lab.why}
          </p>
        </div>

        {lab.source && (
          <a
            href={lab.source}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 font-mono text-sm text-muted transition-colors hover:border-muted hover:text-fg"
          >
            <Code2 size={16} aria-hidden="true" /> View source
          </a>
        )}
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}

/** A clearly badged honesty notice (sample data, anonymised, toy weights). */
export function HonestyBadge({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-md border border-planned/40 bg-planned/10 px-3 py-1.5 font-mono text-xs text-planned">
      {children}
    </p>
  );
}
