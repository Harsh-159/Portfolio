// Section 9.2: the real topology of the approval-rule pipeline, as typed data.
// Layout, call counts and timings are all computed from this file.

import { confirmed } from './site';

export type NodeKind = 'input' | 'ai' | 'code';
export type Branch = 'add' | 'update';

export const builders = [
  { slug: 'users', name: 'Users', explanation: 'Named people', example: { users: ['A. Example'] } },
  {
    slug: 'application-role',
    name: 'Application Role',
    explanation: 'Everyone who holds a given role in the application',
    example: { role: 'HR Specialist' },
  },
  {
    slug: 'approval-group',
    name: 'Approval Group',
    explanation: 'A predefined group of approvers',
    example: { group: 'Travel approvers' },
  },
  {
    slug: 'management-hierarchy',
    name: 'Management Hierarchy',
    explanation: "The requester's line managers, going up the chain",
    example: { startWith: 'Manager', levels: 2 },
  },
  {
    slug: 'representative',
    name: 'Representative',
    explanation: 'A designated representative for the person concerned, such as an HR representative',
    example: { representativeType: 'HR representative' },
  },
  {
    slug: 'position-hierarchy',
    name: 'Position Hierarchy',
    explanation: "Approvers found by walking up the organisation's position structure",
    example: { startWith: "Requester's position", levels: 2 },
  },
  {
    slug: 'job-level-hierarchy',
    name: 'Job Level Hierarchy',
    explanation: 'Line managers going up the chain until a set job level is reached',
    example: {
      node: 'Job Level Hierarchy',
      action: 'Approval required',
      approvalChainOf: 'Requester',
      startWith: 'Manager',
      minimumJobLevel: 1,
      topApprover: 'Manager',
      include: 'All approvers',
    },
  },
] as const;

export type BuilderSlug = (typeof builders)[number]['slug'];
export const builderSlugs = builders.map((b) => b.slug) as BuilderSlug[];
export const builderName = (slug: BuilderSlug) => builders.find((b) => b.slug === slug)!.name;

export interface PipelineNode {
  id: string;
  label: string;
  kind: NodeKind;
  does: string;
  branch?: Branch | 'delete';
  builder?: BuilderSlug;
}

const branchNodes = (b: Branch): PipelineNode[] => [
  {
    id: `${b}.condition`,
    label: 'Condition',
    kind: 'ai',
    branch: b,
    does:
      b === 'add'
        ? 'Picks out the condition and writes it as condition text with the right brackets'
        : 'Same job as in the add branch, for the rule being changed',
  },
  {
    id: `${b}.semantic`,
    label: 'Semantic match',
    kind: 'ai',
    branch: b,
    does:
      b === 'add'
        ? 'Matches the attributes named in the condition to the real attributes, by meaning'
        : 'Same job as in the add branch',
  },
  {
    id: `${b}.classify`,
    label: 'Classify',
    kind: 'ai',
    branch: b,
    does:
      b === 'add'
        ? 'Decides which list builder the request needs, and its position in the rule'
        : "Same job, working from the rule's existing nodes",
  },
  ...builders.map(
    (x): PipelineNode => ({
      id: `${b}.builder.${x.slug}`,
      label: x.name,
      kind: 'ai',
      branch: b,
      builder: x.slug,
      does:
        b === 'add'
          ? confirmed.builderExplanations
            ? `Fills in the settings for that kind of approver list. ${x.name}: ${x.explanation.charAt(0).toLowerCase() + x.explanation.slice(1)}`
            : 'Fills in the settings for that kind of approver list'
          : 'Same job as in the add branch',
    }),
  ),
];

export const nodes: PipelineNode[] = [
  {
    id: 'request',
    label: "Administrator's request",
    kind: 'input',
    does: 'Plain text typed in the Approval Rules screen: add a rule, update a rule, delete a rule',
  },
  {
    id: 'split',
    label: 'Split',
    kind: 'ai',
    does: 'Splits the request into add, update and delete parts. Picks out the rule each part refers to. Returns JSON',
  },
  ...branchNodes('add'),
  ...branchNodes('update'),
  {
    id: 'delete',
    label: 'Delete',
    kind: 'ai',
    branch: 'delete',
    does: 'Finds the list builder to remove and its position',
  },
  {
    id: 'merge',
    label: 'Merge',
    kind: 'code',
    does: 'Combines the add, update and delete results with the existing rules JSON',
  },
  {
    id: 'render',
    label: 'Draw and save',
    kind: 'code',
    does: 'The screen draws the updated rules as a diagram. Saving goes through the existing rules API',
  },
];

/** Every edge carries JSON. Builder edges are expanded per builder. */
export const edges: [string, string][] = [
  ['request', 'split'],
  ...(['add', 'update'] as Branch[]).flatMap((b): [string, string][] => [
    ['split', `${b}.condition`],
    ['split', `${b}.classify`],
    [`${b}.condition`, `${b}.semantic`],
    [`${b}.semantic`, 'merge'],
    ...builderSlugs.flatMap((s): [string, string][] => [
      [`${b}.classify`, `${b}.builder.${s}`],
      [`${b}.builder.${s}`, 'merge'],
    ]),
  ]),
  ['split', 'delete'],
  ['delete', 'merge'],
  ['merge', 'render'],
];

export const presets = [
  {
    id: 1,
    text: 'Add a rule: if the department is Sales, send to the management hierarchy.',
    ops: { add: 'management-hierarchy' as BuilderSlug, update: null, del: false },
  },
  {
    id: 2,
    text: 'Update the travel rule so the approval group signs it off.',
    ops: { add: null, update: 'approval-group' as BuilderSlug, del: false },
  },
  { id: 3, text: 'Delete the old relocation rule.', ops: { add: null, update: null, del: true } },
  {
    id: 4,
    text: 'Add a rule for the Sales department, update the travel rule and delete the old one.',
    ops: { add: 'management-hierarchy' as BuilderSlug, update: 'approval-group' as BuilderSlug, del: true },
  },
];

/** Illustrative inspector examples for preset 4 (section 9.4). */
export const inspectorOut: Record<string, unknown> = {
  request: 'Add a rule for the Sales department, update the travel rule and delete the old one.',
  split: {
    add: { rule: 'Sales approvals', text: 'if the department is Sales, send to the management hierarchy' },
    update: { rule: 'Travel', text: 'the approval group signs it off' },
    delete: { rule: 'Relocation' },
  },
  'add.condition': { condition: '(Department = "Sales")' },
  'add.semantic': { named: 'department', matched: 'Department', operator: 'equals', value: 'Sales' },
  'add.classify': { listBuilder: 'Management Hierarchy', position: 1 },
  'add.builder.management-hierarchy': {
    node: 'Management Hierarchy',
    action: 'Approval required',
    startWith: 'Manager',
    levels: 2,
  },
  'update.condition': { condition: '(Rule = "Travel")' },
  'update.semantic': { named: 'travel rule', matched: 'Travel', operator: 'equals', value: 'Travel' },
  'update.classify': { listBuilder: 'Approval Group', position: 1 },
  'update.builder.approval-group': { node: 'Approval Group', action: 'Approval required', group: 'Travel approvers' },
  delete: { rule: 'Relocation', listBuilder: 'Approval Group', position: 1 },
  merge: 'The existing rules JSON with one rule added, one changed and one removed',
  render: 'The updated rules, drawn as a diagram for the administrator to save',
};

export const PROMPT_TOTAL_LINE =
  '19 prompts exist in total: five for routing and extraction, and seven list-builder prompts each for add and for update. One request uses between 2 and 10 of them.';
