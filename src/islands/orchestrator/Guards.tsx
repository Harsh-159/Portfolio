// Section 12.4: Figure 3, what stops a run going wrong.
import { useState } from 'preact/hooks';
import { step, initialLoop, guardInWords, MAX_ITERATIONS, MAX_TOOL_CALLS, MAX_FAILURES_PER_TOOL, type Breakage } from '../../lib/loopGuards';
import { Frame, Icon } from '../shared/ui';

const SWITCHES: { id: Breakage | 'none'; label: string; constant: string }[] = [
  { id: 'none', label: 'Nothing broken', constant: '' },
  { id: 'failing', label: 'Make one tool fail every time', constant: '2 failures per tool' },
  { id: 'repeat', label: 'Make the model repeat a call', constant: 'Same tool, same arguments' },
  { id: 'never-finish', label: 'Never let the model finish', constant: '8 iterations or 24 tool calls' },
  { id: 'huge', label: 'Return a huge result', constant: '6,000 characters' },
];

export default function Guards() {
  const [sw, setSw] = useState<Breakage | 'none'>('failing');
  const [s, setS] = useState(initialLoop());
  const b = sw === 'none' ? null : sw;
  const reset = () => setS(initialLoop());

  return (
    <Frame
      id="guards"
      num={3}
      title="What stops a run going wrong"
      badge="live"
      onReset={() => {
        setSw('failing');
        reset();
      }}
      words={guardInWords(b)}
      what="A small state machine with the loop's real limits. Choose what to break, then step through the run one iteration at a time."
      tryThis={['Step three times with a failing tool.', 'Choose "Never let the model finish" and step until the limit stops it.']}
      controls={
        <fieldset>
          <legend>What to break</legend>
          {SWITCHES.map((x) => (
            <label class="px-preset">
              <input
                type="radio"
                name="guard-sw"
                checked={sw === x.id}
                onChange={() => {
                  setSw(x.id);
                  reset();
                }}
              />
              <span>
                {x.label}
                {x.constant && <span class="soft small">. Limit: {x.constant}</span>}
              </span>
            </label>
          ))}
        </fieldset>
      }
    >
      <div class="guard-counters" aria-live="polite">
        <div>
          <span class="small soft">Iterations</span>
          <strong>
            {Math.min(s.iteration, MAX_ITERATIONS)} of {MAX_ITERATIONS}
          </strong>
        </div>
        <div>
          <span class="small soft">Tool calls</span>
          <strong>
            {s.toolCalls} of {MAX_TOOL_CALLS}
          </strong>
        </div>
        <div>
          <span class="small soft">Failures, broken tool</span>
          <strong>
            {s.failures} of {MAX_FAILURES_PER_TOOL}
          </strong>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" type="button" onClick={() => setS(step(s, b))} disabled={s.finished}>
          <Icon name="step" size={16} /> Step
        </button>
        <button class="btn" type="button" onClick={reset}>
          Start again
        </button>
        {s.finished && <span class="small soft">The run has ended.</span>}
      </div>
      <ol class="guard-log" aria-label="Run log">
        {s.log.map((l) => (
          <li>{l}</li>
        ))}
        {!s.log.length && <li class="soft">Press Step to run the first iteration.</li>}
      </ol>
    </Frame>
  );
}
