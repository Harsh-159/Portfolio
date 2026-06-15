import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { EXPERIENCE, EDUCATION } from '../content/profile';

export function Experience() {
  return (
    <section id="experience" className="border-b border-line/60 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Experience &amp; education
          </h2>
        </Reveal>

        <div className="mt-10 space-y-10 border-l border-line pl-6">
          {EXPERIENCE.map((job) => (
            <Reveal as="div" key={job.org} className="relative">
              <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-live bg-bg" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-xl font-semibold">
                  {job.role}, {job.org}
                </h3>
                <span className="font-mono text-xs text-muted">{job.date}</span>
              </div>
              <p className="mt-1 font-mono text-sm text-muted">{job.context}</p>
              <ul className="mt-4 space-y-2.5">
                {job.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3 text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted/60" />
                    {b.href ? (
                      <Link
                        to={b.href}
                        className="group inline-flex items-baseline gap-1 text-fg underline decoration-line underline-offset-4 transition-colors hover:decoration-live"
                      >
                        {b.text}
                        <ArrowUpRight
                          size={14}
                          className="text-live opacity-70 transition-opacity group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </Link>
                    ) : (
                      <span>{b.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}

          {EDUCATION.map((ed) => (
            <Reveal as="div" key={ed.org} className="relative">
              <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-planned bg-bg" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-xl font-semibold">{ed.degree}</h3>
                <span className="font-mono text-xs text-muted">{ed.date}</span>
              </div>
              <p className="mt-1 font-mono text-sm text-muted">{ed.org}</p>
              <p className="mt-2 text-muted">{ed.detail}</p>
              {ed.coursework && (
                <p className="mt-2 font-mono text-xs text-muted/80">
                  Coursework: {ed.coursework.join(', ')}.
                </p>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
