import { useEffect, useMemo, useState } from 'react';
import { DemoChrome, HonestyBadge } from '../../components/DemoChrome';
import { computeAttention } from '../../lib/attention';

const STEPS = [
  { n: 1, label: 'Embeddings', hint: 'Each token becomes a row of 16 values.' },
  { n: 2, label: 'Scores (Q·Kᵀ)', hint: 'Raw similarity of every query to every key.' },
  { n: 3, label: 'Causal mask', hint: 'A token may not attend to the future.' },
  { n: 4, label: 'Softmax', hint: 'Each row becomes a probability distribution.' },
  { n: 5, label: 'Output', hint: 'Hover a token to see where it attends.' },
] as const;

/** Map a value in [min,max] to a violet cell background. */
function heat(value: number, min: number, max: number): string {
  if (value === -Infinity) return 'transparent';
  const t = max === min ? 0.5 : (value - min) / (max - min);
  return `rgba(139, 92, 246, ${(0.12 + t * 0.85).toFixed(3)})`;
}

export default function Attention() {
  const [sentence, setSentence] = useState('the cat sat on the mat because it was tired');
  const [step, setStep] = useState(1);
  const [hovered, setHovered] = useState<number | null>(null);

  const result = useMemo(() => computeAttention(sentence), [sentence]);
  const { tokens, embeddings, scores, masked, weights } = result;
  const n = tokens.length;

  // Keyboard navigation across the stepper.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, 5));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const matrixForStep = step === 2 ? scores : step === 3 ? masked : weights;
  const flat = matrixForStep.flat().filter((v) => v !== -Infinity);
  const min = flat.length ? Math.min(...flat) : 0;
  const max = flat.length ? Math.max(...flat) : 1;

  return (
    <DemoChrome labId="attention">
      <div className="mb-5 flex flex-col gap-3">
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Sentence (up to 12 tokens)
          </span>
          <input
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            aria-label="Input sentence"
            className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-muted"
          />
        </label>
        <HonestyBadge>
          Toy weights for illustration. Real weights arrive when my training run completes.
        </HonestyBadge>
      </div>

      {/* Stepper */}
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Attention steps">
        {STEPS.map((s) => (
          <button
            key={s.n}
            role="tab"
            aria-selected={step === s.n}
            onClick={() => setStep(s.n)}
            className={`rounded-md border px-3 py-1.5 font-mono text-xs ${
              step === s.n ? 'border-planned bg-planned/15 text-planned' : 'border-line text-muted'
            }`}
          >
            {s.n}. {s.label}
          </button>
        ))}
      </div>
      <p className="mb-6 font-mono text-sm text-muted">{STEPS[step - 1].hint}</p>

      {n === 0 ? (
        <p className="font-mono text-sm text-muted">Type a sentence above.</p>
      ) : step === 1 ? (
        <div className="overflow-auto">
          <div className="space-y-1">
            {tokens.map((tok, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-20 shrink-0 truncate text-right font-mono text-xs text-muted">
                  {tok}
                </span>
                <div className="flex gap-0.5">
                  {embeddings[i].map((v, j) => (
                    <span
                      key={j}
                      className="h-4 w-4 rounded-[2px]"
                      style={{ backgroundColor: heat(v, -1, 1) }}
                      title={v.toFixed(2)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="border-collapse font-mono text-[11px]">
            <tbody>
              <tr>
                <td className="p-1" />
                {tokens.map((tok, j) => (
                  <td key={j} className="max-w-12 truncate p-1 text-center text-muted">
                    {tok}
                  </td>
                ))}
              </tr>
              {matrixForStep.map((row, i) => {
                const dim = step === 5 && hovered !== null && hovered !== i;
                return (
                  <tr
                    key={i}
                    onMouseEnter={() => step === 5 && setHovered(i)}
                    onMouseLeave={() => step === 5 && setHovered(null)}
                    className={step === 5 ? 'cursor-pointer' : ''}
                  >
                    <td className="whitespace-nowrap p-1 text-right text-muted">{tokens[i]}</td>
                    {row.map((val, j) => {
                      const isFuture = j > i;
                      return (
                        <td
                          key={j}
                          className="p-0.5"
                          style={{ opacity: dim ? 0.25 : 1 }}
                        >
                          <div
                            className="flex h-8 w-10 items-center justify-center rounded-[3px] text-fg"
                            style={{
                              backgroundColor:
                                step === 3 && isFuture ? 'transparent' : heat(val, min, max),
                              border:
                                step === 3 && isFuture ? '1px dashed var(--color-line)' : 'none',
                              color: step === 3 && isFuture ? 'var(--color-muted)' : undefined,
                            }}
                          >
                            {step === 3 && isFuture
                              ? '—'
                              : val === -Infinity
                                ? ''
                                : step === 4 || step === 5
                                  ? val.toFixed(2)
                                  : val.toFixed(1)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {step === 5 && (
            <p className="mt-3 font-mono text-xs text-muted">
              {hovered === null
                ? 'Hover a row: each value is how much that token attends to an earlier token.'
                : `"${tokens[hovered]}" attends most to "${
                    tokens[weights[hovered].indexOf(Math.max(...weights[hovered]))]
                  }".`}
            </p>
          )}
        </div>
      )}
    </DemoChrome>
  );
}
