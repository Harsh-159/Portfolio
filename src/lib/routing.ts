// Section 12.2: the routing rule from backend/helpers/router.py, ported.

export const FULL_EXPOSURE_THRESHOLD = 28;
export const FINDER_CAP = 15;
export const ESCAPE_HATCH_CAP = 10;

export const services = [
  {
    slug: 'gmail',
    name: 'Gmail',
    count: 20,
    capability: 'Email: search, read, send, reply, draft, label, archive messages and threads, contacts.',
  },
  {
    slug: 'googlecalendar',
    name: 'Google Calendar',
    count: 29,
    capability: 'Calendar: find/create/update/delete events, check free-busy availability, schedule meetings, attendees.',
  },
  {
    slug: 'googledrive',
    name: 'Google Drive',
    count: 20,
    capability:
      'Files & documents: search, list, read, create, upload, move, rename, delete files and folders; permissions, sharing, comments.',
  },
  {
    slug: 'slack',
    name: 'Slack',
    count: 10,
    capability: 'Team chat: list channels and users, read conversation history and threads, search messages, send messages.',
  },
  {
    slug: 'linear',
    name: 'Linear',
    count: 25,
    capability: 'Issue/project tracking: teams, projects, issues, statuses, assignees, comments, labels, cycles.',
  },
  {
    slug: 'github',
    name: 'GitHub',
    count: 86,
    capability:
      'Code hosting: repos, branches, commits, files, pull requests, reviews, issues, actions/CI, releases, tags, security alerts.',
  },
  {
    slug: 'perplexity',
    name: 'Perplexity',
    count: 1,
    capability: 'Web search: answer questions using current public internet information.',
  },
] as const;

export type ServiceSlug = (typeof services)[number]['slug'];

export const ANCHOR_TOOLS: Record<ServiceSlug, string[]> = {
  gmail: ['GMAIL_FETCH_EMAILS', 'GMAIL_LIST_THREADS'],
  googlecalendar: ['GOOGLECALENDAR_EVENTS_LIST', 'GOOGLECALENDAR_FIND_EVENT'],
  googledrive: ['GOOGLEDRIVE_FIND_FILE', 'GOOGLEDRIVE_FIND_FOLDER'],
  slack: ['slack_list_conversations', 'slack_list_users'],
  linear: ['linear_list_projects', 'linear_list_teams', 'linear_list_issues'],
  github: ['github_search_repositories', 'github_search_pull_requests', 'github_search_issues'],
  perplexity: ['perplexity_search'],
};

export const presets: { label: string; services: ServiceSlug[] }[] = [
  { label: 'Slack only', services: ['slack'] },
  { label: 'Drive only', services: ['googledrive'] },
  { label: 'Gmail and Slack', services: ['gmail', 'slack'] },
  { label: 'GitHub', services: ['github'] },
  { label: 'Everything', services: services.map((s) => s.slug) },
];

export type Outcome =
  | { kind: 'none'; total: 0 }
  | { kind: 'all'; total: number }
  | { kind: 'finder'; total: number; anchors: string[] };

export function route(selected: ServiceSlug[], limit = FULL_EXPOSURE_THRESHOLD): Outcome {
  const total = services.filter((s) => selected.includes(s.slug)).reduce((t, s) => t + s.count, 0);
  if (selected.length === 0) return { kind: 'none', total: 0 };
  if (total <= limit) return { kind: 'all', total };
  const anchors = services.filter((s) => selected.includes(s.slug)).flatMap((s) => ANCHOR_TOOLS[s.slug]);
  return { kind: 'finder', total, anchors };
}

export function outcomeText(o: Outcome): string {
  if (o.kind === 'none') return 'No tools. The agent answers directly.';
  if (o.kind === 'all') return `The model sees all ${o.total} tools. No second model call.`;
  return `Too many. A second model shortlists up to ${FINDER_CAP}. ${o.anchors.length} anchor tools always ride along.`;
}

export function routingInWords(selected: ServiceSlug[], limit: number): string {
  const o = route(selected, limit);
  const n = selected.length;
  if (o.kind === 'none') return 'No services selected. No tools. The agent answers directly.';
  const head = `${n} ${n === 1 ? 'service' : 'services'}, ${o.total} tools.`;
  if (o.kind === 'all') return `${head} Under the limit of ${limit}, so the model sees all ${o.total}.`;
  return `${head} Over the limit of ${limit}, so a finder shortlists up to ${FINDER_CAP} and adds ${o.anchors.length} anchor tools.`;
}
