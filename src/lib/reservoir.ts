// Section 14: a toy Simple Cycle Reservoir, the gate blend and the run id.

/** Decimal digits of pi after the decimal point. */
export const PI_DIGITS = '14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651';

/** An odd digit gives minus, an even digit gives plus. */
export function signs(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (Number(PI_DIGITS[i]) % 2 === 1 ? -1 : 1));
}

/** Each unit takes tanh of r times its neighbour's last value plus v times the input, with a fixed sign. */
export function reservoirStep(x: number[], u: number, r: number, v: number, sg: number[]): number[] {
  const n = x.length;
  return x.map((_, i) => Math.tanh(r * x[(i - 1 + n) % n] + sg[i] * v * u));
}

/** Steps for a pulse to fade to 5%: ln(0.05) / ln(r), rounded. */
export function fadeSteps(r: number): number {
  return Math.round(Math.log(0.05) / Math.log(r));
}

export type InputKind = 'sine' | 'square' | 'regime';

export function inputAt(kind: InputKind, t: number): number {
  switch (kind) {
    case 'sine':
      return Math.sin((2 * Math.PI * t) / 25);
    case 'square':
      return Math.floor(t / 15) % 2 === 0 ? 1 : -1;
    case 'regime': {
      // Calm, then turbulent: a deterministic pseudo-noise of growing amplitude.
      const phase = t % 120;
      const amp = phase < 60 ? 0.15 : 0.9;
      const noise = Math.sin(t * 12.9898) * 43758.5453;
      return amp * (2 * (noise - Math.floor(noise)) - 1);
    }
  }
}

export const logistic = (z: number) => 1 / (1 + Math.exp(-z));

/** The gate value for the "How turbulent is the market?" slider. */
export const gateValue = (turbulence: number) => logistic((turbulence - 50) / 10);

export const CALM_EXPERT = [0.4, 0.3, 0.2, 0.1];
export const TURBULENT_EXPERT = [0.1, 0.1, 0.3, 0.5];

export function blend(g: number, a = CALM_EXPERT, b = TURBULENT_EXPERT): number[] {
  return a.map((x, i) => (1 - g) * x + g * b[i]);
}

export interface RunSettings {
  reservoirSize: number;
  experts: number;
  seed: number;
}

/** First 10 characters of a SHA-256 hash of the settings. */
export async function runId(s: RunSettings): Promise<string> {
  const text = JSON.stringify({ reservoirSize: s.reservoirSize, experts: s.experts, seed: s.seed });
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 10);
}
