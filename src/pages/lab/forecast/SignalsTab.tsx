import { useState } from 'react';

// Signal tiers and position sizing mirror the real daily report.
type Tier = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

function tierOf(premium: number): Tier {
  if (premium > 8) return 'STRONG_BUY';
  if (premium >= 3) return 'BUY';
  if (premium > -3) return 'HOLD';
  if (premium >= -8) return 'SELL';
  return 'STRONG_SELL';
}

function sizeOf(confidence: number): { factor: number; label: string } {
  if (confidence >= 75) return { factor: 1, label: 'full position' };
  if (confidence >= 50) return { factor: 0.5, label: 'half position' };
  return { factor: 0, label: 'no position' };
}

const TIER_DIR: Record<Tier, number> = {
  STRONG_BUY: 1,
  BUY: 1,
  HOLD: 0,
  SELL: -1,
  STRONG_SELL: -1,
};

const TIER_COLOUR: Record<Tier, string> = {
  STRONG_BUY: 'text-live',
  BUY: 'text-live',
  HOLD: 'text-muted',
  SELL: 'text-sell',
  STRONG_SELL: 'text-sell',
};

const FLAGS = [
  'gas spike',
  'wind revision',
  'residual load swing',
  'negative price regime',
  'high recent model error',
];

export default function SignalsTab() {
  const [premium, setPremium] = useState(6);
  const [confidence, setConfidence] = useState(80);
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const tier = tierOf(premium);
  const size = sizeOf(confidence);
  const invalidated = Object.values(flags).some(Boolean);
  const position = invalidated || tier === 'HOLD' ? 0 : TIER_DIR[tier] * size.factor;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Forecast premium: {premium > 0 ? '+' : ''}
            {premium} €/MWh
          </span>
          <input
            type="range"
            min={-15}
            max={15}
            value={premium}
            onChange={(e) => setPremium(Number(e.target.value))}
            aria-label="Forecast premium in euro per MWh"
            className="mt-2 w-full accent-[var(--color-live)]"
          />
          <span className="mt-1 flex justify-between font-mono text-[10px] text-muted/60">
            <span>STRONG_SELL</span>
            <span>HOLD</span>
            <span>STRONG_BUY</span>
          </span>
        </label>

        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Confidence: {confidence}%
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            aria-label="Confidence percentage"
            className="mt-2 w-full accent-[var(--color-live)]"
          />
          <span className="font-mono text-[11px] text-muted/60">
            ≥ 75% full · 50 to 75% half · &lt; 50% none
          </span>
        </label>

        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Invalidation flags
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {FLAGS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={!!flags[f]}
                onClick={() => setFlags((prev) => ({ ...prev, [f]: !prev[f] }))}
                className={`rounded-full border px-3 py-1 font-mono text-xs ${
                  flags[f] ? 'border-amber-400 bg-amber-400/15 text-amber-300' : 'border-line text-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Signal card */}
      <div className="rounded-lg border border-line bg-bg/50 p-5 font-mono">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted">Pre-trade signal</span>
          {invalidated ? (
            <span className="rounded border border-amber-400/50 bg-amber-400/15 px-2 py-0.5 text-xs text-amber-300">
              INVALIDATED
            </span>
          ) : (
            <span className={`text-sm font-bold ${TIER_COLOUR[tier]}`}>{tier}</span>
          )}
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">direction</dt>
            <dd className={invalidated ? 'text-muted' : TIER_COLOUR[tier]}>{tier}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">product</dt>
            <dd className="text-fg">M+1 Base</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">premium</dt>
            <dd className="text-fg">
              {premium > 0 ? '+' : ''}
              {premium} €/MWh
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">confidence</dt>
            <dd className="text-fg">{confidence}%</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2">
            <dt className="text-muted">position</dt>
            <dd className="text-fg">
              {position === 0
                ? '0'
                : `${position > 0 ? '+' : ''}${position.toFixed(1)} (${size.label})`}
            </dd>
          </div>
        </dl>

        {invalidated && (
          <p className="mt-4 text-xs leading-relaxed text-amber-300/80">
            An active invalidation flag forces the position to 0, exactly as the daily report does.
          </p>
        )}
      </div>

      <div className="lg:col-span-2">
        <p className="font-mono text-sm text-fg">
          Backtest Sharpe 1.87 · Signal hit rate 66.5%
          <sup className="ml-0.5 text-live">1</sup>
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted/70">
          <sup className="text-live">1</sup> from the signal backtest in the daily report.
        </p>
      </div>
    </div>
  );
}
