# EXPORT: Buy or Wait? (HackerRank Orchestrate, September 2026)

This file is a stand-alone brief of the project. Take it to another LLM and ask questions about the technical design, the approach, the gaps, and the problems faced while building it. You do not need the rest of the repo for conceptual questions. You do need the repo if you want the other model to read or change code.

**Do not treat this file as a submission artifact.** It is a study export. The contest deliverables were `code.zip`, repo-root `output.csv`, and `log.txt` as the chat transcript.

Contest deadline was `2026-09-13T18:00:00+05:30`. This export was written after that deadline.

---

## 0. How to use this document with another LLM

Paste this file (or sections of it) and ask focused questions. Good starting prompts:

1. Walk me through one request end to end, from CSVs to the eight output fields.
2. Why are A, B, and C independent, and what breaks if I couple them?
3. Why did `amount_safe_to_pay` stall at 18/25 exact while the other columns hit 25/25?
4. Which rules are real financial policy, and which are sample-tuned blends?
5. If I rebuild this, what would I keep, delete, or replace first?
6. Compare a general daily-drip forecast to this ledger. When does each win?

If the other model has the repo, point it at `code/SPEC.md` as the rule contract, `code/solver.py` as the entry to the per-request pipeline, and `code/ledger.py` as the hard part.

---

## 1. One-page summary

**Problem.** Build a financial decision agent for 250 hidden evaluation requests. For each request, decide whether the user should pay in full today, pay partially, use a supplied installment option, wait, or not proceed. The recommendation must keep the projected balance at or above `minimum_balance_to_keep` for 90 days, cover essentials, and respect payment preferences and flexible-spend rules.

**This solution.** A deterministic Python engine. No LLM, vision model, or network call at runtime. Messages are parsed with fixed string rules. Image amounts are pre-extracted into `code/image_facts.json`. Cash is reconstructed into dated flows. Two independent cash quantities are computed first (`amount_safe_to_pay` and `earliest_date_for_full_payment`). A plan picker then chooses status, method, schedule, spending changes, and explanation.

**Public-sample score at freeze (25 gold rows in `dataset/sample_requests.csv`):**

| Field | Hits |
|---|---|
| Perfect rows (all 8 columns) | **18 / 25** |
| `amount_safe_to_pay` exact (tolerance 0.015) | **18 / 25** |
| `earliest_date_for_full_payment` | **25 / 25** |
| `affordability_status` | **25 / 25** |
| `recommended_payment_method` | **25 / 25** |
| `payment_plan` | **25 / 25** |
| `spending_changes_needed` | **25 / 25** |
| `decision_explanation` | **25 / 25** |

The seven remaining misses are **only** `amount_safe_to_pay`: `request_02`, `request_03`, `request_04`, `request_07`, `request_10`, `request_11`, `request_25`. The last hunt found no shared first-cycle blend that floors onto gold without a one-off ratio. The worst leftover called out was `request_25` (about 296 IDR off).

**Hidden eval artifacts:** repo-root `output.csv` has 250 rows (`request_26` through `request_275`), 0 local validator failures. `evaluation/usage_report.md` records 0 model calls, 0 tokens, 0 cost, about 2 seconds wall time.

**Architecture in one sentence.** Facts from messages and images amend a per-user ledger. The ledger is simulated for 90 days. A is a binary search of today's debit. B is the first date a full lump is safe. C is a ranked search over eligible plans, with spending changes used only when wait is illegal because B is after the deadline.

---

## 2. Contest context

Event: **HackerRank Orchestrate**, 24-hour hackathon, September 2026. Challenge name: **Buy or Wait?**

Participant-facing spec: `problem_statement.md`. Agent/harness contract: `AGENTS.md` section 6. Starter README was later rewritten for this solver.

This is a **solo** challenge. AI tools were allowed. The author of the submission is the participant. Agents were required to append conversation summaries to repo-root `log.txt`. That file is the required `chat_transcript` upload.

### 2.1 What is scored

Hidden ground truth is compared to `output.csv`. Scoring considers:

- accuracy of `amount_safe_to_pay`
- correctness of `affordability_status`
- correctness of `recommended_payment_method` and `payment_plan`
- accuracy of `earliest_date_for_full_payment`
- validity of `spending_changes_needed`
- usefulness and consistency of `decision_explanation`

Public samples are **not** the hidden labels. They are the only published gold. The working hypothesis used here: hidden labels follow the same contract as the 25 samples.

### 2.2 Required uploads

