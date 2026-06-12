import { Link, useLocation } from 'react-router-dom';
import { LINKS } from '../content/profile';

const NAV = [
  { label: 'Lab', href: '/#lab' },
  { label: 'Experience', href: '/#experience' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
];

export function Header() {
  const { pathname } = useLocation();
  const onHome = pathname === '/';

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link to="/" className="flex items-baseline gap-2" aria-label="Home">
          <span className="font-display text-lg font-semibold tracking-tight">harsh.yadav</span>
          <span className="font-mono text-[10px] tracking-widest text-live">LIVE_LAB</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={onHome ? item.href.replace('/', '') || '#' : item.href}
              className="font-mono text-sm text-muted transition-colors hover:text-fg"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href={LINKS.cv}
          className="rounded-md border border-line px-3 py-1.5 font-mono text-sm text-muted transition-colors hover:border-muted hover:text-fg"
        >
          CV
        </a>
      </div>
    </header>
  );
}
