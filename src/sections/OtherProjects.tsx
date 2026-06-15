import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { OTHER_PROJECTS } from '../content/profile';

export function OtherProjects() {
  return (
    <section className="border-b border-line/60">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Other projects
          </h2>
          <p className="mt-2 text-muted">Work I link to rather than embed.</p>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OTHER_PROJECTS.map((p, i) => (
            <Reveal as="article" key={p.title} delay={(i % 3) * 0.05}>
              <a
                href={p.href}
                target="_blank"
                rel="noreferrer"
                className="group flex h-full flex-col gap-3 rounded-xl border border-line bg-surface/40 p-5 transition-colors hover:border-muted/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold tracking-tight">{p.title}</h3>
                  <ArrowUpRight
                    size={18}
                    className="shrink-0 text-muted transition-colors group-hover:text-fg"
                    aria-hidden="true"
                  />
                </div>
                {p.badge && (
                  <span className="self-start rounded-full border border-live/40 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-live">
                    {p.badge}
                  </span>
                )}
                <p className="text-sm leading-relaxed text-muted">{p.blurb}</p>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
