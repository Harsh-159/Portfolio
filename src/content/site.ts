// Section 3.1: identity and contact. The only place these values live.

export const site = {
  name: 'Harsh Yadav',
  role: 'AI engineer',
  positioning: 'I make LLM agents dependable in production.',
  location: 'Based in the UK. Available immediately.',
  email: 'harshyadavhappy@gmail.com',
  linkedin: 'https://www.linkedin.com/in/harsh-yadav-01/',
  github: 'https://github.com/Harsh-159',
  cv: '/cv.pdf',
  photo: '/harsh.webp',
  origin: 'https://harsh-yadav-portfolio-ai.vercel.app',
  description:
    'Harsh Yadav, AI engineer. I make LLM agents dependable in production. Eight runnable demos built from real projects, each labelled with what is real and what is rebuilt.',
  /** Section 6.9. Off by default. */
  analytics: false,
} as const;

export const homeNav = [
  { id: 'lab', label: 'Lab' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
] as const;

export const homeSections = [
  { id: 'proof', label: 'What I claim, and where to check it' },
  { id: 'lab', label: 'The lab' },
  { id: 'more-work', label: 'More work' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'awards', label: 'Awards' },
  { id: 'skills', label: 'Skills, with evidence' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Get in touch' },
] as const;

export const ORACLE_INTERNAL = 'The original code is internal to Oracle.';

/**
 * Items the spec marks "(confirm)". Each stays off the site until Harsh confirms it
 * (see OPEN_QUESTIONS.md). Set a flag to true to show it.
 */
export const confirmed = {
  /** "19 prompts exist in total: five for routing and extraction, and seven list-builder prompts each..." */
  promptBreakdown: false,
  /** The one-line explanation of each of the seven list builders. */
  builderExplanations: false,
  /** "Each prompt has one job, so each could be tested on its own with the prompt testing tool." */
  smallPromptsReason: false,
  /** The note that the 1,183 solar error flags are false alarms. */
  dataCheckNote: false,
} as const;
