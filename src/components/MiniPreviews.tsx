import type { ReactElement } from 'react';
import type { PreviewKind } from '../content/labs';

// Cheap, decorative, animation-only previews. No demo logic runs here.
// All animation is CSS, so the global reduced-motion rule pauses it.

function TokenizerPreview() {
  const chips = ['Th', 'e', ' c', 'at', ' sat'];
  const colours = ['bg-live/20', 'bg-planned/20', 'bg-sky-400/20', 'bg-live/20', 'bg-planned/20'];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c, i) => (
        <span
          key={i}
          className={`rounded px-1.5 py-0.5 font-mono text-xs ${colours[i]}`}
          style={{ animation: 'blink 2.4s ease-in-out infinite', animationDelay: `${i * 0.25}s` }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function OrderBookPreview() {
  const rows = [
    { side: 'sell', w: 0.8 },
    { side: 'sell', w: 0.5 },
    { side: 'sell', w: 0.65 },
    { side: 'buy', w: 0.7 },
    { side: 'buy', w: 0.45 },
    { side: 'buy', w: 0.85 },
  ];
  return (
    <div className="space-y-1">
      {rows.map((r, i) => (
        <div key={i} className="h-2 w-full overflow-hidden rounded-sm bg-bg/50">
          <div
            className={`h-full origin-left rounded-sm ${r.side === 'sell' ? 'bg-sell/40' : 'bg-live/40'}`}
            style={{
              width: `${r.w * 100}%`,
              animation: 'ladder 2.6s ease-in-out infinite',
              animationDelay: `${i * 0.18}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function ForecastPreview() {
  return (
    <div className="relative h-14 w-full overflow-hidden">
      <svg viewBox="0 0 140 56" className="h-full w-full" preserveAspectRatio="none">
        <polyline
          points="0,40 14,30 28,34 42,18 56,24 70,12 84,20 98,8 112,16 126,6 140,12"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="1"
          opacity="0.5"
        />
      </svg>
      <span
        className="absolute top-0 h-full w-px bg-live/70"
        style={{ animation: 'sweep 3s linear infinite' }}
      />
    </div>
  );
}

function PipelinePreview() {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full bg-live"
            style={{ animation: 'blink 2.4s ease-in-out infinite', animationDelay: `${i * 0.4}s` }}
          />
          {i < 3 && <span className="h-px w-6 bg-line" />}
        </div>
      ))}
    </div>
  );
}

function AttentionPreview() {
  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: 25 }).map((_, i) => {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const masked = col > row;
        return (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-[2px] ${masked ? 'bg-bg/60' : 'bg-planned/40'}`}
            style={
              masked
                ? undefined
                : { animation: 'blink 2.6s ease-in-out infinite', animationDelay: `${i * 0.06}s` }
            }
          />
        );
      })}
    </div>
  );
}

function MatcherPreview() {
  return (
    <div className="grid grid-cols-6 gap-1">
      {Array.from({ length: 18 }).map((_, i) => {
        const onPath = [0, 7, 8, 15, 16, 17].includes(i);
        return (
          <span
            key={i}
            className={`h-2.5 w-full rounded-[2px] ${onPath ? 'bg-live/50' : 'bg-line'}`}
            style={
              onPath
                ? { animation: 'blink 2.6s ease-in-out infinite', animationDelay: `${i * 0.12}s` }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

function StocksPreview() {
  return (
    <div className="relative h-14 w-full overflow-hidden">
      <svg viewBox="0 0 140 56" className="h-full w-full" preserveAspectRatio="none">
        <polyline
          points="0,44 14,40 28,42 42,34 56,38 70,28 84,32 98,20 112,26 126,14 140,18"
          fill="none"
          stroke="var(--color-live)"
          strokeWidth="1"
          opacity="0.7"
        />
      </svg>
      <span
        className="absolute right-1 top-3 h-2 w-2 rounded-full bg-live"
        style={{ animation: 'blink 2s ease-in-out infinite' }}
      />
    </div>
  );
}

function LockedPreview() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-8 rounded-full bg-planned/30" />
      ))}
    </div>
  );
}

const MAP: Record<PreviewKind, () => ReactElement> = {
  tokenizer: TokenizerPreview,
  orderbook: OrderBookPreview,
  forecast: ForecastPreview,
  pipeline: PipelinePreview,
  attention: AttentionPreview,
  matcher: MatcherPreview,
  stocks: StocksPreview,
  locked: LockedPreview,
};

export function MiniPreview({ kind }: { kind: PreviewKind }) {
  const Component = MAP[kind];
  return (
    <div className="h-16 rounded-md border border-line/60 bg-bg/30 p-3">
      <Component />
    </div>
  );
}
