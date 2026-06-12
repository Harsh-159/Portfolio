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
