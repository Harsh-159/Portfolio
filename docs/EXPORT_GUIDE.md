# Export guide

How to produce the two real-data files the site can drop in. Both are optional: the site ships with synthetic data and reveals the real version automatically when the file appears.

## 1. Tokenizer → `public/lab/tokenizer/tokenizer.json`

The site expects byte-level BPE merges in the GPT-2 style "byte-to-unicode" space (the same space Hugging Face and GPT-2 use, where a leading space is the character `Ġ`). The applier in `src/lib/bpe.ts` (`applyByteLevelBPE`) maps input bytes into that space and then applies your merges in rank order, so as long as your trainer stores merges the standard way, this just works.

### From a typical from-scratch BPE trainer

If your trainer keeps an ordered list of merges (each a pair of token strings in byte-to-unicode space), dump it like this:

```python
import json

# merges: list of (left, right) string pairs, in the order they were learned.
# vocab:  dict mapping token string -> id (or just its length).
def export_tokenizer(merges, vocab_size, path="public/lab/tokenizer/tokenizer.json"):
    data = {
        "format": "bytelevel-bpe",
        "vocab_size": int(vocab_size),
        "merges": [[a, b] for (a, b) in merges],
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

# Example with the schema's expected shape:
# export_tokenizer([("t", "h"), ("th", "e")], vocab_size=257)
```

### From a Hugging Face `tokenizers` model

```python
import json
from tokenizers import Tokenizer

tok = Tokenizer.from_file("my_tokenizer.json")
model = json.loads(tok.to_str())["model"]
merges = [m.split(" ") if isinstance(m, str) else list(m) for m in model["merges"]]

data = {
    "format": "bytelevel-bpe",
    "vocab_size": len(model["vocab"]),
    "merges": [[a, b] for a, b in merges],
}
with open("public/lab/tokenizer/tokenizer.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
```

Sanity check: the site validates `format === "bytelevel-bpe"`, a numeric `vocab_size`, and that every merge is a two-string array. If validation fails, the toggle simply stays hidden.

## 2. Forecast → `public/lab/forecast/results.csv`

Hourly rows with the header `timestamp,actual,predicted`. `timestamp` can be ISO 8601 or unix seconds. The real series comes from the project's `data/processed/oos_predictions.parquet`.

```python
import pandas as pd

# Read the out-of-sample predictions parquet.
df = pd.read_parquet("data/processed/oos_predictions.parquet")

# Select and rename to the contract. Adjust the source column names if yours differ
# (e.g. "y_true"/"y_pred" or "price_actual"/"price_pred").
out = df.rename(columns={"actual": "actual", "predicted": "predicted"})[["actual", "predicted"]]
out.to_csv("public/lab/forecast/results.csv", index_label="timestamp")
```

Once this file is present, the Forecast tab plots your real series and the "sample data" badge disappears. The headline stat tiles (Hourly MAE 13.6, 86.7% directional accuracy, etc.) come from your offline evaluation and are shown regardless.

## 3. Daily report PDF → `public/lab/forecast/sample_daily_report.pdf`

Drop one real generated PDF report here. When present, the Briefing tab shows a "Download a real generated report (PDF)" button; when absent, the button is hidden. The HTML briefing card itself is always rendered from `public/lab/forecast/briefing_sample.json`.
