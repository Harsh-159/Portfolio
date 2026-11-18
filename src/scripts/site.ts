// Site-wide interactions (section 6): header rule, nav state, mobile menu, theme,
// evidence popovers, glossary tips, copy buttons, accordions and the command palette.

import { evidence, type EvidenceId } from '../content/evidence';
import { glossary, type GlossaryId } from '../content/glossary';
import { homeSections, site } from '../content/site';
import { labs, labPageTitles } from '../content/labs';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(sel),
];

// ------------------------------------------------------------------ live region
const live = document.createElement('div');
live.className = 'visually-hidden';
live.setAttribute('aria-live', 'polite');
document.body.append(live);
export function announce(msg: string) {
  live.textContent = '';
  window.setTimeout(() => (live.textContent = msg), 30);
}

// ------------------------------------------------------------------ header
const header = $('[data-header]');
const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Current section in the nav while scrolling the home page.
if (document.body.dataset.page === 'home') {
  const links = $$<HTMLAnchorElement>('[data-nav]');
  const ids = links.map((a) => a.dataset.nav!);
  const map: Record<string, string> = { education: 'experience', awards: 'experience', 'more-work': 'lab' };
  const targets = $$('section[id]');
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const id = visible[0].target.id;
      const navId = ids.includes(id) ? id : map[id];
      links.forEach((a) => {
        if (a.dataset.nav === navId) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    },
    { rootMargin: '-80px 0px -60% 0px' },
  );
  targets.forEach((t) => io.observe(t));
}

// ------------------------------------------------------------------ focus trap helper
function trap(container: HTMLElement, e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const f = $$<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    container,
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    last.focus();
    e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus();
    e.preventDefault();
  }
}

// ------------------------------------------------------------------ mobile menu
const sheet = $('#menu-sheet');
const menuBtn = $<HTMLButtonElement>('[data-menu-open]');
function closeMenu() {
  if (!sheet || sheet.hidden) return;
  sheet.hidden = true;
  document.documentElement.style.overflow = '';
  menuBtn?.setAttribute('aria-expanded', 'false');
  menuBtn?.focus();
}
menuBtn?.addEventListener('click', () => {
  if (!sheet) return;
  sheet.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  menuBtn.setAttribute('aria-expanded', 'true');
  $<HTMLElement>('[data-menu-close]', sheet)?.focus();
});
$('[data-menu-close]')?.addEventListener('click', closeMenu);
sheet?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
  trap(sheet, e);
});
$$('[data-menu-link]').forEach((a) =>
  a.addEventListener('click', () => {
    sheet!.hidden = true;
    document.documentElement.style.overflow = '';
    menuBtn?.setAttribute('aria-expanded', 'false');
  }),
);

// ------------------------------------------------------------------ theme
function currentTheme(): 'light' | 'dark' {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem('theme', next);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  announce(`${next === 'dark' ? 'Dark' : 'Light'} theme`);
}
$$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', toggleTheme));
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () =>
  window.dispatchEvent(new CustomEvent('themechange')),
);

// ------------------------------------------------------------------ copy buttons
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
document.addEventListener('click', async (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]');
  if (!btn) return;
  const ok = await copyText(btn.dataset.copy!);
  if (!ok) return;
  const label = btn.textContent;
  btn.textContent = 'Copied';
  announce('Copied');
  window.setTimeout(() => (btn.textContent = label), 2000);
});

