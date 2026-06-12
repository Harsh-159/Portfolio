import { useState } from 'react';
import { DemoChrome } from '../../components/DemoChrome';
import ForecastTab from './forecast/ForecastTab';
import SignalsTab from './forecast/SignalsTab';
import BriefingTab from './forecast/BriefingTab';
import PipelineQaTab from './forecast/PipelineQaTab';
import ModelsTab from './forecast/ModelsTab';

const TABS = ['Forecast', 'Signals', 'Briefing', 'Pipeline & QA', 'Models'] as const;
type Tab = (typeof TABS)[number];

const PRIMARY_STATS = [
  { value: '13.6 €/MWh', label: 'Hourly MAE' },
  { value: '86.7%', label: 'Directional accuracy' },
  { value: '+0.61', label: 'Skill vs naive' },
  { value: 'Nov 2024 to Mar 2026', label: 'OOS (11,999 h)' },
];

const SECONDARY_STATS = [
  { value: '5.79', label: 'Weekly MAE' },
  { value: '4.00', label: 'Monthly MAE' },
  { value: '60+', label: 'features' },
  { value: 'LGBM + Ridge + AR + EW', label: 'ensemble' },
];

export default function Forecast() {
  const [tab, setTab] = useState<Tab>('Forecast');

  return (
    <DemoChrome labId="forecast">
      {/* Page-level stat tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {PRIMARY_STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-surface/40 p-4">
            <div className="font-mono text-lg text-fg">{s.value}</div>
            <div className="mt-1 font-mono text-xs text-muted">
              {s.label}
              <sup className="ml-0.5 text-live">1</sup>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {SECONDARY_STATS.map((s) => (
          <div key={s.label} className="rounded-md border border-line/60 bg-surface/20 p-3">
            <div className="font-mono text-sm text-fg">{s.value}</div>
            <div className="font-mono text-[11px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] text-muted/70">
        <sup className="text-live">1</sup> From the project&apos;s out-of-sample evaluation.
      </p>

      {/* Tab bar */}
      <div
        className="mt-8 flex gap-1 overflow-x-auto border-b border-line"
        role="tablist"
        aria-label="DE_LU Power Intelligence sections"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 font-mono text-sm transition-colors ${
              tab === t ? 'border-live text-fg' : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Active tab (mounted on demand) */}
      <div className="mt-6">
        {tab === 'Forecast' && <ForecastTab />}
        {tab === 'Signals' && <SignalsTab />}
        {tab === 'Briefing' && <BriefingTab />}
        {tab === 'Pipeline & QA' && <PipelineQaTab />}
        {tab === 'Models' && <ModelsTab />}
      </div>
    </DemoChrome>
  );
}
