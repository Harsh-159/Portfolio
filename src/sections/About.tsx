import { Reveal } from '../components/Reveal';
import { ABOUT_PARAGRAPHS, ABOUT_PHOTO, IDENTITY } from '../content/profile';

export function About() {
  return (
    <section id="about" className="border-b border-line/60 scroll-mt-16">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[260px_1fr] md:gap-14">
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-line">
            <img
              src={ABOUT_PHOTO}
              alt={`${IDENTITY.name}, ${IDENTITY.role} based in ${IDENTITY.location}`}
              width={460}
              height={548}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">About</h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-muted">
            {ABOUT_PARAGRAPHS.map((p, i) => (
              <p key={i} className={i === 0 ? 'text-fg' : undefined}>
                {p}
              </p>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
