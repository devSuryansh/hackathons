#!/usr/bin/env python3
from __future__ import annotations

import csv
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from amount_safe import format_money
from load import Dataset, repo_root
from sample_eval import print_report, evaluate_samples
from solver import solve_request
from validator import validate_row


def _fmt_amount(value: float) -> str:
    return format_money(value)


def write_output(rows, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "request_id",
                "amount_safe_to_pay",
                "affordability_status",
                "recommended_payment_method",
                "payment_plan",
                "earliest_date_for_full_payment",
                "spending_changes_needed",
                "decision_explanation",
            ]
        )
        for row in rows:
            writer.writerow(
                [
                    row.request_id,
                    _fmt_amount(row.amount_safe_to_pay),
                    row.affordability_status,
                    row.recommended_payment_method,
                    row.payment_plan,
                    row.earliest_date_for_full_payment,
                    row.spending_changes_needed,
                    row.decision_explanation,
                ]
            )


def write_usage_report(path: Path, n: int, elapsed_s: float) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    avg_s = elapsed_s / n if n else 0.0
    path.write_text(
        "\n".join(
            [
                "# Token usage report",
                "",
                "Final full-dataset run that produced repo-root `output.csv`.",
                "",
                "## Models",
                "",
                "| Provider | Model | Role |",
                "|---|---|---|",
                "| none | none | Deterministic Python solver. No LLM, vision, or embedding calls. |",
                "",
                "Image amounts are read from `code/image_facts.json` (pre-extracted",
                "structured fields). Messages are parsed with fixed string rules.",
                "",
                "## Token and cost totals",
                "",
                "| Metric | Value |",
                "|---|---|",
                f"| Requests in `output.csv` | {n} |",
                "| Model calls | 0 |",
                "| Input tokens | 0 |",
                "| Output tokens | 0 |",
                "| Total tokens | 0 |",
                "| Average tokens per request | 0 |",
                "| Estimated total cost | 0 |",
                "| Estimated cost per request | 0 |",
                f"| Wall time (seconds) | {elapsed_s:.2f} |",
                f"| Average seconds per request | {avg_s:.3f} |",
                "",
                "## Per-model breakdown",
                "",
                "No model was invoked. All totals are zero.",
                "",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    dataset = Dataset()
    result = evaluate_samples(dataset)
    print_report(result)

    started = time.perf_counter()
    rows = [solve_request(dataset, request) for request in dataset.requests]
    elapsed = time.perf_counter() - started

    failed = 0
    for request, row in zip(dataset.requests, rows):
        errors = validate_row(request, row, stub_ok=False)
        if errors:
            failed += 1
            print(f"validator {request.request_id}: {errors}")

    write_output(rows, repo_root() / "output.csv")
    write_usage_report(repo_root() / "evaluation" / "usage_report.md", len(rows), elapsed)
    print(
        f"wrote {len(rows)} eval rows in {elapsed:.2f}s; "
        f"validator failures {failed}"
    )
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
