"""Build the site's data files from the project repositories.

Run with:  python3 -I scripts/build_data.py
Source folders can be changed with environment variables:
  FORECAST_REPO      day_ahead_price_forcasting checkout
  ORCHESTRATOR_REPO  tool_orchestrator checkout
  MAXSAT_REPO        evolutionary-maxsat-solver checkout

The outputs are committed, so the site build never needs these folders.
Needs pandas and pyarrow.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
HOME = Path.home()
FORECAST = Path(os.environ.get("FORECAST_REPO", HOME / "Downloads/cobblestone_project"))
ORCH = Path(os.environ.get("ORCHESTRATOR_REPO", HOME / "Downloads/candidate"))
MAXSAT = Path(os.environ.get("MAXSAT_REPO", HOME / "Desktop/uob/evolutionaryComputation/ec2025cw2-harsh_yadav"))

PUB = ROOT / "public/data"
GEN = ROOT / "src/content/generated"


def write(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))
    print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size / 1024:.0f} KB)")


def r(x, n=3):
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    return round(float(x), n)


# ---------------------------------------------------------------- forecast
def forecast() -> None:
    d = pd.read_parquet(FORECAST / "data/processed/oos_predictions.parquet")
    start = d.index[0]
    hours = ((d.index - start) / pd.Timedelta(hours=1)).astype(int).tolist()
    preds = {
        "start": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "t": hours,
        "actual": [r(x) for x in d.y_actual],
        "pred": [r(x) for x in d.y_pred],
        "p1": [r(x) for x in d.y_pred_pass1_raw],
        "p2": [r(x) for x in d.y_pred_pass2_raw],
        "naive": [r(x) for x in d.y_pred_naive],
    }
    write(PUB / "forecast/predictions.json", preds)

    # Build-time copy of the last fourteen days, for server-rendered previews.
    tail = d.iloc[-336:]
    write(GEN / "forecastTail.json", {
        "start": tail.index[0].strftime("%Y-%m-%dT%H:%M:%SZ"),
        "actual": [r(x, 2) for x in tail.y_actual],
        "pred": [r(x, 2) for x in tail.y_pred],
        "naive": [r(x, 2) for x in tail.y_pred_naive],
    })

    # Average miss by hour (UTC) and by month for each stage, for the server-rendered stage chart.
    cols = {"naive": "y_pred_naive", "p1": "y_pred_pass1_raw", "p2": "y_pred_pass2_raw", "pred": "y_pred"}
    by = {}
    for k, c in cols.items():
        e = (d.y_actual - d[c]).abs()
        by[k] = {
            "hour": [r(v, 2) for v in e.groupby(d.index.hour).mean().tolist()],
            "month": {m: r(v, 2) for m, v in e.groupby(d.index.strftime("%Y-%m")).mean().items()},
        }
    write(GEN / "forecastByStage.json", by)

    # Stored stage table, from the project's own accuracy file.
    acc = pd.read_csv(FORECAST / "outputs/multi_granularity_accuracy.csv")
    stored = {}
    for _, row in acc.iterrows():
        stored.setdefault(row.granularity, {})[row.model] = {
            "mae": r(row.MAE, 4), "rmse": r(row.RMSE, 4), "mbe": r(row.MBE, 4), "n": int(row.n)}

    folds = pd.read_csv(FORECAST / "plots/model_plots/12fold_mae_per_fold.csv")
    fold_rows = [
        {k: (int(v) if k == "fold" else r(v, 3)) for k, v in row.items()}
        for row in folds.to_dict("records")
    ]

    write(GEN / "forecastStored.json", {"accuracy": stored, "folds": fold_rows})

    # Signals: 500 delivery dates.
    s = pd.read_csv(FORECAST / "outputs/curve_translation/signal_table.csv")
    flags = ["inv_gas_spike", "inv_wind_revision", "inv_residual_load_swing",
             "inv_negative_price_regime", "inv_high_error_regime"]
    rows = []
    for row in s.to_dict("records"):
        rows.append({
            "date": row["delivery_date"],
            "label": row["signal_label_month_base"],
            "premium": r(row["signal_month_base"], 2),
            "fv": r(row["fv_month_base"], 2),
            "curve": r(row["curve_proxy_30d"], 2),
            "conf": r(row["month_confidence"], 3),
            "flags": [f[4:] for f in flags if bool(row[f])],
        })
    write(PUB / "forecast/signals.json", rows)

    # Data checks: 1,621 flagged rows.
    q = pd.read_csv(FORECAST / "outputs/qa_flagged_rows.csv")
    write(PUB / "forecast/flagged.json", [
        {
            "t": str(x["timestamp_utc"])[:16].replace(" ", "T"),
            "price": r(x["da_price_eur_mwh"], 2),
            "solar": r(x["solar_forecast_mw"], 1),
            "reason": x["flag_reason"],
            "severity": x["severity"],
        }
        for x in q.to_dict("records")
    ])

    # Three stored briefings with their evidence and anomaly reports.
    briefs = []
    for day in ["2026-03-14", "2026-03-15", "2026-03-21"]:
        folder = FORECAST / "outputs/ai_intelligence" / day
        text = (folder / "briefing.txt").read_text()
        body = text.split("====================================================\n", 2)[2]
        body = body.split("────")[0].strip()
        sections = []
        for block in body.split("\n\n"):
            lines = block.strip().split("\n", 1)
            if len(lines) == 2:
                sections.append({"title": lines[0].strip(), "text": lines[1].strip()})
        validation = json.loads((folder / "citation_validation.json").read_text())
        anomaly = None
        if (folder / "anomaly_report.txt").exists():
            a = (folder / "anomaly_report.txt").read_text()
            a_body = a.split("====================================================\n", 2)[2].split("────")[0].strip()
            a_sections = []
            for block in a_body.split("\n\n"):
                lines = block.strip().split("\n", 1)
                if len(lines) == 2:
                    a_sections.append({"title": lines[0].strip(), "text": lines[1].strip()})
            anomaly = a_sections
        briefs.append({
            "date": day,
            "sections": sections,
            "evidence": json.loads((folder / "evidence_package.json").read_text()),
            "stored": {"total": validation["total_citations"], "verified": validation["verified_citations"]},
            "anomaly": anomaly,
        })
    write(PUB / "forecast/briefings.json", briefs)


# ------------------------------------------------------------ orchestrator
def orchestrator() -> None:
    # Tool names as the registry registers them (docs/mcp_tool_definitions.txt drops the
    # linear_, github_ and perplexity_ prefixes the agent actually sees).
    dump = subprocess.run(
        [str(ORCH / "backend/.venv/bin/python"), "-c",
         "import json, backend.main as m\n"
         "print(json.dumps([{'name': n, 'service': s.service, 'description': s.description}"
         " for n, s in m.get_all_tool_specs().items()]))"],
        cwd=ORCH, capture_output=True, text=True, check=True)
    order = ["gmail", "googlecalendar", "googledrive", "slack", "linear", "github", "perplexity"]
    tools = sorted(json.loads(dump.stdout.strip().splitlines()[-1]),
                   key=lambda t: (order.index(t["service"]), t["name"].lower()))
    counts = {}
    for t in tools:
        counts[t["service"]] = counts.get(t["service"], 0) + 1
    print("tool counts", counts, len(tools))
    assert len(tools) == 191, len(tools)
    write(PUB / "orchestrator/tools.json", tools)

    design = (ORCH / "DESIGN.md").read_text()
    part = design.split("Furthurmore", 1)[1]

    # Pull every JSON response object with the telemetry line that precedes it.
    traces = []
    pattern = re.compile(
        r"turn done: ([\d.]+)s \| (\d+) tools routed \| (\d+) tool calls \((\d+) errored\) \| (\d+) llm calls \| "
        r"(\d+) in / (\d+) out tokens \| est \$([\d.]+)\n(\{\n.*?\n\})\n", re.S)
    for m in pattern.finditer(part):
        body = json.loads(m.group(9))
        traces.append({
            "telemetry": {
                "seconds": float(m.group(1)), "routed": int(m.group(2)), "toolCalls": int(m.group(3)),
                "errored": int(m.group(4)), "modelCalls": int(m.group(5)), "tokensIn": int(m.group(6)),
                "tokensOut": int(m.group(7)), "cost": float(m.group(8)),
            },
            "messages": body["messages"],
            "toolCalls": body["tool_calls"],
        })
    print("traces found", len(traces))
    # Scenario 2 (email to Slack), 3 (missing file), 4 turn 1 and turn 2.
    write(PUB / "orchestrator/runs.json", {
        "traces": [
            {"id": "email-to-slack", "turns": [traces[1]]},
            {"id": "missing-file", "turns": [traces[2]]},
            {"id": "asks-then-acts", "turns": [traces[3], traces[4]]},
        ]
    })


# ------------------------------------------------------------------ maxsat
def maxsat() -> None:
    out = PUB / "maxsat"
    out.mkdir(parents=True, exist_ok=True)
    bench = MAXSAT / "mse17-complete-unweighted-benchmarks"
    for src, name in [
        (bench / "aes/sbox_4.wcnf", "sbox_4.wcnf"),
        (bench / "maxclique/johnson8-4-4.clq.wcnf", "johnson8-4-4.wcnf"),
        (bench / "maxclique/hamming6-4.clq.wcnf", "hamming6-4.wcnf"),
        (bench / "maxclique/brock200_1.clq.wcnf", "brock200_1.wcnf"),
    ]:
        shutil.copyfile(src, out / name)
        print("copied", name)
    shutil.copyfile(MAXSAT / "example.wcnf", ROOT / "src/lib/fixtures/example.wcnf")


if __name__ == "__main__":
    (ROOT / "src/lib/fixtures").mkdir(parents=True, exist_ok=True)
    forecast()
    orchestrator()
    maxsat()
