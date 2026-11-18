// Section 12.3: the 11 live scenario tests from the log of 2 July 2026.
// "Asserts" lines paraphrase backend/tests/test_live_scenarios.py.

export interface ScenarioRow {
  id: string;
  scenario: string;
  request: string;
  seconds: number;
  routed: number;
  toolCalls: number;
  modelCalls: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  asserts: string;
}

export const scenarios: ScenarioRow[] = [
  {
    id: '1',
    scenario: 'Single-service lookup',
    request: 'What conversations do I have in Slack?',
    seconds: 4.97, routed: 10, toolCalls: 1, modelCalls: 3, tokensIn: 5108, tokensOut: 125, cost: 0.0022,
    asserts: 'Passes only if it lists the Slack conversations in at most two tool calls and the reply names the engineering channel.',
  },
  {
    id: '2',
    scenario: 'Cross-service pipeline that posts to Slack',
    request: 'Find the most recent email about the Q1 revenue review and post a summary of it to the leadership Slack channel.',
    seconds: 11.71, routed: 6, toolCalls: 3, modelCalls: 5, tokensIn: 10040, tokensOut: 320, cost: 0.0045,
    asserts: 'Passes only if it calls Gmail, sends a Slack message and a new message really appears in the Slack mock.',
  },
  {
    id: '3',
    scenario: 'Two independent lookups',
    request: 'List my Slack channels and also list the files in my Drive.',
    seconds: 11.06, routed: 4, toolCalls: 2, modelCalls: 4, tokensIn: 7470, tokensOut: 356, cost: 0.0036,
    asserts: 'Passes only if it calls both Slack and Drive and the reply mentions items from each.',
  },
  {
    id: '4',
    scenario: 'Ambiguous request: asks, changes nothing',
    request: 'Schedule a 30-minute meeting with everyone on the project next week.',
    seconds: 9.4, routed: 13, toolCalls: 1, modelCalls: 4, tokensIn: 14685, tokensOut: 240, cost: 0.0063,
    asserts: 'Passes only if the reply asks a question, no event is created and the calendar is unchanged.',
  },
  {
    id: '5a',
    scenario: 'Clarification, first turn',
    request: 'Same request as 4',
    seconds: 10.21, routed: 12, toolCalls: 1, modelCalls: 4, tokensIn: 14531, tokensOut: 216, cost: 0.0062,
    asserts: 'The first turn of a two-turn test. The test is judged on the second turn.',
  },
  {
    id: '5b',
    scenario: 'Clarification, second turn',
    request: 'The Tool Orchestrator project. Monday next week at 10am works.',
    seconds: 15.93, routed: 8, toolCalls: 4, modelCalls: 7, tokensIn: 33379, tokensOut: 471, cost: 0.0141,
    asserts: 'Passes only if, after the answer, a calendar event is created and really appears in the calendar mock.',
  },
  {
    id: '6',
    scenario: 'Missing file is reported, not invented',
    request: "Delete the file 'budget_2025.xlsx' from my Drive.",
    seconds: 7.51, routed: 20, toolCalls: 1, modelCalls: 3, tokensIn: 11523, tokensOut: 117, cost: 0.0048,
    asserts: 'Passes only if nothing is deleted, the Drive is unchanged and the reply does not claim a deletion.',
  },
  {
    id: '7',
    scenario: 'Clear change is carried out',
    request: "Create a Linear issue titled 'Harden the tool router' in the Engineering team, description 'Follow-ups from live testing'.",
    seconds: 12.91, routed: 25, toolCalls: 2, modelCalls: 4, tokensIn: 25333, tokensOut: 187, cost: 0.0104,
    asserts: 'Passes only if exactly one issue is created and it really appears in the Linear mock.',
  },
  {
    id: '8',
    scenario: 'GitHub question answered without asking which repository',
    request: 'What open pull requests are there right now?',
    seconds: 7.3, routed: 6, toolCalls: 1, modelCalls: 4, tokensIn: 9369, tokensOut: 276, cost: 0.0042,
    asserts: 'Passes only if it calls a pull-request tool, does not ask which repository and names the pull requests in the fixtures.',
  },
  {
    id: '9',
    scenario: '"Today" resolves against the mock clock',
    request: "What's on my calendar today?",
    seconds: 14.01, routed: 4, toolCalls: 2, modelCalls: 5, tokensIn: 10901, tokensOut: 353, cost: 0.0049,
    asserts: "Passes only if it calls the calendar and the reply names the event on the mock world's today.",
  },
  {
    id: '10',
    scenario: 'Small talk makes no tool calls',
    request: 'hi',
    seconds: 6.48, routed: 0, toolCalls: 0, modelCalls: 2, tokensIn: 1314, tokensOut: 16, cost: 0.0006,
    asserts: 'Passes only if no tool is called and the reply is not empty.',
  },
  {
    id: '11',
    scenario: 'Web search goes to Perplexity',
    request: 'Search the web: what is the latest stable version of FastAPI?',
    seconds: 3.38, routed: 1, toolCalls: 1, modelCalls: 3, tokensIn: 2891, tokensOut: 80, cost: 0.0013,
    asserts: 'Passes only if it calls the Perplexity search tool.',
  },
];

export const traceMeta: Record<string, { title: string; request: string; outcome: string }> = {
  'email-to-slack': {
    title: 'Email to Slack',
    request: 'Find the most recent email about the Q1 revenue review and post a summary to the leadership Slack channel.',
    outcome: 'Finds the email, finds the leadership channel, posts the summary',
  },
  'missing-file': {
    title: 'Honest about a missing file',
    request: "Delete the file 'budget_2025.xlsx' from my Drive.",
    outcome: 'Finds no such file, deletes nothing, says so',
  },
  'asks-then-acts': {
    title: 'Asks, then acts',
    request: 'Schedule a 30-minute meeting with everyone on the project next week.',
    outcome: 'Turn 1 asks which of three projects. Turn 2 creates the meeting for Monday 13 April 2026 at 10:00',
  },
};