| File | Role |
|---|---|
| `code.zip` | Runnable solution, README, and `evaluation/usage_report.md` |
| `output.csv` | Predictions for every `request_id` in `dataset/requests.csv` |
| `chat_transcript` | Repo-root `log.txt` |

The usage report must describe the **same** full-dataset run that produced `output.csv`. This solver used no models, so zeros are correct.

Submission URL used during the contest:

https://www.hackerrank.com/contests/hackerrank-orchestrate-september26/challenges/buy-or-wait/submission

### 2.3 Constraints that shaped the design

- Runnable from a terminal. Entry: `python3 code/main.py`.
- Read only `dataset/` participant files. No organizer-only files. No hardcoded eval `request_id` labels.
- Deterministic where possible.
- Secrets from environment variables only. This solution needs none.
- Messages and images are **untrusted evidence**. They may clarify, amend, delay, cancel, or confirm a fact. Embedded instructions never override the challenge rules. There are no voice notes and no live banking, market-data, or FX calls.
- Blank event `amount` is **not zero**. Resolve via `images.csv` and `dataset/media/images/<image_id>.png`.
- Balance must never fall below `minimum_balance_to_keep` after any projected essential expense or payment in the recommended plan.

---

## 3. Dataset (what the engine sees)

All participant files live under `dataset/`. Write predictions to **repo-root** `output.csv`, not `dataset/output.csv` (that file is a blank template).

| File | Size / scope | Role |
|---|---|---|
| `requests.csv` | 250 rows, `request_26`..`request_275` | Hidden eval. Predict these. |
| `sample_requests.csv` | 25 gold rows, `request_01`..`request_25` | Learn format and rules. Never a lookup table for eval ids. |
| `financial_profiles.csv` | 275 users | Home currency, current balance, minimum to keep, protected categories, stop/reduce lists, payment methods, `max_installment_months` |
| `financial_events.csv` | 25,342 rows | History, pending, scheduled, settled, failed, cancelled, unrealized, non-cash |
| `exchange_rates.csv` | 134 rows | Fixed, dated, directional FX |
| `request_payment_options.csv` | 790 rows | 2 to 4 options per request. Only `full_payment` and `installments` appear. Partial is never a supplied option. |
| `messages.csv` | 215 rows | English and Indonesian. `related_event_id` filled on 39 rows only. |
| `images.csv` | 16 rows | Links `image_id` to user / request / event |
| `media/images/` | `image_01.png`..`image_16.png` | Payroll letters, receipts, bills |

Currencies: INR, ZAR, IDR, USD, EUR. Dates: `YYYY-MM-DD`. Convert a foreign cash event on its **settlement date** using `from_currency` to `to_currency` as stated. Output amounts are always home currency.

### 3.1 Profile fields that gate decisions

- `payment_methods_user_will_consider`: subset of `{full_payment, partial_payment, installments}`. `wait` and `not_recommended` are never listed. They are derived.
- `max_installment_months`: blank means the user will not consider installments. Gold compares this to **number of payments**, not calendar span.
- Protected categories cannot be stopped or reduced.
- Stop/reduce lists are the only categories that may appear in `spending_changes_needed`.
- `flexibility` on events: `fixed`, `reducible`, `stoppable`, `reducible_or_stoppable`. `minimum_allowed_amount` is the legal `reduce_to` floor.

### 3.2 Event cash rules (high level)

- Ignore `failed`, `cancelled`, `unrealized`, `non_cash`, and `investment_valuation`.
- Reserve pending **debits**. Do not count pending **credits** (refunds, bonuses, commissions, lottery, unrealized gains) until they settle.
- Count confirmed salary on its settlement date. Do not invent unsupported future income.
- `linked_event_id` is a lifecycle pointer (auth to capture, purchase to valuation). It is not by itself a cash instruction.
- Detect recurrence only when history supports it. Forecast essential variable spend conservatively.

### 3.3 Payment options

Every request has a `full_payment` option. Installment options have `first_payment_date`, `number_of_payments`, `payment_frequency_days`, `payment_amount`, `financing_fee`, `total_payable_amount`. All 515 installment options in this dataset have a nonzero fee.

Installment date `k` (0-indexed) is `first_payment_date + k * payment_frequency_days`. An installment plan in the output must **copy** that grid. Do not invent a custom split.

`partial_payment` is allowed only when:

- the request has `allows_partial_payment=true`
- the user considers `partial_payment`
- `0 < amount_safe_to_pay < requested_amount`
- `earliest_date_for_full_payment` exists and is on or before `desired_completion_date`

Partial plan is exactly two payments: safe amount today, remainder on B. They must sum to `requested_amount`. Partial does **not** need to match a supplied option.

