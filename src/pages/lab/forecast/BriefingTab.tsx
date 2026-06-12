import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface Briefing {
  reportDate: string;
  deliveryDay: string;
  generated: string;
  status: string;
  product: string;
  premium: number;
  confidence: number;
  position: number;
  thesis: { fairValue: number; curveProxy30d: number; proxy7d: number; proxy90d: number; sparkSpread: number };
  tomorrow: {
    base: number;
    peak: number;
    offpeak: number;
    peakPremium: number;
    settledActual: number;
    error: number;
    avg7dBase: number;
  };
  marketContext: {
    wind: number;
    wind7d: number;
    solar: number;
    residualLoad: number;
    residualLoad7d: number;
    ttfGas: number;
    ttfGas7d: number;
  };
  regime: { type: string; resPenetration: number };
  flags: { name: string; status: string }[];
  footerMetrics: { modelMae: number; directionalAccuracy: number; backtestSharpe: number; signalHitRate: number };
}

const PDF_URL = '/lab/forecast/sample_daily_report.pdf';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-fg">{value}</dd>
    </div>
  );
}

export default function BriefingTab() {
  const [data, setData] = useState<Briefing | null>(null);
  const [hasPdf, setHasPdf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/lab/forecast/briefing_sample.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setData(d as Briefing);
      })
      .catch(() => {});
    // A missing file can be masked by an SPA fallback that returns index.html,
    // so require an actual PDF content-type rather than just a 200.
    fetch(PDF_URL, { method: 'HEAD' })
      .then((r) => {
        const type = (r.headers.get('content-type') || '').toLowerCase();
        if (!cancelled) setHasPdf(r.ok && type.includes('pdf'));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return <p className="font-mono text-sm text-muted">Loading briefing…</p>;
  }

  const eur = (n: number) => `${n > 0 ? '' : ''}${n.toFixed(1)} €`;
  const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Briefing card */}
      <div className="rounded-lg border border-line bg-bg/50 p-5 font-mono text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Pre-trade briefing</div>
            <div className="mt-1 text-fg">{data.product}</div>
            <div className="text-[11px] text-muted/70">
              report {data.reportDate} · delivery {data.deliveryDay} · generated {data.generated}
            </div>
          </div>
          <span className="rounded border border-amber-400/50 bg-amber-400/15 px-2 py-0.5 text-xs text-amber-300">
            {data.status}
          </span>
        </div>

        <div className="grid gap-4 pt-3 sm:grid-cols-2">
          <dl>
            <div className="mb-1 text-xs uppercase tracking-wider text-muted/70">Signal</div>
            <Row label="premium" value={`${signed(data.premium)} €/MWh`} />
            <Row label="confidence" value={`${(data.confidence * 100).toFixed(0)}%`} />
            <Row label="position" value={String(data.position)} />
          </dl>

          <dl>
            <div className="mb-1 text-xs uppercase tracking-wider text-muted/70">Trade thesis</div>
            <Row label="fair value (M+1)" value={eur(data.thesis.fairValue)} />
            <Row label="curve proxy 30d" value={eur(data.thesis.curveProxy30d)} />
            <Row label="proxy 7d" value={eur(data.thesis.proxy7d)} />
            <Row label="proxy 90d" value={eur(data.thesis.proxy90d)} />
            <Row label="spark spread" value={eur(data.thesis.sparkSpread)} />
          </dl>

          <dl>
            <div className="mb-1 text-xs uppercase tracking-wider text-muted/70">Tomorrow (€/MWh)</div>
            <Row label="base" value={data.tomorrow.base.toFixed(1)} />
            <Row label="peak" value={data.tomorrow.peak.toFixed(1)} />
            <Row label="offpeak" value={data.tomorrow.offpeak.toFixed(1)} />
            <Row label="peak premium" value={`${signed(data.tomorrow.peakPremium)} €`} />
            <Row
              label="settled actual"
              value={`${data.tomorrow.settledActual.toFixed(1)} (err ${signed(data.tomorrow.error)})`}
            />
            <Row label="7d avg base" value={eur(data.tomorrow.avg7dBase)} />
          </dl>

          <dl>
            <div className="mb-1 text-xs uppercase tracking-wider text-muted/70">Market context</div>
            <Row label="wind" value={`${data.marketContext.wind} MW (7d ${data.marketContext.wind7d})`} />
            <Row label="solar" value={`${data.marketContext.solar} MW`} />
            <Row
              label="residual load"
              value={`${data.marketContext.residualLoad} MW (7d ${data.marketContext.residualLoad7d})`}
            />
            <Row
              label="TTF gas"
              value={`${data.marketContext.ttfGas} €/MWh (7d ${data.marketContext.ttfGas7d})`}
            />
            <Row label="regime" value={`${data.regime.type} · RES ${data.regime.resPenetration}%`} />
          </dl>
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-2 text-xs uppercase tracking-wider text-muted/70">Invalidation flags</div>
          <div className="flex flex-wrap gap-2">
            {data.flags.map((f) => (
              <span
                key={f.name}
                className={`rounded border px-2 py-0.5 text-xs ${
                  f.status === 'pass'
                    ? 'border-line text-muted'
                    : 'border-amber-400/50 bg-amber-400/15 text-amber-300'
                }`}
              >
                {f.name}: {f.status}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-[11px] text-muted">
          <span>model MAE {data.footerMetrics.modelMae}</span>
          <span>dir. acc {data.footerMetrics.directionalAccuracy}%</span>
          <span>backtest Sharpe {data.footerMetrics.backtestSharpe}</span>
          <span>signal hit rate {data.footerMetrics.signalHitRate}%</span>
        </div>
      </div>

      {/* How it's generated + download */}
      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-surface/40 p-4">
          <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted">
            How the briefing is generated
          </h3>
          <ol className="space-y-2 text-sm leading-relaxed text-muted">
            <li>Evidence cards are assembled from the pipeline outputs above.</li>
            <li>
              A constrained Gemini (gemini-2.0-flash) generation must cite specific numbers and may
              not fabricate.
            </li>
            <li>
              A regex-based post-generation audit validates every citation with zero tolerance, and
              anomaly reports are auto-generated when invalidation flags are active.
            </li>
          </ol>
        </div>

        {hasPdf && (
          <a
            href={PDF_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-sm text-fg hover:border-muted"
          >
            <Download size={16} aria-hidden="true" /> Download a real generated report (PDF)
          </a>
        )}
      </div>
    </div>
  );
}
