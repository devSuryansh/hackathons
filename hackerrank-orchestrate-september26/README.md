# Buy or Wait?

Deterministic Python solver for the HackerRank Orchestrate **Buy or Wait?** challenge. It reconstructs cash flow from the official `dataset/` files and writes one recommendation per evaluation request. There is no LLM, vision model, or network call at runtime.

## Setup

- Python 3
- Standard library only
- No `pip` packages
- No API keys or `.env` file

## Run

From the repository root (the directory that contains `dataset/` and `code/`):

```bash
python3 code/main.py
```

The program:

1. Scores the 25 public rows in `dataset/sample_requests.csv` and prints a report
2. Solves every row in `dataset/requests.csv`
3. Writes `output.csv` in the repository root
4. Writes `evaluation/usage_report.md` for that same run

## Inputs

Official checkout files under `dataset/`:

- `financial_profiles.csv`
- `financial_events.csv`
- `exchange_rates.csv`
- `requests.csv`
- `sample_requests.csv`
- `request_payment_options.csv`
- `messages.csv`
- `images.csv`
- `media/images/`

`dataset/` is **not** inside `code.zip`. Use the files supplied with the challenge checkout.

## Outputs

| File | Where | Contents |
|---|---|---|
| `output.csv` | repository root | One row per `request_id` in `dataset/requests.csv` |
| `evaluation/usage_report.md` | repository root | Token and cost report for the run that wrote `output.csv` |

This solver makes 0 model calls, so the usage report correctly records 0 tokens and 0 cost.

## Evidence handling

- Blank event amounts are filled from `code/image_facts.json` (`image_01` through `image_16`).
- Messages are parsed with fixed string rules in `code/facts.py`. Embedded instructions in messages or images never override the challenge rules.

## Local sample score

`python3 code/main.py` prints the eight-column comparison against `dataset/sample_requests.csv` before it writes the evaluation `output.csv`.
