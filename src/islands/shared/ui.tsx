// Shared island building blocks: icons, badges, the figure frame (section 6.5) and hooks.
import { Component, type ComponentChildren, type JSX } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { iconPaths, type IconName } from '../../components/icons';
import { badges, type BadgeKind } from '../../content/labs';

export function Icon({ name, size = 18, class: cls }: { name: IconName; size?: number; class?: string }) {
  return (
    <svg
      class={cls}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={1.8}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: iconPaths[name] }}
    />
  );
}

export function Badge({ kind }: { kind: BadgeKind }) {
  const b = badges[kind];
  return (
    <span class="badge" tabIndex={0} title={b.explanation} aria-label={`${b.label}: ${b.explanation}`}>
      <Icon name={kind} size={16} />
      <span aria-hidden="true">{b.label}</span>
    </span>
  );
}

export type StateKind = 'pass' | 'fail' | 'blocked' | 'warn' | 'info';
const stateIcon: Record<StateKind, IconName> = { pass: 'check', fail: 'cross', blocked: 'block', warn: 'warn', info: 'info' };
const stateWord: Record<StateKind, string> = { pass: 'Pass', fail: 'Fail', blocked: 'Blocked', warn: 'Warning', info: 'Info' };

export function State({ kind, children }: { kind: StateKind; children?: ComponentChildren }) {
  const cls = kind === 'blocked' ? 'warn' : kind;
  return (
    <span class={`state state-${cls}`}>
      <Icon name={stateIcon[kind]} size={16} />
      {children ?? stateWord[kind]}
    </span>
  );
}

// ------------------------------------------------------------------ reduced motion
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(m.matches);
    const on = () => setReduce(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduce;
}

// ------------------------------------------------------------------ theme-aware colours
export function useTheme(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const on = () => setN((x) => x + 1);
    window.addEventListener('themechange', on);
    return () => window.removeEventListener('themechange', on);
  }, []);
  return n;
}

export function token(name: string): string {
  if (typeof window === 'undefined') return '#000';
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

// ------------------------------------------------------------------ state in the address (6.8)
type Codec<T> = { parse: (s: string) => T | undefined; format: (v: T) => string };

export const codecs = {
  str: <T extends string>(allowed?: readonly T[]): Codec<T> => ({
    parse: (s) => (!allowed || allowed.includes(s as T) ? (s as T) : undefined),
    format: (v) => v,
  }),
  int: (min: number, max: number): Codec<number> => ({
    parse: (s) => {
      const n = Number(s);
      return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
    },
    format: (v) => String(v),
  }),
  num: (min: number, max: number): Codec<number> => ({
    parse: (s) => {
      const n = Number(s);
      return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
    },
    format: (v) => String(Number(v.toFixed(3))),
  }),
  bool: (): Codec<boolean> => ({
    parse: (s) => (s === '1' ? true : s === '0' ? false : undefined),
    format: (v) => (v ? '1' : '0'),
  }),
  list: <T extends string>(allowed: readonly T[]): Codec<T[]> => ({
    parse: (s) => {
      if (s === '') return [];
      const parts = s.split(',').filter((x) => allowed.includes(x as T)) as T[];
      return parts.length ? [...new Set(parts)] : undefined;
    },
    format: (v) => v.join(','),
  }),
};

const pending = new Map<string, string | null>();
let timer: number | undefined;
function flush() {
  const url = new URL(location.href);
  for (const [k, v] of pending) {
    if (v === null) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  pending.clear();
  history.replaceState(history.state, '', url.toString());
}

/** Mirrors one piece of state to a query parameter, debounced by 200 ms. Defaults are left out. */
export function useUrlState<T>(key: string, initial: T, codec: Codec<T>): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  const first = useRef(true);
  useEffect(() => {
    const raw = new URLSearchParams(location.search).get(key);
    if (raw !== null) {
      const parsed = codec.parse(raw);
      if (parsed !== undefined) setValue(parsed);
    }
  }, []);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const f = codec.format(value);
    pending.set(key, f === codec.format(initial) ? null : f);
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, 200);
  }, [value]);
  return [value, setValue];
}

// ------------------------------------------------------------------ figure frame (6.5)
interface FrameProps {
  id: string;
  num: number;
  title: string;
  badge: BadgeKind;
  controls?: ComponentChildren;
  children: ComponentChildren;
  words: ComponentChildren;
  what: ComponentChildren;
  tryThis?: ComponentChildren[];
  extra?: ComponentChildren;
  onReset?: () => void;
  wide?: boolean;
  stageClass?: string;
  noCopy?: boolean;
}

