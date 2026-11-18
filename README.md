# Portfolio

Harsh Yadav's portfolio, at https://harsh-yadav-portfolio-ai.vercel.app. One home page and eight lab pages, each with demos that run in the browser.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests, including every headline number against the data
npm run build    # static site in dist/, then a link check
npm run data     # regenerate public/data and src/content/generated from the project repositories
```

## Where things live

- `src/content/`: every fact on the site (the facts ledger), evidence entries, glossary, lab list and "(confirm)" switches.
- `src/lib/`: pure engines with tests: matcher, stock simulator, pipeline timing, prompt scoring, routing, loop limits, forecast statistics, signals, citation validator, reservoir, MaxSAT.
- `src/islands/`: interactive figures (Preact). Everything else is static HTML.
- `src/pages/`: the home page, `lab/*` and `404`.
- `public/data/`: data files that figures load when first visible.

## Deploying

Vercel builds from the production branch using `vercel.json`. Every other branch gets a preview URL first.

Open questions are in `OPEN_QUESTIONS.md`, judgement calls in `DECISIONS.md`.
