// Section 13.6: relabel the 500 daily signals in the browser.

export interface SignalRow {
  date: string;
  label: string;
  premium: number | null;
  fv: number | null;
  curve: number | null;
  conf: number | null;
  flags: string[];
}

export type Label = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' | 'INVALIDATED' | 'NO_DATA';

export const labelInfo: Record<Label, { name: string; letter: string }> = {
  STRONG_BUY: { name: 'Strong buy', letter: 'B+' },
  BUY: { name: 'Buy', letter: 'B' },
  HOLD: { name: 'Hold', letter: 'H' },
  SELL: { name: 'Sell', letter: 'S' },
  STRONG_SELL: { name: 'Strong sell', letter: 'S+' },
  INVALIDATED: { name: 'Invalidated', letter: 'X' },
  NO_DATA: { name: 'No data', letter: '–' },
};

export const labelOrder: Label[] = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL', 'INVALIDATED', 'NO_DATA'];

export const flagNames: Record<string, { name: string; trigger: string }> = {
  gas_spike: { name: 'Gas spike', trigger: 'Gas moves more than 5 EUR/MWh or 10%' },
  wind_revision: { name: 'Wind change', trigger: 'More than 15 GW and more than 2 standard deviations' },
  residual_load_swing: { name: 'Residual load swing', trigger: 'More than 15 GW and more than 2 standard deviations' },
  negative_price_regime: { name: 'Negative price regime', trigger: '4 or more negative-price hours predicted' },
  high_error_regime: { name: 'High model error', trigger: 'Rolling miss above twice the cross-validation average' },
};

/** At or above the strong threshold is strong buy, at or above the first is buy, mirrored for sell. */
export function labelFor(premium: number, buy: number, strong: number): Label {
  if (premium >= strong) return 'STRONG_BUY';
  if (premium >= buy) return 'BUY';
  if (premium <= -strong) return 'STRONG_SELL';
  if (premium <= -buy) return 'SELL';
  return 'HOLD';
}

export function relabel(rows: SignalRow[], buy: number, strong: number): Label[] {
  return rows.map((r) => {
    if (r.label === 'INVALIDATED' || r.label === 'NO_DATA' || r.premium === null) return r.label as Label;
    return labelFor(r.premium, buy, strong);
  });
}

export function countLabels(labels: Label[]): Record<Label, number> {
  const c = Object.fromEntries(labelOrder.map((l) => [l, 0])) as Record<Label, number>;
  for (const l of labels) c[l]++;
  return c;
}
