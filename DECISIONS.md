# Decisions

One line per judgement call made during the rebuild.

- **lucide-react kept** (beyond the Section 3 dependency list): tree-shakeable icon set, avoids hand-rolling dozens of inline SVGs. Only the icons used are bundled.
- **Token naming:** the foreground colour is exposed as `fg` (e.g. `text-fg`) rather than `text`, to avoid the confusing `text-text` utility. All other tokens match the spec.
- **Card-morph navigation:** used the spec's allowed fallback (scale-and-fade expansion on the demo page) rather than a cross-route shared `layoutId`, which fights React Router's unmount/remount. The demo still reads as the card opening.
- **Tokenizer training:** character-level BPE over the whole sequence (merges can cross whitespace) for a legible replay. Pair frequency counts overlapping adjacencies (standard BPE); merges are applied greedily non-overlapping left-to-right.
- **Byte-level applier:** uses the GPT-2 byte-to-unicode mapping so exported merges in that space apply directly; the export guide tells Harsh to dump merges the standard way.
- **Token colours:** a stable hue derived from a token-id hash, rather than a fixed small palette, so distinct tokens stay visually distinct and colour is stable per token.
- **Matching engine cancellation is lazy** (tombstone + skip/pop when reached), mirroring the original build; snapshots exclude tombstoned orders so the displayed book stays correct.
- **Forecast zoom:** uPlot brush-to-zoom with double-click reset. uPlot has no built-in pan, so pan is not separately implemented; brush + reset covers the interaction.
- **Forecast synthetic data is not forced to 86.7%.** It is illustrative and badged "sample data". The stat tiles always show the real offline-evaluation numbers, which is where 86.7% comes from.
- **Forecast mobile** renders a simplified single panel (the rolling-accuracy chart is hidden below `md`).
- **Pipeline topology** is a 19-node placeholder (flagged in `pipeline.json` and `TODO_FOR_HARSH.md`); the graph degrades to a vertical flow on mobile.
- **Fonts:** kept `@fontsource` `index.css` imports (all subsets) because only the latin subset downloads at runtime via `unicode-range`. The two above-the-fold latin fonts (Inter, Space Grotesk) are preloaded by injecting `<link rel=preload>` from `?url` imports, since fontsource filenames are content-hashed and cannot be referenced from static HTML.
- **OG image** was rendered with macOS Quick Look (WebKit), because the available ImageMagick build lacks the Freetype delegate (no text) and `rsvg-convert` is not installed. The source SVG lives in `scripts/og.svg`; the committed `public/og.png` is the rendered result.
- **vitest environment is `node`** for the `src/lib` engine suites, which need no DOM.
- **`scripts/og.svg` and `.claude/launch.json`** are committed as build/dev helpers.
- **Reduced motion** is handled both by Framer Motion's `useReducedMotion` (the `Reveal` wrapper renders statically) and a global CSS rule that collapses animation/transition durations, which pauses the CSS-driven loops (live dot, mini-previews).

## Iteration 2 (real-project demos)

- **Stocks reduced motion:** the 2s price tick is an ambient loop, so under reduced motion it is paused and an "advance prices" button appears instead, keeping the sim usable while honouring the loops-stop rule.
- **P&L and buy/sell colours** reuse `live` (gain/buy) and `sell` (loss/sell) rather than introducing new colours, keeping finance semantics consistent across the site.
- **Matcher scoring:** word-level Damerau-Levenshtein. Mismatch cost (1.1) is kept above a delete+insert pair (1.0) so unrelated words align as gaps, leaving substitutions for exact/typo/transposition only. The foreign penalty applies to query words of length ≥ 5 that are far from every candidate word, so short connectives like "from" stay cheap (behaviour 4) while irrelevant content words are punished (behaviour 5). Constants are exported for tuning.
- **Old levenshtein route** redirects to `/lab/matcher` via `<Navigate>`; `levenshtein.ts` and its tests are kept because the matcher reuses the char-level distance.
- **Pipeline layout** is computed in code from `col`/`row`/`lane` fields in `pipeline.json` (positions are derived, topology/labels/guards/routing stay data-driven). Critical path and wall-clock are computed from the active subgraph, so editing the JSON keeps the summary correct.
- **Pipeline failure injection** flips one random active agent to `sell` with a retry pulse and appends "· 1 retry" to the summary; it does not change the critical-path wall-clock.
- **Forecast tabs** are conditionally rendered (mount on selection) rather than `React.lazy`-split, since they are small and already inside the lazy forecast route chunk. The original Forecast tab is the unchanged component, so `forecastData` tests still pass untouched.
- **Briefing PDF detection** checks the response content-type for `pdf`, not just a 200, because a dev SPA fallback returns `index.html` (text/html) for a missing file and would otherwise show the button.
- **Amber** is used only for the report's `INVALIDATED` state and triggered invalidation flags, mirroring the real report; it is a warning state, distinct from the lime/violet/red tokens.
- **Signal tiers** are symmetric and exact at the boundaries: +3/+8 → BUY, −3/−8 → SELL, strictly beyond → STRONG_*, and HOLD is the open interval (−3, +3).

## Iteration 3 (project-specific tweaks)

- **UPDATE branch now mirrors ADD** in `pipeline.json` (its own Condition, Semantic and Classify plus one-of-7 builders), so the real agent total is 22. Per request, the "19-agent" name is kept in the title, hero stat, experience bullet and lab card; the replay summary still shows the live active count out of 19.
- **Order matching engine removed entirely** (page, lab card, route, mini-preview and the `matchingEngine.ts` engine + tests). The matcher demo was renamed to "String matching algorithm".
- **Demo "View source" links** for Stocks and DE_LU Power Intelligence now point at their real project repos rather than this repo's lib files.
