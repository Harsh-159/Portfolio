# harsh.yadav · the live lab

My portfolio, rebuilt around one idea: every technical claim is backed by something you can run in the browser. The landing page reads in 30 seconds; each lab demo rewards a couple of minutes of poking.

Live demos:

- **Tokenizer** (`/lab/tokenizer`) — train byte-pair encoding live, then tokenise anything. Backs my LLM-from-scratch build.
- **Order book** (`/lab/orderbook`) — a price-time-priority matching engine with a market simulation.
- **Forecast** (`/lab/forecast`) — German day-ahead price forecast explorer over 12,000 hours.
- **Pipeline** (`/lab/pipeline`) — anonymised replay of the 19-agent pipeline I built at Oracle.
- **Attention** (`/lab/attention`) — causal self-attention, step by step.
- **Levenshtein** (`/lab/levenshtein`) — the edit-distance matcher I built at Oracle, visualised.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build to dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
```

## How the code is organised

```
src/
  lib/         pure, typed, unit-tested engines (the portfolio-worthy code)
    bpe.ts            byte-pair encoding: char-level training + byte-level applier
    matchingEngine.ts limit order book with price-time priority
    attention.ts      causal self-attention maths with toy weights
    levenshtein.ts    edit distance: DP matrix + backtrace
    forecastData.ts   synthetic/real forecast data + directional accuracy
  components/  shared UI (header, footer, status chips, charts, demo chrome)
  sections/    home-page sections
  pages/lab/   one lazy-loaded route per demo
  content/     data that drives the UI (see below)
```

Each demo's "View source" link points at its engine in `src/lib/`. The engines have no React imports; the components render them.

## How each demo maps to a project

| Demo | Claim it backs |
| --- | --- |
| Tokenizer | LLM from scratch: byte-level BPE tokenizer, trained on TinyStories V2-GPT4 |
| Order book | Order matching engine: price-time priority, limit/market, partial fills |
| Forecast | German day-ahead forecasting: 86.7% directional accuracy, walk-forward eval |
| Pipeline | Oracle: a 19-agent approval-rule generation pipeline |
| Attention | LLM from scratch: attention implemented from scratch |
| Levenshtein | Oracle: a Levenshtein-based rule matcher |

## Editing content (no code changes needed)

- **`src/content/buildlog.json`** — the "Now building" strip. Each entry: `id`, `title`, `status` (`live` / `in-progress` / `planned`), optional `date`, `note`, `demo`.
- **`src/content/changelog.json`** — the footer changelog. Each entry: `date`, `entry`. Newest first.
- **`src/content/pipeline.json`** — the pipeline DAG (`nodes` with `col`/`role`/`inputs`/`outputs`/`guards`, plus `edges`). Currently a placeholder topology; see `TODO_FOR_HARSH.md`.
- **`src/content/profile.ts`** — identity, links, experience, education, projects and the About copy.
- **`src/content/labs.ts`** — the lab catalogue (titles, claims, statuses, source links).

## Real-data drop-in contracts

The site ships working with synthetic data and switches to real data automatically when these files appear (see `docs/EXPORT_GUIDE.md`):

- **`public/lab/tokenizer/tokenizer.json`** — when present and valid, the tokenize view offers a toggle to use the real byte-level tokenizer.
  ```json
  { "format": "bytelevel-bpe", "vocab_size": 0, "merges": [["t", "h"], ["th", "e"]] }
  ```
- **`public/lab/forecast/results.csv`** — `timestamp,actual,predicted` hourly rows. When present, the chart plots real data and the sample-data badge disappears. The headline stat tiles always show the real offline-evaluation numbers.
- **`public/cv.pdf`** — linked from the header, footer and hero.

## Notes

- `LAST_UPDATED` in the footer is injected at build time via Vite `define`. It is the only "telemetry" on the site, and it is honest.
- Tailwind v4 with CSS theme tokens; lime is a status colour only (live/running states and the primary CTA).
- Fonts are self-hosted via `@fontsource` with `font-display: swap`; the two above-the-fold fonts are preloaded.
- `prefers-reduced-motion` is respected throughout: loops stop and morphs become fades.
