// Section 12.4: the orchestration loop's real limits, as a small state machine.

export const MAX_ITERATIONS = 8;
export const MAX_TOOL_CALLS = 24;
export const MAX_FAILURES_PER_TOOL = 2;
export const RESULT_CHAR_LIMIT = 6000;

export type Breakage = 'failing' | 'repeat' | 'never-finish' | 'huge';

export interface LoopState {
  iteration: number;
  toolCalls: number;
  failures: number;
  refused: boolean;
  cacheHits: number;
  truncatedChars: number;
  finished: boolean;
  wrapUp: boolean;
  log: string[];
}

export const initialLoop = (): LoopState => ({
  iteration: 0,
  toolCalls: 0,
  failures: 0,
  refused: false,
  cacheHits: 0,
  truncatedChars: 0,
  finished: false,
  wrapUp: false,
  log: [],
});

/** The size of the huge result the "Return a huge result" switch produces. */
export const HUGE_RESULT_CHARS = 48210;

/**
 * Advance one iteration. Without a breakage switch on, the model calls one tool,
 * gets a good result, then replies on the next iteration.
 */
export function step(s: LoopState, breakage: Breakage | null): LoopState {
  if (s.finished) return s;
  const next: LoopState = { ...s, log: [...s.log], iteration: s.iteration + 1 };
  const it = next.iteration;

  if (s.wrapUp) {
    next.finished = true;
    next.log.push(`Iteration ${it}: tools are off. The model writes an honest wrap-up and the run ends.`);
    return next;
  }

  switch (breakage) {
    case 'failing': {
      if (s.refused) {
        next.finished = true;
        next.log.push(`Iteration ${it}: the model reports that the tool failed and stops. No success is claimed.`);
        return next;
      }
      next.toolCalls++;
      next.failures++;
      if (next.failures >= MAX_FAILURES_PER_TOOL) {
        next.refused = true;
        next.log.push(
          `Iteration ${it}: the tool fails again (${next.failures} of ${MAX_FAILURES_PER_TOOL}). It is now refused. The model is told to try another approach or report the failure honestly.`,
        );
      } else {
        next.log.push(`Iteration ${it}: the tool fails (${next.failures} of ${MAX_FAILURES_PER_TOOL}). The error goes back to the model.`);
      }
      return next;
    }
    case 'repeat': {
      next.toolCalls++;
      if (it === 1) {
        next.log.push(`Iteration ${it}: the model calls a tool and gets a result.`);
      } else if (it <= 3) {
        next.cacheHits++;
        next.log.push(
          `Iteration ${it}: the model repeats the same call with the same arguments. It is answered from the cache, with a note not to repeat calls.`,
        );
      } else {
        next.finished = true;
        next.toolCalls--;
        next.log.push(`Iteration ${it}: the model stops repeating itself and replies.`);
      }
      return next;
    }
    case 'never-finish': {
      next.toolCalls += 3;
      next.log.push(`Iteration ${it}: the model asks for three more tool calls instead of replying.`);
      if (next.iteration >= MAX_ITERATIONS || next.toolCalls >= MAX_TOOL_CALLS) {
        next.wrapUp = true;
        const which = next.toolCalls >= MAX_TOOL_CALLS ? `${MAX_TOOL_CALLS} tool calls` : `${MAX_ITERATIONS} iterations`;
        next.log.push(`Limit reached: ${which}. Tools are switched off for the next turn.`);
      }
      return next;
    }
    case 'huge': {
      if (it === 1) {
        next.toolCalls++;
        next.truncatedChars = HUGE_RESULT_CHARS - RESULT_CHAR_LIMIT;
        next.log.push(
          `Iteration ${it}: the tool returns ${HUGE_RESULT_CHARS.toLocaleString('en-GB')} characters. The result is cut to ${RESULT_CHAR_LIMIT.toLocaleString('en-GB')} and the model is told that ${next.truncatedChars.toLocaleString('en-GB')} were removed.`,
        );
      } else {
        next.finished = true;
        next.log.push(`Iteration ${it}: the model replies from the part it received.`);
      }
      return next;
    }
    default: {
      if (it === 1) {
        next.toolCalls++;
        next.log.push(`Iteration ${it}: the model calls a tool and gets a result.`);
      } else {
        next.finished = true;
        next.log.push(`Iteration ${it}: the model replies in text and the run ends.`);
      }
      return next;
    }
  }
}

export function guardInWords(b: Breakage | null): string {
  switch (b) {
    case 'failing':
      return 'After 2 failures the tool is refused. The agent must use another approach or say that it failed.';
    case 'repeat':
      return 'A repeated call with the same arguments is answered from a cache, with a note not to repeat calls.';
    case 'never-finish':
      return 'At 8 iterations or 24 tool calls, tools are switched off and the model must write an honest wrap-up.';
    case 'huge':
      return 'Results longer than 6,000 characters are cut, and the model is told how much was removed.';
    default:
      return 'Nothing is broken. The model calls one tool, reads the result and replies.';
  }
}