// ------------------------------------------------------------------ popovers
let openPop: { el: HTMLElement; trigger: HTMLElement } | null = null;
function closePop(returnFocus = true) {
  if (!openPop) return;
  openPop.el.remove();
  openPop.trigger.setAttribute('aria-expanded', 'false');
  if (returnFocus) openPop.trigger.focus();
  openPop = null;
}
function place(el: HTMLElement, trigger: HTMLElement) {
  const r = trigger.getBoundingClientRect();
  const w = el.offsetWidth;
  const left = Math.min(Math.max(16, r.left + window.scrollX), window.scrollX + document.documentElement.clientWidth - w - 16);
  el.style.left = `${left}px`;
  const below = r.bottom + window.scrollY + 8;
  const h = el.offsetHeight;
  const roomBelow = window.innerHeight - r.bottom;
  el.style.top = `${roomBelow < h + 16 && r.top > h + 16 ? r.top + window.scrollY - h - 8 : below}px`;
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const ev = target.closest<HTMLAnchorElement>('a[data-ev]');
  if (ev) {
    e.preventDefault();
    if (openPop?.trigger === ev) return closePop();
    closePop(false);
    const entry = evidence[ev.dataset.ev as EvidenceId];
    const el = document.createElement('div');
    el.className = 'popover';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Where this fact comes from');
    el.id = `pop-${ev.dataset.ev}`;
    el.innerHTML = `<button class="pop-close" type="button" aria-label="Close">×</button>
      <p class="pop-claim"></p><p><strong>How it is measured:</strong> <span data-how></span></p>
      <p><a data-href>See it in the demo</a></p>`;
    $('.pop-claim', el)!.textContent = entry.claim + '.';
    $('[data-how]', el)!.textContent = entry.how + '.';
    const link = $<HTMLAnchorElement>('[data-href]', el)!;
    link.href = entry.href;
    $('.pop-close', el)!.addEventListener('click', () => closePop());
    el.addEventListener('keydown', (k) => {
      if (k.key === 'Escape') closePop();
      trap(el, k);
    });
    document.body.append(el);
    place(el, ev);
    ev.setAttribute('aria-expanded', 'true');
    ev.setAttribute('aria-controls', el.id);
    openPop = { el, trigger: ev };
    link.focus();
    return;
  }
  if (openPop && !openPop.el.contains(target)) closePop(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openPop) closePop();
  if ((e.key === ' ' || e.key === 'Spacebar') && (e.target as HTMLElement).matches?.('a[data-ev]')) {
    e.preventDefault();
    (e.target as HTMLElement).click();
  }
});

// Glossary tips: hover, focus or tap.
let tip: HTMLElement | null = null;
function showTip(t: HTMLElement) {
  hideTip();
  const g = glossary[t.dataset.term as GlossaryId];
  if (!g) return;
  tip = document.createElement('div');
  tip.className = 'tip';
  tip.id = 'glossary-tip';
  tip.setAttribute('role', 'tooltip');
  tip.textContent = `${g.term}: ${g.definition}.`;
  document.body.append(tip);
  t.setAttribute('aria-describedby', 'glossary-tip');
  place(tip, t);
}
function hideTip() {
  tip?.remove();
  tip = null;
  $$('[aria-describedby="glossary-tip"]').forEach((x) => x.removeAttribute('aria-describedby'));
}
document.addEventListener('mouseover', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-term]');
  if (t) showTip(t);
});
document.addEventListener('mouseout', (e) => {
  if ((e.target as HTMLElement).closest('[data-term]')) hideTip();
});
document.addEventListener('focusin', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-term]');
  if (t) showTip(t);
  else hideTip();
});
document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-term]');
  if (t) {
    if (tip) hideTip();
    else showTip(t);
  }
});
document.addEventListener('keydown', (e) => e.key === 'Escape' && hideTip());

// ------------------------------------------------------------------ accordions open on hash
function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const el = document.getElementById(id);
  const d = el?.closest('details') ?? (el instanceof HTMLDetailsElement ? el : null);
  if (d && !d.open) d.open = true;
}
window.addEventListener('hashchange', openFromHash);
openFromHash();