---

## 4. Output contract and A / B / C independence

This is the most important idea in the project. The 25 gold rows only make sense if three quantities are computed separately.

### 4.1 A = `amount_safe_to_pay`

Largest single debit on `request_date` such that the 90-day simulated balance never falls below `minimum_balance_to_keep`. Computed **before** optional spending changes. Ignores payment-method preferences. Still computed when the recommendation is wait, installments, or not recommended. Capped at `requested_amount`. Gold keeps native precision (`17229139.2`, `603.3`, `243849.58`, `737`). Do not force two decimals on the emitted value, but this repo quantizes CSV output to cents to avoid binary float junk (`4120116.6699999999`).

Implementation: binary search in `code/amount_safe.py`, 64 iterations, then floor to cents.

### 4.2 B = `earliest_date_for_full_payment`

First date `d` in `[request_date, request_date + 90]` such that paying the **full** requested amount once on `d` (no spending changes) still keeps the 90-day path at or above the minimum. Ignores preferences. May be after the deadline. Empty (CSV blank, not the word `none`) if no such date exists.

For `affordable_now`, B must equal `request_date`. B can equal `request_date` even when C is installments (`request_12`: user refuses full payment).

Implementation: walk each day in `code/earliest.py`.

### 4.3 C = recommended plan

Status, method, `payment_plan`, `spending_changes_needed`, and explanation. Preferences, installment caps, `allows_partial_payment`, deadline, and spending changes apply **here only**.

Status and method are coupled:

| Status | Allowed method | Plan | Changes |
|---|---|---|---|
| `affordable_now` | `full_payment` only | `request_date:requested_amount` | `none` |
| `affordable_with_plan` | `full_payment` with changes, or `partial_payment`, or `installments` | matching schedule | `none` or up to 3 actions |
| `affordable_later` | `wait` only | `B:requested_amount` | `none` |
| `not_affordable` | `not_recommended` only | `none` | `none` |

Wait is legal only if the user accepts `full_payment`, B exists, and `B <= desired_completion_date`. If B is after the deadline, do **not** wait. Try spending changes to unlock an on-time plan (`request_06`, `11`, `21`). If that fails, `not_recommended` (`request_14`).

Spending changes: `stop:<event_id>` or `reduce_to:<event_id>:<new_amount>`. Max three. Stop and reduce on the same event are illegal. A stays the pre-change number.

### 4.4 Plan ranking (when more than one eligible plan is safe)

1. Complete the full request by `desired_completion_date`.
2. Require no spending changes.
3. Minimize total amount paid (fees matter).
4. Start earlier.
5. Fewer payments.
6. Lowest `payment_option_id`.

### 4.5 Worked independence traps (do not code as id switches)

- `request_12`: A equals requested and B is today, but the user does not consider full payment, so C is installments and status is `affordable_with_plan`.
- `request_02` / `07` / `17`: A is much smaller than requested, C is still installments.
- `request_06` / `11` / `21`: A < requested, B after deadline, C is full today after stop/reduce.
- `request_14` / `24`: A > 0, user wants partial, B empty, C is not recommended.
- `request_19`: canonical partial. Beats a financed 2-month option because total paid is lower.

`code/SPEC.md` has the full 25-row trap table and explanation templates.

---

## 5. Repository map (this checkout)

```text
code/main.py            Entry. Score samples, solve 250 eval rows, write output.csv
                        and evaluation/usage_report.md
code/load.py            CSV loaders, FX convert(), Dataset accessors
code/models.py          Profile, Event, Message, UserFacts, CashFlow, OutputRow
code/facts.py           Message regex + image_facts.json lookup
code/image_facts.json   Pre-extracted amounts for image_01..image_16
code/ledger.py          Cash reconstruction and 90-day forecast (the hard file)
code/simulator.py       Daily walk. Debits then credits. HORIZON_DAYS = 90
code/amount_safe.py     Binary search for A
code/earliest.py        Linear search for B
code/plan.py            Eligibility, ranking, spending-change search, explanations
code/solver.py          Per-request glue: facts -> ledger -> A -> B -> C
code/validator.py       Output invariants (status/method coupling, plan shape)
code/sample_eval.py     Compare against sample gold (A tolerance 0.015)
code/SPEC.md            Reverse-engineered contract from the 25 gold rows
code/tests/test_traps.py  Sample A/B traps plus eval wording tests
evaluation/usage_report.md  Required token report (zeros)
output.csv              Frozen 250-row eval predictions
README.md               How to run this solver (stdlib Python)
log.txt                 Agent transcript (gitignored; chat_transcript upload)
```