class Boundary extends Component<{ children: ComponentChildren; onReload: () => void }, { failed: boolean }> {
  state = { failed: false };
  componentDidCatch(err: unknown) {
    console.error(err);
    this.setState({ failed: true });
  }
  render() {
    if (this.state.failed)
      return (
        <div class="fig-error" role="alert">
          <p>This figure failed to load.</p>
          <button
            class="btn"
            type="button"
            onClick={() => {
              this.setState({ failed: false });
              this.props.onReload();
            }}
          >
            Reload figure
          </button>
        </div>
      );
    return this.props.children;
  }
}

export function Frame(p: FrameProps) {
  const [key, setKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      const url = new URL(location.href);
      url.hash = p.id;
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [p.id]);
  return (
    <figure id={p.id} class={`fig${p.wide ? ' fig-wide' : ''}`} aria-labelledby={`${p.id}-title`}>
      <div class="fig-frame">
        <div class="fig-head">
          <h3 class="fig-title" id={`${p.id}-title`}>
            <span class="fig-num">Figure {p.num}</span>
            {p.title}
          </h3>
          <Badge kind={p.badge} />
        </div>
        <p class="fig-badge-note">
          {badges[p.badge].label}: {badges[p.badge].explanation}.
        </p>
        <Boundary key={key} onReload={() => setKey((k) => k + 1)}>
          {p.controls && <div class="fig-controls">{p.controls}</div>}
          <div class={`fig-stage ${p.stageClass ?? ''}`}>{p.children}</div>
        </Boundary>
        <div class="fig-words" aria-live="polite">
          <p>
            <strong>In words: </strong>
            {p.words}
          </p>
        </div>
      </div>
      <figcaption class="fig-caption">
        <p class="what">
          <strong>What you are looking at: </strong>
          {p.what}
        </p>
        {p.tryThis && p.tryThis.length > 0 && (
          <>
            <p>
              <strong>Try this:</strong>
            </p>
            <ol>
              {p.tryThis.map((t) => (
                <li>{t}</li>
              ))}
            </ol>
          </>
        )}
        {p.extra}
        <div class="fig-actions">
          {p.onReset && (
            <button class="linklike" type="button" onClick={p.onReset}>
              Reset
            </button>
          )}
          {!p.noCopy && (
            <button class="linklike" type="button" onClick={copy}>
              {copied ? 'Copied' : 'Copy link to this view'}
            </button>
          )}
          {copied && (
            <span class="visually-hidden" role="status">
              Copied
            </span>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

// ------------------------------------------------------------------ small controls
export function Seg<T extends string>(p: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hideLabel?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const i = p.options.findIndex((o) => o.value === p.value);
    let j = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % p.options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + p.options.length) % p.options.length;
    else return;
    e.preventDefault();
    p.onChange(p.options[j].value);
    ref.current?.querySelectorAll<HTMLButtonElement>('button')[j]?.focus();
  };
  return (
    <div class="field">
      <span class={p.hideLabel ? 'visually-hidden' : 'label'} id={`seg-${p.label.replace(/\W+/g, '-')}`}>
        {p.label}
      </span>
      <div class="seg" role="radiogroup" aria-labelledby={`seg-${p.label.replace(/\W+/g, '-')}`} ref={ref} onKeyDown={onKey}>
        {p.options.map((o) => (
          <button
            type="button"
            role="radio"
            aria-checked={o.value === p.value}
            tabIndex={o.value === p.value ? 0 : -1}
            onClick={() => p.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Slider(p: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
}) {
  const id = `sl-${p.label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div class="field">
      <label for={id}>{p.label}</label>
      <div class="slider">
        <input
          id={id}
          type="range"
          min={p.min}
          max={p.max}
          step={p.step}
          value={p.value}
          onInput={(e) => p.onChange(Number((e.target as HTMLInputElement).value))}
          aria-valuetext={p.format ? p.format(p.value) : String(p.value)}
        />
        <output for={id}>{p.format ? p.format(p.value) : p.value}</output>
      </div>
      {p.hint && <span class="small soft">{p.hint}</span>}
    </div>
  );
}

export function ShowData({ children, label = 'Show data' }: { children: ComponentChildren; label?: string }) {
  return (
    <details class="show-data">
      <summary class="linklike">{label}</summary>
      <div class="table-wrap">{children}</div>
    </details>
  );
}

export const nf = (d = 0) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtN = (x: number, d = 0) => nf(d).format(x);

export type Child = JSX.Element | string | number | null | false;