// ------------------------------------------------------------------ command palette
interface Cmd {
  label: string;
  group: string;
  run: () => void;
}
const go = (href: string) => () => (location.href = href);
const isHome = document.body.dataset.page === 'home';
const cmds: Cmd[] = [
  ...homeSections.map((s) => ({ label: s.label, group: 'Home', run: go(isHome ? `#${s.id}` : `/#${s.id}`) })),
  ...labs.map((l) => ({ label: labPageTitles[l.slug], group: 'Lab', run: go(`/lab/${l.slug}`) })),
  {
    label: 'Copy email address',
    group: 'Actions',
    run: async () => {
      if (await copyText(site.email)) announce('Email address copied');
    },
  },
  {
    label: 'Download CV (PDF)',
    group: 'Actions',
    run: () => {
      const a = document.createElement('a');
      a.href = site.cv;
      a.download = 'Harsh-Yadav-CV.pdf';
      a.click();
    },
  },
  { label: 'Switch theme', group: 'Actions', run: toggleTheme },
  { label: 'Open GitHub', group: 'Actions', run: () => window.open(site.github, '_blank', 'noopener') },
  { label: 'Open LinkedIn', group: 'Actions', run: () => window.open(site.linkedin, '_blank', 'noopener') },
];

let palette: HTMLElement | null = null;
let paletteReturn: HTMLElement | null = null;
function openPalette() {
  if (palette) return;
  paletteReturn = document.activeElement as HTMLElement;
  palette = document.createElement('div');
  palette.className = 'palette-backdrop';
  palette.innerHTML = `<div class="palette" role="dialog" aria-modal="true" aria-label="Search the site">
    <label class="visually-hidden" for="palette-input">Search sections, demos and actions</label>
    <input id="palette-input" type="text" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" placeholder="Search sections, demos and actions" autocomplete="off" />
    <ul id="palette-list" role="listbox" aria-label="Results"></ul>
    <p class="palette-hint">Arrow keys move, Enter runs, Escape closes.</p>
  </div>`;
  document.body.append(palette);
  document.documentElement.style.overflow = 'hidden';
  const input = $<HTMLInputElement>('input', palette)!;
  const list = $<HTMLUListElement>('ul', palette)!;
  let active = 0;
  let shown: Cmd[] = cmds;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    shown = cmds.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
    active = Math.min(active, Math.max(0, shown.length - 1));
    list.innerHTML = '';
    shown.forEach((c, i) => {
      const li = document.createElement('li');
      li.id = `palette-opt-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      li.innerHTML = `<span></span><span class="palette-group"></span>`;
      li.children[0].textContent = c.label;
      li.children[1].textContent = c.group;
      li.addEventListener('click', () => runCmd(c));
      li.addEventListener('mousemove', () => {
        if (active !== i) {
          active = i;
          render();
        }
      });
      list.append(li);
    });
    if (!shown.length) list.innerHTML = '<li class="palette-empty">Nothing matches.</li>';
    input.setAttribute('aria-activedescendant', shown.length ? `palette-opt-${active}` : '');
    list.children[active]?.scrollIntoView({ block: 'nearest' });
  };
  const runCmd = (c: Cmd) => {
    closePalette(false);
    c.run();
  };
  input.addEventListener('input', () => {
    active = 0;
    render();
  });
  palette.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      active = Math.min(shown.length - 1, active + 1);
      render();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      active = Math.max(0, active - 1);
      render();
      e.preventDefault();
    } else if (e.key === 'Enter' && shown[active]) {
      runCmd(shown[active]);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      closePalette();
    } else if (e.key === 'Tab') {
      e.preventDefault();
    }
  });
  palette.addEventListener('mousedown', (e) => {
    if (e.target === palette) closePalette();
  });
  render();
  input.focus();
}
function closePalette(restore = true) {
  palette?.remove();
  palette = null;
  document.documentElement.style.overflow = '';
  if (restore) paletteReturn?.focus();
}
$$('[data-palette-open]').forEach((b) => b.addEventListener('click', openPalette));
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (palette) closePalette();
    else openPalette();
  }
});
if (/Mac|iPhone|iPad/.test(navigator.platform)) $$('[data-shortcut]').forEach((k) => (k.textContent = '⌘ K'));