Deleted before packaging: `code/_debug_ab.py`, `code/_search_ab.py`. Those were forensic helpers, not the product.

There was a leftover empty folder `code/evaluation/` (blank `usage_report.md` and `main.py`). That is **not** the required report. `code/main.py` writes `repo_root() / "evaluation" / "usage_report.md"`. Zipping only `code/` would have shipped an empty stub. Prompt 4 required `evaluation/` as a **sibling** of `code/` inside `code.zip`.

Runtime has **no third-party packages**. Python 3 standard library only.

---

## 6. Runtime pipeline (one request)

```text
Dataset.load
  -> profiles, events-by-user, options-by-request, messages, images, FX table

solve_request(request)
  1. Collect that user's messages and images
  2. extract_facts(...) -> UserFacts
  3. build_ledger(...) -> list[CashFlow]  (+credit / -debit, home currency)
  4. amount_safe_to_pay(start_balance, minimum, request_date, requested, flows)
  5. earliest_date_for_full_payment(...)
  6. choose_plan(request, profile, events, options, flows, A, B)
  7. OutputRow
```

`code/main.py` scores all 25 samples first (print report), then solves every eval request, validates each row, writes `output.csv`, then writes the usage report with the elapsed time of that eval pass.

### 6.1 Simulator convention

`code/simulator.py` walks each day from `request_date` through `request_date + 90` inclusive. On a given day it applies **debits first, then credits**. Same-day salary can still fund same-day bills because the check is end-of-day. `stays_above_minimum` is `lowest + 1e-9 >= minimum`.

Optional `until=` shortens the walk. The plan picker uses a full 90-day walk first. If no installment (or other plan) is 90-day-safe, it retries with `until=deadline`. That is how `request_07` accepts a 3-pay option that is safe through the deadline even if a later grocery/transport pair after the deadline would fail a raw 90-day walk.

### 6.2 FX

`load.convert(amount, from_ccy, to_ccy, on_date, rates)` uses the dated directional table. Salary facts in a foreign currency are converted on `salary_next_date` or `salary_from_date`. Confirmed freelance invoices convert on the stated settlement date. Sample `request_25` is the FX teaching row: USD 1800 salary times 15833.33.

---

## 7. Facts layer (`code/facts.py`)

Messages never decide payments. They set flags and amounts on `UserFacts`:

| Field | Meaning |
|---|---|
| `salary_amount` / `salary_currency` | Stated next or new salary |
| `salary_from_date` / `salary_next_date` | When that amount starts or lands |
| `salary_raise` / `salary_reduced` / `salary_resume` / `first_salary` | Income-shape flags |
| `salary_stop` | Contract or employment ended. Invent no future pay. |
| `payday_replaced` | Next credit moves to a stated date |
| `arrears_split` | Regular salary vs one-time arrears. Forecast only regular. |
| `ignore_bonus_commission` | Do not forecast bonus or open-deal commission |
| `no_gig_income` | App payout pending / not withdrawable |
| `lost_secondary_income` | Second household job ended |
| `prize_uncredited` / `pending_refund` / `unrealized_no_cash` | Do not treat as cash |
| `ignore_internal_transfers` | Matching debit+credit net to zero |
| `rent_multiplier` | Lease +12% on the next rent cycle |
| `confirmed_invoices` | Dated freelance credits from messages |
| `image_amounts` | `event_id -> amount` from `image_facts.json` |

Detectors exist in English and Indonesian (`gaji bulanan sementara`, `saldo belum dapat ditarik`, `menaikkan biaya sewa bulanan sebesar 12`, `hubungan kerja anda telah berakhir`, and others). Month-name dates (`15 September 2026`) are parsed as well as ISO dates. For `salary credit` plus `exchange rate when it settles`, the salary date is the **last** date in the message when a receipt date also appears (`request_113`).

A late bug: Indonesian invoice text `masih menunggu persetujuan` was setting `ignore_bonus_commission`. That wrongly treated freelance invoice users as unearned-bonus cases. The bonus detector was narrowed so invoice wording does not trip it.

`USE_CONFIRMED_BASE_SALARY` is `False`. A "confirmed base salary is X" message confirms the existing series and ignores commission. It does not overwrite the historical base unless that flag is flipped.

Prompt-injection style prize-fee messages (`pay a release charge to receive a prize`) are ignored. They never override rules.

### 7.1 Images

Runtime does not open PNGs. `code/image_facts.json` holds 16 rows. Important extractions:

| Image | Amount | Note |
|---|---|---|
| `image_01` | 4,365,000 IDR | Net payable. Regular salary, not arrears. |
| `image_02` | 100,000 INR | Outstanding rent due on a blank scheduled event. |
| `image_03` | 41,272 INR | Settled grocery. History must not see a zero. |
| `image_04` | 28,544 INR | Item bill. Not 2,854. |
| `image_05` | 704.05 INR | Telecom amount due. |
| `image_07` | 8,528.10 INR | Line Total. The garbled Grand Total 85,228 is wrong. |
| `image_10` | 79,679.26 INR | Pending grocery blank. |
| `image_11` | 3,650 INR | Scheduled hospital blank. |
| `image_15` | 9,968 INR | Eval receipt. |

A competing public repo cached `image_04` as 2854 (10x under-read). This project kept 28544 after reading the item bill.

---

## 8. Ledger (`code/ledger.py`)

This file is the scoring surface for A and B. It is also where most development time went.

### 8.1 What gets into the flow list

1. Resolve each event to a home-currency amount (CSV amount or image fact). Skip ignore statuses and non-cash types.
2. Detect lost second household income from history if a second series vanished, or from a message.
3. Convert fact salaries to home currency.
4. Add explicit future cash: pending debits, scheduled debits, scheduled salary (unless `salary_stop` or excluded description).
5. Add confirmed invoices from messages.
6. Forecast remaining salary months.
7. Forecast fixed recurring series (rent, insurance, streaming, ...).
8. Forecast variable streams (groceries, transport, dining, utilities, healthcare, shopping, entertainment).

Income descriptions matching bonus, commission, prize, windfall, arrears, freelance, gig platforms, seasonal, and similar tokens are excluded from automatic salary recurrence (`INCOME_EXCLUDE`). Gig history is not future income when `no_gig_income` is set.

### 8.2 Fixed series

Settled historical debits in `FIXED_CATEGORIES` are grouped and projected forward on their cadence. Rent can be scaled by `facts.rent_multiplier`. A scheduled debit does **not** replace a different same-category series in that month (`request_24`: scheduled insurance 1830 plus the regular 2510 policy). Delivery-membership is capped in the pending-gig state. Occupied months are not double-booked.

### 8.3 Variable streams (the overfit zone)

Default amount policy is the series **mean**. Then a large set of **state-dependent first-cycle blends** fire: last hit vs mean vs last-3 vs p75 vs max, with ratios such as 4:1, 3:2, 11:7, 1/12, 1/19, 1/29, 1/30. These were added during a sample-driven loop to move A toward gold without hardcoding `request_id`.

Horizon policy (compressed):

- Essentials (groceries, transport, unprotected utilities, protected healthcare): continue across 90 days, conservative.
- Dining: one cycle by default. With confirmed future salary, monthly-ish dining (`period >= 21`) forecasts every cycle through +90 (first cycle mean, later cycles high observation). Biweekly dining (`14 <= period < 21`) reserves two cycles. Weekly dining stays at one cycle.
- Shopping / entertainment: usually one next cycle, unless the user already lists that category as a recurring cuttable bill and the period is monthly-ish.
- Skip a cycle when the last settled hit is very recent (`SKIP_RECENT_VARIABLE_DAYS = 1`) so yesterday's grocery is not reserved again.
- Quiet week (last hit below 75% of mean, still in cycle, not yesterday): first grocery can use the last hit.
- High outlier settled yesterday: skip that cycle, reserve the next regular hit at a high historic value.
- Lost second income: do not resume the missing series. Dining and entertainment still forecast through +90 (household has not cut yet). Several first-cycle blends use the earlier dual-income mean so a quiet post-loss week does not under-reserve.
- Pending gig: do not reserve shopping or entertainment. Keep one dining cycle. Drop a last transport spike.
- No confirmed future income: protected healthcare uses last settled amount. Shopping uses a high percentile, not a single peak.
- Pull-before-income: if the first cycle of a stream lands a few days after the first payday, it can be reserved on `request_date` so A sees the imminent trough.

These rules are documented in `code/SPEC.md` section 10 with the sample that motivated each one. That is both the strength (A moved from 4/25 to 18/25) and the risk (hidden users may not share those blend ratios).

### 8.4 Salary forecast

