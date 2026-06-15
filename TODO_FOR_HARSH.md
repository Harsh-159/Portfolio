# TODO for Harsh

Things only you can supply. The site works without them (synthetic data, hidden toggles), but these make it real. Paths are relative to the repo root.

## 1. Real tokenizer export

- **Destination:** `public/lab/tokenizer/tokenizer.json`
- **Format:**
  ```json
  { "format": "bytelevel-bpe", "vocab_size": 0, "merges": [["t", "h"], ["th", "e"]] }
  ```
- **Effect:** the tokenize view shows a "Use my real tokenizer" toggle once this file is present and valid.
- **How:** see `docs/EXPORT_GUIDE.md` for a Python snippet that dumps merges and vocab size into this schema.

## 2. Real forecast results

- **Destination:** `public/lab/forecast/results.csv`
- **Format:** header `timestamp,actual,predicted`, one hourly row each. `timestamp` may be ISO 8601 or unix seconds.
- **Effect:** the Forecast tab plots your real walk-forward series and the "sample data" badge disappears. (The stat tiles already show the real numbers.)
- **How:** pandas snippet reading `data/processed/oos_predictions.parquet` in `docs/EXPORT_GUIDE.md`.

## 2b. Daily report PDF

- **Destination:** `public/lab/forecast/sample_daily_report.pdf`
- **Effect:** the Briefing tab shows a "Download a real generated report (PDF)" button. While absent, the button stays hidden (the HTML briefing card still renders from `briefing_sample.json`).

## 3. CV (done)

- **File:** `public/cv.pdf` is in place; the header, footer, hero and contact links download it as `Harsh-Yadav-CV.pdf`.
- **To update:** replace `public/cv.pdf` with a new file (keep the same path). To change the downloaded filename, edit the `download="Harsh-Yadav-CV.pdf"` attribute on the four CV links (Header, Footer, Hero, Contact).

## 4. Real pipeline topology

- **File:** `src/content/pipeline.json`
- **Action:** verify the reconstructed topology (marked with a `_comment`) against the real, still-anonymised system: the splitter, the ADD and UPDATE branches (now structurally identical: each has condition → semantic, and classify → one of 7 list builders), the DELETE agent, the SYSTEM page-update terminal, plus each node's `role` and `guard`. This totals 22 agent nodes (excluding the SYSTEM terminal); the demo keeps "19-agent" as its display name. Adjust the 7 `listTypes`, the routing, and the request `chips` to match reality. Do not include prompts, names or data fields.

## 5. Verify before deploy

- Confirm the migrated links open the right places: LinkedIn, GitHub, Linktree (in `src/content/profile.ts`), and the GitHub repo URL used by the demo "View source" links (`LINKS.repo`).
- Read the About bio in `src/content/profile.ts` and adjust anything you would not say out loud.
- Check the photo crop (`public/harsh.webp`) looks right in the About section.
- Set the production URL in `index.html` (`og:url`) and the `LINKS.repo` if the repo name differs.
- Review the fuzzy-matcher penalty constants in `src/lib/fuzzyMatcher.ts` (`MATCHER_CONFIG`) and tune them if the defaults don't match how the real matcher behaved.
- Review the fictional ticker list in `src/lib/stockSim.ts` (`STOCKS`); they are invented names and must not collide with real symbols you would rather avoid.
