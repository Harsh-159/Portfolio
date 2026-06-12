import { Linkedin, Github } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { LINKS } from '../content/profile';

export function Contact() {
  return (
    <section id="contact" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Get in touch</p>
          <a
            href={`mailto:${LINKS.email}`}
            className="mt-4 block break-all font-display text-3xl font-semibold tracking-tight transition-colors hover:text-live sm:text-4xl md:text-6xl"
          >
            {LINKS.email}
          </a>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={LINKS.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-sm text-muted transition-colors hover:text-fg"
            >
              <Linkedin size={16} aria-hidden="true" /> LinkedIn
            </a>
            <a
              href={LINKS.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-sm text-muted transition-colors hover:text-fg"
            >
              <Github size={16} aria-hidden="true" /> GitHub
            </a>
            <a
              href={LINKS.cv}
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-sm text-muted transition-colors hover:text-fg"
            >
              Download CV
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