- `salary_stop` or "Final employer payroll" with no remaining series: invent nothing (`request_05`).
- Message-stated next date and amount: land that amount monthly from that date.
- Raise from a date: new amount from that date (`request_02`).
- Temporary reduced pay: use the reduced amount, not the older higher one (`request_06`).
- Payday replaced: move the next credit (`request_07`).
- Resume after leave: do not fill the gap months (`request_14`).
- First salary: credit on the stated date. Skip weekly streams inside the current cycle before that payday (`request_15`).
- Arrears split: forecast regular net only (`request_03`).
- Freelance milestones with no scheduled next row: do not invent (`request_09`).

---

## 9. Plan picker (`code/plan.py`)

After A and B exist:

1. Search eligible plans with **no** spending changes (full today, wait, partial, matching installment options).
2. If none are 90-day-safe, retry the same search with `until=deadline`.
3. If still none, and B exists and B is after the deadline, search spending-change combinations (size 1..3).
4. Prefer fixed-category subscription stops/reduces first. Only if that fails, include variable handles (latest settled event in a willing category).
5. If a mixed set includes a variable handle and leftover subscription stops, drop the leftover stops when the variable handle alone is enough (`request_11` reduces dining only).
6. Rank survivors. Emit explanation from gold-style templates.

Explanation templates (one or two English sentences even if the request is Indonesian):

- Affordable now: `Pay {ccy} {amt} today. This leaves at least {ccy} {min} available over the next 90 days.` Some gold rows use `This keeps the {ccy} {min} minimum available...` (`request_09` and several eval rows).
- Wait before deadline: `Wait until {date}, then pay ... Paying sooner would put the {ccy} {min} minimum at risk.`
- Wait on deadline: `Pay {ccy} {amt} in full on {date}. Paying earlier would take the balance below the {ccy} {min} minimum.`
- Installments / partial / changes / not recommended: matching gold sentences. The "Although {safe} is available today" template is used when the user considers only partial, A > 0, and B is empty (`request_14`, `request_24`).

Spending-change rows on the frozen eval set (11 rows) all have B one day after the deadline, matching samples 06 / 11 / 21. The validator locks that invariant.

---

## 10. What was built, in order

This was a 24-hour contest. The participant used Cursor agents with a planned prompt sequence.

### 10.1 Prompt 0 / 1: understand, then cash engine

Confirm dataset files (early checkout was missing `financial_events.csv` and images; those were restored). Reverse-engineer the 25 gold rows into `code/SPEC.md` **before** writing production solver code. Then implement loaders, simulator, A, B, and a first ledger.

Early sample score: A about **4 / 25** exact, B already high (later 24/25 then 25/25), C stubbed.

### 10.2 Prompt 3: `/goal` + dynamic `/loop`

Goal: 25/25 exact on all eight sample columns, then a valid 250-row `output.csv`, then `evaluation/usage_report.md`. Submission packaging (Prompt 4) was forbidden until that goal was proven.

A dynamic loop ran forensic ticks for hours. Each tick: score samples, pick a miss, form a **shared** ledger or facts rule (not an id switch), apply it, rescore, keep only if no regression. Skills used in spirit: diagnosing-bugs, TDD (`code/tests/test_traps.py`), sample-driven development.

The user repeatedly insisted: fix **shared rules**, not per-`request_id` patches.

### 10.3 C lands at 16:22 IST

`code/plan.py` went live without changing A or B. All C columns hit **25 / 25**. A stayed **18 / 25**. Perfect rows became 18/25 because the seven leftovers were A-only.

### 10.4 Eval generalization, not more A blends

After 16:26 IST the loop stopped finding a clean shared blend for the last seven A misses. Work shifted to:

- Write the 250-row eval output.
- Add Indonesian and English message detectors for the other 190 messages.
- Fix invoice-vs-bonus false positive.
- Parse month-name FX salary dates (`request_113`).
- Quantize CSV amounts to kill float artifacts.
- Lock spending-change deadline rule in the validator.
- Sanity-check image facts against the PNGs.

### 10.5 Stop and package

The loop was stopped around 17:06 IST at the user's request. The Cursor `/goal` was **not** marked complete, because 25/25 exact A was never proven. Prompt 4 (new chat) packaged the frozen tree: rewrite README, delete debug scripts, one lockstep `python3 code/main.py`, build `code.zip` with `evaluation/usage_report.md` beside `code/`.

---

## 11. Problems faced as a developer

These are the real difficulties, not the marketing version of the task.

### 11.1 The problem looks like an LLM contest. It is a cash-flow contest.

The branding says "AI-powered financial agent." The scorer compares numbers and enums to hidden gold. Letting an LLM pick amounts or plans is worse than a deterministic engine: non-reproducible, expensive, and easy to miss the A/B/C split. The usage-report requirement tempted people to call a model. This project called none at runtime.

