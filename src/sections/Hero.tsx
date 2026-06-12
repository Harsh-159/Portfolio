import { HeroNodeField } from '../components/HeroNodeField';
import { STATS, LINKS } from '../content/profile';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line/60">
      <div className="grid-texture absolute inset-0" aria-hidden="true" />
      <HeroNodeField />

      <div className="relative mx-auto max-w-6xl px-5 py-24 md:py-32">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Building in public</p>

        <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          Don&apos;t read my CV. Run it.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          I&apos;m Harsh Yadav. I build and evaluate LLM systems. MSc AI &amp; ML at Birmingham
          (Chancellor&apos;s Scholar), previously Oracle. Right now I&apos;m building a language model
          from scratch, and you can try its tokenizer below.
        </p>

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm text-muted">
          {STATS.map((s) => (
            <li key={s.value} className="flex items-baseline gap-2">
              <span className="text-fg">{s.value}</span>
              <span className="text-muted/80">{s.label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#lab"
            className="rounded-md bg-live px-5 py-2.5 font-mono text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Enter the lab
          </a>
          <a
            href={LINKS.cv}
            className="rounded-md border border-line px-5 py-2.5 font-mono text-sm text-fg transition-colors hover:border-muted"
          >
            Download CV
          </a>
        </div>
      </div>
    </section>
  );
}
