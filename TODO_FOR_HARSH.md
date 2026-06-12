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
- **Effect:** the chart plots your real walk-forward series and the "sample data" badge disappears. (The stat tiles already show the real numbers.)
- **How:** pandas one-liner in `docs/EXPORT_GUIDE.md`.

## 3. CV

- **Destination:** `public/cv.pdf`
- **Effect:** the header/footer/hero CV links resolve. Until then they 404.

## 4. Real pipeline topology

- **File:** `src/content/pipeline.json`
- **Action:** replace the placeholder topology (marked with a `_comment`) with the real, still-anonymised graph: node roles, inputs, outputs and the failure mode each guards against. Keep it to the real number of agents and do not include prompts, names or data.

## 5. Verify before deploy

- Confirm the migrated links open the right places: LinkedIn, GitHub, Linktree (in `src/content/profile.ts`), and the GitHub repo URL used by the demo "View source" links (`LINKS.repo`).
- Read the About bio in `src/content/profile.ts` and adjust anything you would not say out loud.
- Check the photo crop (`public/harsh.webp`) looks right in the About section.
- Set the production URL in `index.html` (`og:url`) and the `LINKS.repo` if the repo name differs.
