import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StatusChip } from '../components/StatusChip';
import { MiniPreview } from '../components/MiniPreviews';
import { Reveal } from '../components/Reveal';
import { LABS, type Lab } from '../content/labs';

function LiveCard({ lab }: { lab: Lab }) {
  return (
    <Link
      to={lab.route!}
      className="group flex h-full flex-col gap-3 rounded-xl border border-line bg-surface/40 p-5 transition-colors hover:border-live/50"
    >
      <div className="flex items-center justify-between">
        <StatusChip status={lab.status} />
        <ArrowUpRight
          size={18}
          className="text-muted transition-colors group-hover:text-live"
          aria-hidden="true"
        />
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight">{lab.title}</h3>
      <p className="font-mono text-xs text-muted">{lab.claim}</p>
      <div className="mt-auto pt-2">
        <MiniPreview kind={lab.preview} />
      </div>
    </Link>
  );
}

function LockedCard({ lab }: { lab: Lab }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-dashed border-planned/30 bg-surface/20 p-5">
      <div className="flex items-center justify-between">
        <StatusChip status={lab.status} />
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight text-fg/80">{lab.title}</h3>
      <p className="font-mono text-xs text-muted">{lab.claim}</p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-auto self-start rounded-md border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-fg"
      >
        {open ? 'Hide plan' : 'See the plan'}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-1.5 font-mono text-xs text-muted"
          >
            {lab.plan?.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-planned">{String(i + 1).padStart(2, '0')}</span>
                {step}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LabGrid() {
  return (
    <section id="lab" className="border-b border-line/60 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">The lab</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Interactive pieces of real projects. Everything marked live runs in your browser right
            now.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LABS.map((lab, i) => (
            <Reveal as="article" key={lab.id} delay={(i % 3) * 0.05}>
              {lab.route ? <LiveCard lab={lab} /> : <LockedCard lab={lab} />}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
