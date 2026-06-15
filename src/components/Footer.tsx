import { Mail, Linkedin, Github, FileText } from 'lucide-react';
import { LINKS } from '../content/profile';
import changelog from '../content/changelog.json';

export function Footer() {
  return (
    <footer className="border-t border-line/60 bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`mailto:${LINKS.email}`}
              className="inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-live"
            >
              <Mail size={16} aria-hidden="true" /> {LINKS.email}
            </a>
            <a
              href={LINKS.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-fg"
            >
              <Linkedin size={16} aria-hidden="true" /> LinkedIn
            </a>
            <a
              href={LINKS.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-fg"
            >
              <Github size={16} aria-hidden="true" /> GitHub
            </a>
            <a
              href={LINKS.cv}
              download="Harsh-Yadav-CV.pdf"
              className="inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-fg"
            >
              <FileText size={16} aria-hidden="true" /> CV
            </a>
          </div>
          <p className="mt-6 font-mono text-xs text-muted/70">
            LAST_UPDATED: {__LAST_UPDATED__} · built with React, TypeScript and Vite ·{' '}
            <a href={LINKS.repo} target="_blank" rel="noreferrer" className="underline hover:text-fg">
              source
            </a>
          </p>
        </div>

        <div className="md:text-right">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted/70">Changelog</h2>
          <ul className="mt-3 space-y-2">
            {changelog.slice(0, 4).map((c) => (
              <li key={c.date} className="font-mono text-xs text-muted">
                <span className="text-muted/60">{c.date}</span> · {c.entry}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