### 11.2 A, B, and C look coupled. Gold proves they are not.

The natural instinct is: if we recommend installments, A should be 0, or B should be empty. Gold does the opposite. Until that split is implemented, status and method cannot match samples even if the forecast is decent.

### 11.3 Messages are the real income model

A clean recurrence detector on events alone fails the samples. Salary raise, payday move, leave month, final payroll, unconfirmed bonus, pending gig, lost second income, and "do not invent freelance" are all **message amendments**. A public competing repo built a nicer daily-drip forecast and still reported **4 / 25 fully correct** because it never parsed `messages.csv`.

### 11.4 Blank images are not optional

Several gold rows are wrong if a blank amount is treated as zero (`request_03`, `16`, `17`, `19`, `20`). OCR is noisy (garbled English, Indian lakh commas, a Grand Total that is 10x a line Total). This project extracted once, cached JSON, and verified by reading the PNGs. Live `gpt-4o` in the competing repo still stored 2854 instead of 28544 on `image_04`.

### 11.5 Variable spend is underspecified

The spec says "forecast essential variable spending conservatively." It does not say mean vs p75 vs last hit vs last-28-day total. Gold A is a specific trough. Getting A exact required dozens of first-cycle blends. Each blend that fixed one miss threatened another. The user-imposed rule (no id hardcoding) made this slower and more honest, and it still stalled at 18/25.

### 11.6 Shared rule vs one-off ratio

Late loop ticks searched integer 2-stat blends (weights 0-12) of last / mean / median / last3 / p75 / max / min for the seven remaining A misses. **No blend landed within 0.02 of the needed first amount** across those rows. Continuing would have meant ugly per-state fractions that were sample-memorization in all but name.

### 11.7 Language and wording drift

Eval messages repeat sample facts in Indonesian or in slightly different English. Detectors had to be duplicated, then audited so a new phrase did not flip a sample flag. 32 messages were left "silent" on purpose: confirmatory receipts, closed prizes, prize-fee scams, scheduled failed-bill retries, reimbursements with no new amount.

### 11.8 Installment legality is easy to get wrong

Gold rejects on `number_of_payments <= max_installment_months`. A calendar-month conversion (`round(span/30)+1`) rejects the wrong options. Last payment must be on or before the deadline. Copy the option amounts exactly (`15952906.67`). Prefer the cheaper 3-pay fee plan over a longer financed plan.

### 11.9 90-day vs deadline safety

A strict 90-day check rejects some gold installment plans whose last payment is on time but a later essential after the deadline dips the trough. The two-pass search (90 days, then `until=deadline`) was added for `request_07`. That is a spec tension: "throughout the forecast period" vs "complete by desired_completion_date."

### 11.10 Float formatting

Binary search produced `4120116.6699999999` in CSV. Gold-style output needs compact numbers. `format_money` now quantizes to cents, then strips trailing zeros.

### 11.11 Time and process

A `/goal` that required 25/25 exact A would never complete. A `/loop` would keep editing the ledger after the solution was already eval-ready. The participant had to **stop the loop without marking the goal complete**, then package. That distinction (pause work vs claim the objective) was confusing and easy to get wrong.

### 11.12 Packaging trap

`evaluation/usage_report.md` must sit at the zip root next to `code/`. An empty `code/evaluation/` looks like the required folder in the IDE and is the wrong file.

---

## 12. Remaining gaps (be precise)

### 12.1 Known sample misses (A only)

`request_02`, `request_03`, `request_04`, `request_07`, `request_10`, `request_11`, `request_25`.

B and all C fields match gold on those rows. The residual is the first-cycle (or nearby) variable reserve being a few units off the gold trough. `request_25` was the largest leftover called out (~296 IDR). Others are small relative to IDR/ZAR magnitudes but still fail exact match.

There is **no hidden-eval score** in this export. Local validator pass is not gold.

### 12.2 Overfit risk on hidden A

The blend book in `ledger.py` was fitted to 25 users. Hidden users (250) will have different last-hit / mean relationships. Possible outcomes:

- Some of the 18 exact A hits were lucky and will miss on similar-but-not-identical streams.
- Some of the 7 misses might be closer to hidden gold than the overfit hits.
- Status / method / plan should transfer better than A, because those rules are discrete and sample-complete.

### 12.3 What was not built

