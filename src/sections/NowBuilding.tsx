import { Link } from 'react-router-dom';
import { StatusChip } from '../components/StatusChip';
import { Reveal } from '../components/Reveal';
import type { LabStatus } from '../content/labs';
import buildlog from '../content/buildlog.json';

interface BuildItem {
  id: string;
  title: string;
  status: string;
  date?: string;
  note?: string;
  demo?: string;
}

// buildlog uses "in-progress"; the status chips use "in-training".
function toChipStatus(status: string): LabStatus {
  if (status === 'live') return 'live';
  if (status === 'planned') return 'planned';
  return 'in-training';
}

export function NowBuilding() {
  const items = buildlog as BuildItem[];

  return (
    <section className="border-b border-line/60 bg-surface/30">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Now building: a language model from scratch
          </h2>
          <p className="mt-2 font-mono text-sm text-muted">
            The build log is one JSON file. Live milestones link to their demo.
          </p>
        </Reveal>

        <ol className="mt-8 grid gap-4 md:grid-cols-5">
          {items.map((item, i) => {
            const status = toChipStatus(item.status);
            const inner = (
              <div className="flex h-full flex-col gap-3 rounded-lg border border-line bg-bg/40 p-4 transition-colors hover:border-muted/50">
                <StatusChip status={status} />
                <p className="font-medium leading-snug">{item.title}</p>
                {item.note && <p className="font-mono text-xs text-muted">{item.note}</p>}
                {item.date && (
                  <p className="mt-auto font-mono text-xs text-muted/60">{item.date}</p>
                )}
              </div>
            );
            return (
              <Reveal as="li" key={item.id} delay={i * 0.05}>
                {item.demo ? (
                  <Link to={item.demo} className="block h-full">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
