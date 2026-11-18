// Post-build link check: every internal link and fragment must resolve in dist/,
// and outbound links must be on the list of known destinations.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

const allowedExternal = [
  'https://github.com/Harsh-159',
  'https://github.com/Harsh-159/tool_orchestrator',
  'https://github.com/Harsh-159/day_ahead_price_forcasting',
  'https://github.com/Harsh-159/evolutionary-maxsat-solver',
  'https://github.com/Harsh-159/GFA-EquiShift',
  'https://github.com/Harsh-159/Automated-AI-Powered-DeFi-Trading-System',
  'https://github.com/Harsh-159/robotics-assignment',
  'https://github.com/Harsh-159/Stock-Simulator',
  'https://www.linkedin.com/in/harsh-yadav-01/',
  'https://doi.org/10.1109/TNN.2010.2089641',
  'https://harsh-yadav-portfolio-ai.vercel.app',
];

const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const html = walk(DIST).filter((f) => f.endsWith('.html'));
const pageOf = (path) => {
  const clean = path.replace(/\/$/, '') || '/';
  if (clean === '/') return join(DIST, 'index.html');
  for (const c of [join(DIST, `${clean}.html`), join(DIST, clean, 'index.html'), join(DIST, clean)]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
};
const ids = new Map();
const idsOf = (file) => {
  if (!ids.has(file)) {
    const src = readFileSync(file, 'utf8');
    ids.set(file, new Set([...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return ids.get(file);
};

const errors = [];
for (const file of html) {
  const src = readFileSync(file, 'utf8');
  if (/http-equiv="refresh"/.test(src)) continue; // redirect pages
  for (const m of src.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    const href = m[1].replace(/&amp;/g, '&');
    const where = relative(DIST, file);
    if (href.startsWith('mailto:')) continue;
    if (/^https?:/.test(href)) {
      if (!allowedExternal.some((a) => href === a || href.startsWith(`${a}/`) || href.startsWith(`${a}#`)))
        errors.push(`${where}: unknown external link ${href}`);
      if (/github\.com\/Harsh-159\/Portfolio/.test(href)) errors.push(`${where}: links to this site's own source`);
      continue;
    }
    const [pathPart, frag] = href.split('#');
    const path = pathPart.split('?')[0];
    const target = path === '' ? file : pageOf(path);
    if (!target) {
      errors.push(`${where}: broken link ${href}`);
      continue;
    }
    if (frag && target.endsWith('.html') && !idsOf(target).has(frag)) errors.push(`${where}: missing anchor ${href}`);
  }
}

if (errors.length) {
  console.error(`Link check failed with ${errors.length} problem(s):\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`Link check passed: ${html.length} pages.`);