- No runtime vision. If an unseen image appeared, the engine would skip a blank amount (treat as unresolved, not zero). The given dataset has exactly 16 images, all cached.
- No LLM planner or explainer.
- No daily-drip model for irregular expenses (competing approach). Variable spend is discrete dated events.
- No general NLP. Unseen message wording can stay silent.
- Debug search scripts were deleted. Forensic replay now means reading `ledger.py` and `SPEC.md`.

### 12.4 Intentional conservatism vs a generous income model

This engine refuses unconfirmed credits. A more generous engine (project all recurring income, including freelance drips) will mark more rows `affordable_now`. On eval, that showed up as large disagreements with a public competing `output.csv` (for example their `request_29` and `request_47` as full-pay-today vs this repo's not-recommended). If hidden gold is conservative like the samples, generosity loses status, method, plan, and B together.

---

## 13. Alternative approach (for contrast, not as this repo)

A public fork ([igennova/hackerrank-orchestrate-september26](https://github.com/igennova/hackerrank-orchestrate-september26), inspected 2026-09-13) used a cleaner slice architecture:

- Normalize / filter / dedup events
- Recurrence: monthly / periodic / daily drip
- Daily forecast with trough and suffix-min
- Spec-shaped plan ranker
- Live OpenAI `gpt-4o` for blank images, cached

Their own last commit claimed **4 / 25 fully correct** and **18 / 25** status. They did not parse messages. They allowed wait after the deadline if it was the only plan. They computed `max_installment_months` from calendar span. Their vision cache under-read `image_04`.

**Design quality:** theirs was cleaner. **Contest match:** this repo was closer to published gold. That contrast is the core lesson: a general forecast without message amendments loses the traps the dataset was built around.

---

## 14. Frozen submission state

After Prompt 4 (about 17:20 IST on 2026-09-13):

- `python3 code/main.py` is the only run command.
- Sample printout: A 18/25, B 25/25, C 25/25.
- `output.csv`: 250 rows, `request_26`..`request_275`, 0 validator failures.
- `evaluation/usage_report.md`: 250 requests, 0 model calls, wall time about 1.99s.
- `code.zip` built from repo root with `README.md`, `evaluation/usage_report.md`, and `code/` (including `image_facts.json` and `SPEC.md`). Excludes `dataset/`, `__pycache__`, `log.txt`, debug scripts.
- README documents stdlib-only setup. It no longer tells the judge to clone an empty starter.

Whether those three files were uploaded to HackerRank is outside this export.

---

## 15. Suggested questions (copy these)

**Understand the product**

- What does "safe" mean on a given day, in one sentence, then in simulator terms?
- Why can `amount_safe_to_pay` be positive when the method is `not_recommended`?
- Why is `affordable_with_plan` used both for installments and for full payment after stopping a stream?

**Understand the engine**

- Trace `request_06` from messages to `stop:event_476` without using the request id as a switch.
- Trace `request_12` and explain why B is today and status is not `affordable_now`.
- Trace `request_19` and show why partial beats the 2-month installment on ranking rule 3.
- How does `build_ledger` decide a grocery amount for the next cycle? List the predicates in order.

**Critique and rebuild**

- Which 20% of `ledger.py` would I delete first if I had another week?
- How would I replace first-cycle blends with a single conservative statistic and what sample score should I expect?
- How would I add a message parser that is less brittle than substring checks, without letting an LLM set A or B?
- If hidden gold uses a drip model, where does this engine systematically over-reserve or under-reserve?

**Process**

- Why was SPEC.md written before the solver?
- Why was C implemented last?
- Why was the goal left incomplete on purpose?

---

## 16. Glossary

| Term | Meaning in this project |
|---|---|
| A | `amount_safe_to_pay` |
| B | `earliest_date_for_full_payment` |
| C | Status + method + plan + spending changes + explanation |
| Gold | Published completed columns in `sample_requests.csv` |
| Hidden eval | `request_26`..`request_275` |
| Flow | One dated home-currency credit or debit |
| Trough | Lowest simulated balance in the horizon |
| Blend | Weighted mix of last / mean / other stats for a first-cycle reserve |
| Silent message | Parsed, but sets no `UserFacts` flag (confirmatory or scam) |
| Lockstep run | One `main.py` invocation that writes both `output.csv` and the usage report |

---

## 17. Source of truth inside the repo

If this export and the code disagree, trust the code and `code/SPEC.md`. This file is a study brief written on 2026-09-14. It describes the frozen solver after Prompt 4, not a later rewrite.

Primary files to open next:

1. `code/SPEC.md`
2. `code/solver.py`
3. `code/ledger.py`
4. `code/facts.py`
5. `code/plan.py`
6. `dataset/sample_requests.csv` (the 25 gold rows)
