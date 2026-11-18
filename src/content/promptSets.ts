// Sections 10.5 to 10.7: three test sets with fixed answers, written for this page.

import type { Case, Format, Matching, Guards } from '../lib/promptBench';

export interface TestSet {
  id: 'builder' | 'jlh' | 'explain';
  name: string;
  prompt: string;
  variable: string;
  format: Format;
  matching: Matching;
  threshold: number;
  guards: Guards;
  cases: Case[];
  suggestion: string;
}

const same = (a: string): [string, string, string] => [a, a, a];

const B = (sentence: string, expected: string, a: [string, string, string], b: [string, string, string], latency: number): Case => ({
  inputs: { sentence },
  expected,
  answersA: a,
  answersB: b,
  latency,
});

const builder: TestSet = {
  id: 'builder',
  name: 'Pick the list builder',
  prompt:
    'Reply with the one list builder this sentence describes. Choose from: users, application role, approval group, management hierarchy, representative, position hierarchy, job level hierarchy. Sentence: {sentence}',
  variable: 'sentence',
  format: 'string',
  matching: 'exact',
  threshold: 0.8,
  guards: { validJson: false, noEmpty: false, maxChars: null },
  suggestion:
    'Reply in lower case with the name only and no punctuation. A position structure means position hierarchy, not management hierarchy.',
  cases: [
    B("Send it up the requester's management chain.", 'management hierarchy', same('management hierarchy'), same('management hierarchy'), 812),
    B('The travel approvers group should sign this off.', 'approval group', ['Approval Group', 'Approval Group', 'approval group'], same('approval group'), 764),
    B('Route it to Priya Shah and Tom Reed.', 'users', same('users'), same('users'), 905),
    B('Anyone with the HR Specialist role can approve.', 'application role', same('application role '), same('application role'), 1338),
    B("Ask the employee's HR representative.", 'representative', same('representative'), same('representative'), 791),
    B(
      'Go up the line managers until job level 5.',
      'job level hierarchy',
      ['job level hierarchy', 'job level hierarchy', 'management hierarchy'],
      ['job level hierarchy', 'job level hierarchy', 'management hierarchy'],
      876,
    ),
    B('Follow the position structure above the requester.', 'position hierarchy', same('management hierarchy'), same('position hierarchy'), 1012),
    B('The facilities approvals group, then stop.', 'approval group', ['Approval group.', 'approval group', 'Approval group.'], same('approval group'), 770),
  ],
};

const jlhExpected = (startWith: string, minimumJobLevel: number, topApprover: string) =>
  JSON.stringify({
    node: 'Job Level Hierarchy',
    action: 'Approval required',
    approvalChainOf: 'Requester',
    startWith,
    minimumJobLevel,
    topApprover,
    include: 'All approvers',
  });

const e1 = jlhExpected('Manager', 1, 'Manager');
const e2 = jlhExpected('Second level manager', 1, 'Manager');
const e3 = jlhExpected('Manager', 1, "Worker's current assignment");
const e4 = jlhExpected('Manager', 3, 'Manager');
const e5 = jlhExpected('Second level manager', 2, 'Manager');

const a1 = `{
  "include": "All approvers",
  "node": "Job Level Hierarchy",
  "topApprover": "Manager",
  "action": "Approval required",
  "minimumJobLevel": 1,
  "approvalChainOf": "Requester",
  "startWith": "Manager"
}`;
const a3 = `Here is the JSON: ${e3}`;
const a4 = e4.replace('"minimumJobLevel":3', '"minimumJobLevel":"3"');
const a5 = JSON.stringify({
  node: 'Job Level Hierarchy',
  startWith: 'Second level manager',
  minimumJobLevel: 2,
  action: 'Approval required',
  topApprover: 'Manager',
  approvalChainOf: 'Requester',
  include: 'All approvers',
});

const J = (description: string, expected: string, a: string, latency: number): Case => ({
  inputs: { description },
  expected,
  answersA: same(a),
  answersB: same(expected),
  latency,
});

const jlh: TestSet = {
  id: 'jlh',
  name: 'Fill in a Job Level Hierarchy node',
  prompt:
    'Turn the description into JSON with exactly these keys: node, action, approvalChainOf, startWith, minimumJobLevel, topApprover, include. Description: {description}',
  variable: 'description',
  format: 'json',
  matching: 'exact',
  threshold: 0.8,
  guards: { validJson: false, noEmpty: false, maxChars: null },
  suggestion: 'Reply with the JSON object only, with no other words. Write numbers as numbers, not text.',
  cases: [
    J(
      "Approval is required. Use the requester's chain, start with the manager, minimum job level 1, top approver is the manager, include all approvers.",
      e1,
      a1,
      1420,
    ),
    J('Same, but start with the second level manager.', e2, e2, 1385),
    J("Same as 1, but the top approver is the worker's current assignment.", e3, a3, 1510),
    J('Same as 1, but minimum job level 3.', e4, a4, 1462),
    J('Start with the second level manager, minimum job level 2.', e5, a5, 1398),
  ],
};

const X = (rule: string, expected: string, a: string, b: string, latency: number): Case => ({
  inputs: { rule },
  expected,
  answersA: same(a),
  answersB: same(b),
  latency,
});

const explain: TestSet = {
  id: 'explain',
  name: 'Explain a rule in one sentence',
  prompt:
    'Explain this approval rule to a new administrator in one sentence of at most 160 characters. Rule: {rule}',
  variable: 'rule',
  format: 'string',
  matching: 'semantic',
  threshold: 0.8,
  guards: { validJson: false, noEmpty: false, maxChars: 160 },
  suggestion: 'Reuse the key words of the rule. Do not add anything the rule does not say.',
  cases: [
    X(
      'If department is Sales, send to the management hierarchy, two levels.',
      "Requests from the Sales department go to the requester's manager and then to that manager's manager.",
      "Requests from the Sales department go to the requester's manager, then to that manager's manager.",
      "Requests from the Sales department go to the requester's manager, then to that manager's manager.",
      1105,
    ),
    X(
      'If amount is over 5,000, send to the approval group Travel approvers.',
      'Requests over 5,000 go to the Travel approvers group.',
      'Any request above 5,000 is sent to the group called Travel approvers.',
      'Requests over 5,000 go to the Travel approvers group.',
      987,
    ),
    X(
      'Always send to the HR representative.',
      "Every request goes to the employee's HR representative.",
      'Every request goes to the HR representative of the employee.',
      'Every request goes to the HR representative of the employee.',
      1042,
    ),
    X(
      'If location is Dubai, send to users Priya Shah and Tom Reed.',
      'Requests from Dubai go to Priya Shah and Tom Reed.',
      'Requests from Dubai go to Priya Shah and Tom Reed, who must both approve before anything else happens, and the request then waits in their queues until each of them has responded to it.',
      'Requests from Dubai go to Priya Shah and Tom Reed.',
      1620,
    ),
    X(
      'If job level is below 3, send up line managers until job level 5.',
      'Requests from staff below job level 3 go up the line managers until one at job level 5 approves.',
      'The request is rejected automatically.',
      'Requests from staff below job level 3 go up the line managers until one reaches job level 5.',
      930,
    ),
  ],
};

export const testSets: TestSet[] = [builder, jlh, explain];
