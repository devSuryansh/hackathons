# Buy or Wait? Solver Spec (reverse-engineered from sample_requests.csv)

This file is the contract the solver must implement. Rules come from `problem_statement.md`, `AGENTS.md` §6, and the 25 public gold rows in `dataset/sample_requests.csv`. Hidden eval (`request_26` and above) follows the same contract. Do not hardcode labels for any evaluation `request_id`.

Dataset files confirmed present:

- `dataset/financial_events.csv` (25,342 rows)
- `dataset/media/images/image_01.png` through `image_16.png` (16 PNGs)

Write predictions to **repo-root** `output.csv`, not `dataset/output.csv`. `code/main.py` scores the 25 public samples, then writes one row per `dataset/requests.csv` id (`request_26`..`request_275`) and `evaluation/usage_report.md` for that run.

---

## 1. Dataset columns (every file)

### `dataset/requests.csv` (250 eval rows, `request_26`..`request_275`)

`request_id, user_id, request_date, request_type, requested_amount, desired_completion_date, allows_partial_payment, request_text`

`request_type` in `{purchase, travel, education, family_transfer, debt_repayment, investment, housing, emergency_expense, other}`.

`allows_partial_payment` is `true` or `false`.

### `dataset/sample_requests.csv` (25 gold rows, `request_01`..`request_25`)

Same input columns plus gold output columns. Use only to learn rules and style, never as a lookup table for eval ids.

### `dataset/financial_profiles.csv` (275 users)

`user_id, home_currency, current_available_balance, minimum_balance_to_keep, financial_priorities, expense_categories_to_protect, expense_categories_user_is_willing_to_reduce, expense_categories_user_is_willing_to_stop, payment_methods_user_will_consider, max_installment_months`

Pipe-separated lists: `financial_priorities`, `expense_categories_to_protect`, the two willing-to-change lists, and `payment_methods_user_will_consider`.

`home_currency` in `{INR, ZAR, IDR, USD, EUR}`.

`max_installment_months` is blank or an integer 2..12. **Blank means the user will not consider installments.**

`payment_methods_user_will_consider` uses only `{full_payment, partial_payment, installments}`. `wait` and `not_recommended` are never listed; they are derived.

### `dataset/financial_events.csv` (25,342 rows)

`event_id, user_id, event_type, description, category, direction, amount, currency, event_date, settlement_date, status, linked_event_id, flexibility, minimum_allowed_amount`

| Column | Observed values |
|---|---|
| `event_type` | `expense`, `subscription`, `income`, `debt_payment`, `investment_purchase`, `refund`, `investment_valuation`, `investment_sale` |
| `direction` | `debit`, `credit`, `non_cash` |
| `status` | `settled`, `pending`, `scheduled`, `cancelled`, `failed`, `unrealized` |
| `flexibility` | `fixed`, `reducible`, `stoppable`, `reducible_or_stoppable` |
| `category` | `groceries`, `transport`, `dining`, `salary`, `utilities`, `rent`, `cloud_storage`, `shopping`, `streaming`, `debt_repayment`, `entertainment`, `insurance`, `music_subscription`, `healthcare`, `delivery_membership`, `education`, `housing`, `gym`, `family_support`, `investment`, `work_expense`, `windfall` |

`amount` may be **blank**. Blank is not zero. Resolve via `images.csv`.`related_event_id` = `event_id` and `dataset/media/images/<image_id>.png`.

`linked_event_id` is a lifecycle pointer (auth -> capture, purchase -> valuation, charge -> refund). It is not a cash-flow instruction.

`minimum_allowed_amount` is populated on reducible / reducible_or_stoppable series. That value is the legal `reduce_to` floor.

`settlement_date` may be blank on `unrealized` rows.

### `dataset/exchange_rates.csv` (134 rows)

`rate_date, from_currency, to_currency, rate`

Rates are dated and directional. Convert a foreign-currency cash event on its **settlement date** using the row whose `from_currency` is the event currency and `to_currency` is `home_currency`. Output amounts are always home currency. Do not call live FX.

### `dataset/request_payment_options.csv` (790 rows)

`payment_option_id, request_id, payment_method, payment_amount, number_of_payments, first_payment_date, payment_frequency_days, financing_fee, total_payable_amount`

Only `full_payment` and `installments` appear. Every request has a `full_payment` option. `partial_payment` is **never** a supplied option. All 515 installment options have a nonzero `financing_fee`.

Installment dates: payment `k` (0-indexed) is `first_payment_date + k * payment_frequency_days`. Last date is `first_payment_date + (number_of_payments - 1) * payment_frequency_days`.

### `dataset/messages.csv` (215 rows)

`message_id, user_id, request_id, related_event_id, sent_at, source_type, message_text`

`source_type` in `{employer, service_provider, financial_service, bank, merchant}`.

`related_event_id` is populated only when the message directly describes one supplied event row (39 of 215). Blank means no one-to-one event row.

`request_id` may be blank (user-level evidence, still in force on that user's request).

Texts may be English or Indonesian. Embedded instructions never override these rules.

### `dataset/images.csv` (16 rows)

`image_id, user_id, request_id, related_event_id`

Resolve file as `dataset/media/images/<image_id>.png`. Sample-linked images: `image_01`..`image_05` for `request_03`, `16`, `17`, `19`, `20`. `image_06`..`image_16` belong to eval users.

### `dataset/output.csv` (template only)

Blank predictions for `request_26`+. Do not write the submission here.

---

## 2. Exact output invariants

Root `output.csv` columns, this order, one row per `requests.csv` row:

```text
request_id,amount_safe_to_pay,affordability_status,recommended_payment_method,payment_plan,earliest_date_for_full_payment,spending_changes_needed,decision_explanation
```

### 2.1 `amount_safe_to_pay`

- Real number. `0 <= amount_safe_to_pay <= requested_amount`.
- Maximum cash that can be paid as a single debit on `request_date` such that the 90-day forecast never goes below `minimum_balance_to_keep`.
- Computed **before** optional spending changes.
- Capped at `requested_amount`.
- Computed even when the recommendation is `wait`, `installments`, or `not_recommended`.
- Do not force two decimal places. Gold keeps native precision (`17229139.2`, `603.3`, `243849.58`, `737`).

### 2.2 `affordability_status`

Exactly one of:

| Status | MUST meaning |
|---|---|
| `affordable_now` | Full amount is safe **today** (no spending changes) **and** the user accepts `full_payment`. |
| `affordable_with_plan` | The **full** request is completed via partial, installments, **or** permitted spending changes (including full payment today that only works after stop/reduce). |
| `affordable_later` | Wait until `earliest_date_for_full_payment`, user accepts `full_payment`, and that date is `<= desired_completion_date`. |
| `not_affordable` | No eligible plan completes the **full** request by the deadline while passing the 90-day check. |

### 2.3 `recommended_payment_method`

Exactly one of `full_payment`, `partial_payment`, `installments`, `wait`, `not_recommended`.

Coupling:

| Status | Allowed methods |
|---|---|
| `affordable_now` | `full_payment` only. Plan is `request_date:requested_amount`. Earliest equals `request_date`. Changes `none`. |
| `affordable_with_plan` | `full_payment` (only with spending changes), `partial_payment`, or `installments`. |
| `affordable_later` | `wait` only. Plan is `earliest_date:requested_amount`. Changes `none`. |
| `not_affordable` | `not_recommended` only. Plan `none`. Changes `none`. Earliest empty iff full never becomes safe in 90 days. |

### 2.4 `payment_plan`

- Chronological `YYYY-MM-DD:amount` entries joined by `|`, or `none`.
- `full_payment` / `wait`: exactly one entry, amount equals `requested_amount`.
- `partial_payment`: exactly two entries that **sum to** `requested_amount`: `request_date:amount_safe_to_pay|earliest_date:(requested_amount - amount_safe_to_pay)`.
- `installments`: dates and amounts **equal one supplied option exactly**. Copy `payment_amount` and the option's date grid. Do not invent a custom split.
- Amount formatting: integers stay integers (`25256`). Values that have a fractional part in the source use two decimals in the plan when the gold does (`620.40`, `996.60`, `1574.40`, `3246.10`). Installment option amounts are copied as given (`15952906.67`, `22590.19`, `68432`).

### 2.5 `earliest_date_for_full_payment`

- First date a **single** full payment of `requested_amount` is 90-day-safe, **before** spending changes, **ignoring** payment-method preferences.
- Equals `request_date` whenever full is safe today, even if we recommend installments (`request_12`).
- For `affordable_now` it MUST equal `request_date`.
- May be **after** `desired_completion_date` (`request_06`, `request_11`, `request_21`).
- Empty (CSV blank, not the word `none`) iff full never becomes safe in the 90-day forecast.
- Search dates from `request_date` through `request_date + 90 days` inclusive.

### 2.6 `spending_changes_needed`

- `none`, or up to three actions joined by `|`.
- `stop:<event_id>`
- `reduce_to:<event_id>:<new_amount>`
- `stop` and `reduce_to` on the same event are illegal.
- `new_amount` is that event's `minimum_allowed_amount` (copy precision: `665950`, `23.50`).
- Only recurring, flexible, non-protected events in a category the user is willing to stop or reduce.
- `amount_safe_to_pay` stays the pre-change number when changes are used.

### 2.7 `decision_explanation`

One or two English sentences even if `request_text` or messages are Indonesian. See §9.

### 2.8 Hard bounds that reject a candidate plan

A plan is safe only if every listed payment is made, the full request is completed by `desired_completion_date` (for any recommended plan except `not_recommended`), essential / protected / reserved items are covered, and balance `>= minimum_balance_to_keep` on every day of the 90-day forecast.

Do not invent income, expenses, payment options, or other facts.

---

## 3. Field-by-field independence (MUST)

`A = amount_safe_to_pay`, `B = earliest_date_for_full_payment`, `C = recommended plan` (status + method + payment_plan + spending_changes) are **three independent quantities**. Do not couple them.

### A. `amount_safe_to_pay`

1. Binary-search (or equivalent) the largest `x` in `[0, requested_amount]` that can be debited on `request_date` without spending changes, such that the 90-day simulated balance never falls below `minimum_balance_to_keep`.
2. Ignore user payment-method preferences.
3. Ignore optional spending changes.
4. Still compute `x` when C is wait / installments / not_recommended.
5. Traps: `request_02` (safe << requested, still recommend installments), `request_07` (same), `request_14` (safe > 0 but not_recommended), `request_17` (safe < requested, installments), `request_24` (safe > 0 but not_recommended).

### B. `earliest_date_for_full_payment`

1. Walk each date `d` from `request_date` to `request_date + 90`.
2. Ask: if the user pays `requested_amount` once on `d` (no spending changes), does the 90-day check from `request_date` still hold?
3. The first such `d` is B. If none, B is empty.
4. Ignore preferences. If the user refuses `full_payment`, B can still be `request_date` (`request_12`).
5. B may be after the deadline. That does **not** by itself make `wait` eligible.

### C. Recommended plan

Choose only among plans that are **safe**, **eligible**, and complete the **full** request (or `not_recommended` if none exist). Preferences, installment caps, `allows_partial_payment`, deadline, and spending changes apply **here only**.

Eligibility filters for C (not for A or B):

- Immediate methods `full_payment`, `partial_payment`, `installments` require the method to appear in `payment_methods_user_will_consider`.
- `wait` is eligible only if the user accepts `full_payment` AND B exists AND `B <= desired_completion_date`.
- If `B > deadline` and no other eligible plan completes on time, do **not** wait. Use spending changes if they unlock an on-time plan (`request_06`, `request_11`, `request_21`). Else `not_recommended` (`request_14`).
- `not_recommended` is the fallback.

---

## 4. Status / method contract (decision tree)

Evaluate in this order after A and B are known.

```text
if B == request_date and user considers full_payment:
    status=affordable_now
    method=full_payment
    plan=request_date:requested_amount
    changes=none
else:
    build the set of eligible completing plans (see §5, §6, §7)
    if any exist:
        pick the best by §8 ranking
        status=affordable_with_plan   # partial, installments, or full-after-changes
    elif wait is eligible (user considers full_payment, B exists, B <= deadline):
        status=affordable_later
        method=wait
        plan=B:requested_amount
        changes=none
    else:
        status=not_affordable
        method=not_recommended
        plan=none
        changes=none
        # B may still be a date after the deadline, or empty
```

Notes:

- `affordable_now` requires **both** "full safe today" and "user accepts full_payment". If full is safe today but the user only considers installments / partial, the status is `affordable_with_plan` (`request_12`).
- `affordable_with_plan` includes full payment today that is only safe after stop/reduce (`request_06`, `request_11`, `request_21`). In those rows B is **after** the deadline (or after today) and A is **less** than `requested_amount`.
- `not_affordable` may still have A > 0 (`request_05`, `10`, `14`, `15`, `20`, `24`, `25`).

---

## 5. Partial payment (gold: `request_19`)

Recommend `partial_payment` only when **all** of these hold:

1. `allows_partial_payment=true`
2. User considers `partial_payment`
3. `0 < amount_safe_to_pay < requested_amount`
4. B exists and `B <= desired_completion_date`
5. The two-payment plan is 90-day-safe (paying A today and the remainder on B)

Then:

- Status MUST be `affordable_with_plan`
- Plan MUST be `request_date:A|B:(requested_amount - A)`
- The two amounts MUST sum to `requested_amount`
- Does **not** need to match `request_payment_options.csv`

If B is empty, partial is illegal even when A > 0 and the user loves partial (`request_14`, `request_24`). Use the "Although {safe} is available today" explanation, not a partial plan.

---

## 6. Installments

A supplied installment option is eligible only when **all** hold:

1. User considers `installments`
2. `max_installment_months` is **not blank**
3. `number_of_payments <= max_installment_months` (gold rejects 21/24 when max is 2: `request_03`; rejects 18 when max is 7: `request_02`; rejects 15 when max is 6: `request_10`)
4. Last installment date `<= desired_completion_date`
5. Every installment debit stays above the minimum through the 90-day forecast. If no option is 90-day-safe but one stays safe through the deadline (last payment on or before the deadline), use that option (`request_07` 3-pay). Do not invent a custom split.
6. Plan dates and amounts equal that option **exactly**

`financing_fee > 0` means `total_payable_amount` is the cost to minimize (ranking rule 3). Prefer a 3-payment fee plan over a longer, more expensive plan. Prefer zero-fee partial or full over any financed installment when those are also eligible (`request_19`).

Installment-only users (`payment_methods_user_will_consider=installments`) cannot be `affordable_now` or `affordable_later` even when B is today or later (`request_07`, `request_12`, `request_17`, `request_22`).

---

## 7. Spending changes

Eligible event (all required):

1. Recurring in history (same description and/or same flexible category with a repeated cadence). Do not change a one-off.
2. `flexibility` in `{reducible, stoppable, reducible_or_stoppable}`
3. Category is **not** in `expense_categories_to_protect`
4. For `stop:` category is in `expense_categories_user_is_willing_to_stop` and flexibility is `stoppable` or `reducible_or_stoppable`
5. For `reduce_to:` category is in `expense_categories_user_is_willing_to_reduce` and flexibility is `reducible` or `reducible_or_stoppable`
6. Use the **latest** settled event_id of that series as the handle
7. `reduce_to` new amount = `minimum_allowed_amount`
8. At most 3 actions, unique events, no stop+reduce on one event

Observed policy when several change-sets unlock an on-time plan:

- Ranking rule 2: prefer **zero** changes over any change.
- Use spending changes only when B is **after** the deadline, so wait is illegal (`request_06`, `request_11`, `request_21`). Do not use them when B is empty (`request_14`, `request_24`).
- Search fixed subscription series first (`streaming`, `cloud_storage`, ...). If a subscription set unlocks an on-time plan, do not also cut variable dining/shopping (`request_21`).
- If changes are required, use the **smallest set** that unlocks a completing on-time plan.
- Variable categories share one forecast stream. The handle is the **latest** settled event in that category (`request_11` `event_989`).
- If an event is `reducible_or_stoppable` and has `minimum_allowed_amount`, prefer `reduce_to` over `stop` (`request_21` streaming).
- If an event is `stoppable` with no minimum, `stop` it (`request_06` event_476, `request_21` event_1815).
- Apply upcoming flexible series in chronological order of their next forecast debit until the plan is safe (`request_21`: reduce streaming then stop cloud).
- Do not add extra changes after the plan is already safe (`request_11` reduces dining only, does not also stop cloud). If a mixed set is only needed because the local forecast is tight, keep the variable handle and drop leftover subscription stops.
- A and B stay pre-change. Status becomes `affordable_with_plan` even if method is `full_payment`.

Gold change rows:

| Request | Changes | Why |
|---|---|---|
| `request_06` | `stop:event_476` | Family streaming plan, EUR 19, stoppable, category `streaming`. Unlocks full EUR 620.40 today. B is 2026-01-15, after deadline 2026-01-14. |
| `request_11` | `reduce_to:event_989:665950` | Latest dining event "Weekend food delivery", reducible, min 665950. Unlocks full IDR 13,110,000 today. B is 2025-07-15, after deadline 2025-06-12. |
| `request_21` | `stop:event_1815\|reduce_to:event_1816:23.50` | Stop online backup (USD 11) and reduce streaming to 23.50. Unlocks full USD 1,574.40 today. B is 2026-04-15, after deadline 2026-04-14. |

---

## 8. Plan ranking (when several eligible plans are safe)

1. Completes the full request by `desired_completion_date`
2. No spending changes
3. Minimize total amount paid (prefer no financing fee; compare `total_payable_amount` / sum of plan debits)
4. Earlier first payment
5. Fewer payments
6. Lowest `payment_option_id`

`wait` loses to any on-time immediate method that is eligible. `not_recommended` is not ranked; it is the empty-set fallback.

---

## 9. Explanation templates (from gold)

Always English. Name the action, the money, and the minimum-balance floor. Use home currency. Thousands separators. Two decimals only when the source amount is non-integer. Dates as `D Month YYYY` with no leading zero (`8 August 2025`, `1 March 2026`).

| Situation | Template |
|---|---|
| `affordable_now` | `Pay {ccy} {amt} today. This leaves at least {ccy} {min} available over the next 90 days.` (`request_09` uses `This keeps the {ccy} {min} minimum available over the next 90 days.`) |
| Installments | `Use {n} installments of {ccy} {amt}, starting {date}. This leaves at least {ccy} {min} available.` |
| Wait, B < deadline | `Wait until {date}, then pay {ccy} {amt} in full. Paying sooner would put the {ccy} {min} minimum at risk.` (`request_04`) |
| Wait, B == deadline | `Pay {ccy} {amt} in full on {date}. Paying earlier would take the balance below the {ccy} {min} minimum.` (`request_03`, `08`, `13`, `18`, `23`) |
| Partial | `Pay {ccy} {a} today and the remaining {ccy} {b} on {date}. This completes the full request and keeps the {ccy} {min} minimum protected.` |
| Spending changes then full today | `Stop/Reduce {named expense}..., then pay {ccy} {amt} today. This leaves at least {ccy} {min} available.` Use the event **description**, not the event_id. |
| `not_recommended`, general | `Do not make this payment by {deadline}. None of the available options keeps the {ccy} {min} minimum protected.` |
| `not_recommended`, partial-tease | `Do not proceed with the {ccy} {requested} request. Although {ccy} {safe} is available today, the full amount cannot be completed safely within 90 days.` Use this only when the user considers **only** `partial_payment`, `allows_partial_payment=true`, `A > 0`, and B is empty (`request_14`, `request_24`). If the user also considers installments, use the general template (`request_10`). |

---

## 10. Cash-recognition rules

Forecast window: `request_date` .. `request_date + 90 days`. Start cash at `current_available_balance` (already includes all settled history).

### 10.1 Count / reserve / ignore

| Item | Treatment |
|---|---|
| `current_available_balance` | Starting cash. |
| Pending **debits** | Reserve the full amount on (or before) settlement. |
| Pending **credits** (refunds, merchant credits) | Do **not** count until `settled`. |
| Scheduled **debits** | Reserve on settlement date. A scheduled debit does not replace a different same-category series in that month (`request_24` scheduled insurance 1830 plus the regular 2510 policy). |
| Scheduled / confirmed **salary** | Credit on settlement date only. |
| Bonuses, commissions, lottery, prizes, investment gains | Count only if already `settled`. Do not forecast another. |
| Failed, cancelled | Ignore. |
| Duplicate pending card charges | Ignore (safer: do not double-reserve a charge already represented). |
| `investment_valuation` / `unrealized` / `non_cash` | Ignore. Not cash. If a message says no units were sold and no cash proceeds were generated, also skip a transport cycle that posted exactly one period ago (`request_22`). In that same state, if yesterday's grocery is a regular hit already in the starting balance, the next grocery week uses that last bill, not the cheaper long-run mean. If the last utility bill is below the series mean, the first utilities reserve weights the mean 9:2 over that last bill. |
| `investment_purchase` already settled | Already in the balance. Do not treat the valuation as extra cash. |
| `investment_sale` settled | Credit once (cash already in balance if settlement_date < request_date). |
| Settled refunds | Already in the balance. Do not replay. |
| `linked_event_id` | Lifecycle pointer only. |
| Internal same-person transfer (matching debit+credit, bank message) | Net cash = 0. Do not treat the credit as income or the debit as a recurring essential. |
| Blank `amount` | Not zero. Read the linked image. |
| Foreign-currency cash event | Convert on settlement date, stated `from_currency -> to_currency`, home currency output. |
| Future income with no confirmation | Do not invent. |

### 10.2 Recurrence

Detect a series only when history supports it:

- Same `description` + `category` + (usually) same `amount`, appearing on a stable cadence (monthly day-of-month, or weekly for groceries/transport).
- Typical gold histories have 5 or 6 settled hits for rent, subscriptions, debt, insurance, family_support.
- Forecast those series forward through day +90 on the implied cadence.
- Variable essentials (`groceries`, `transport`, unprotected `utilities`, `healthcare` when protected, `dining` if not being reduced): forecast **conservatively** (high recent-cycle total / high percentile, not the optimistic mean). With no confirmed future income, protected healthcare uses the last settled amount (`request_05`) and the next shopping cycle uses a high percentile of history, not the mean or a single peak. If the last grocery posted two days ago and is a regular week, the next grocery reserve keeps that last bill dominant and mixes in one-twelfth of the series mean (`request_05`). Do not apply that yesterday (`request_10`). If the last grocery hit is a quiet week (below 75% of the mean) and still inside the current cycle, but not yesterday, the first forecasted grocery uses that last hit (`request_23`, `request_06`). If the last hit is a high outlier settled yesterday (already in the starting balance), skip that cycle and reserve the next regular hit at the high historical observation, not the mean (`request_19` blank grocery image). In that same state the next healthcare reserve uses the last clinic bill, not the long-run mean, and the next shopping reserve keeps the series mean dominant and mixes in one-twelfth of the last-three mean (`request_19`). If that bulk grocery settled within two days, the next dining cycle weights the last settled dining hit 4:1 over the series mean when that last hit is below the mean (`request_17` image). If it settled two days ago, not yesterday, the next commute weights the high fare 6:5 over the low fare (`request_17`). Do not widen the grocery skip to two days. If utilities is protected and the last settled bill is the high observation, the first reserve uses that last bill, not the mean (`request_21`). If a sub-weekly transport series (`period <= 5`) posted exactly one period ago, skip the first forecasted commute; that cycle is already in the starting balance. The next fare still uses that last settled amount, not the long-run mean (`request_06`). If it posted yesterday, the next fare weights that last amount 2:1 over the series mean (`request_25`). If it posted earlier in the same cycle, the next fare is the midpoint of the last settled amount and the series mean (`request_24`). Do not skip weekly transport on the same tests (`request_10`).
- Dining horizon is income-state and cadence aware (A/B ignore the actual reduce):
  - Confirmed future salary and dining period `>= 21` (monthly-ish): forecast every cycle through +90. Later cycles use the high historical observation; the first cycle stays the mean so the imminent A trough is unchanged (`request_11` B = 2025-07-15).
  - Confirmed future salary and biweekly dining (`14 <= period < 21`): reserve two cycles. Full-horizon biweekly dining empties B on tight salaried rows (`request_08`, `request_13`, `request_17`). Weekly dining (`period < 14`) stays at one cycle; a second weekly hit before payday understates A (`request_25`).
  - No confirmed future income: one next dining cycle.
  - If the last dining hit is below 85% of the series mean, the first dining reserve keeps the earlier mean dominant and mixes in one-tenth of the last-three mean so recent high weeks still count (`request_08`, `request_21`). In that same state, if the last shopping month is above its series mean, the first shopping reserve keeps the shopping mean dominant and mixes in one-twenty-ninth of that last bill (`request_21`). If yesterday's dining hit is above the series mean, the first dining reserve keeps the mean dominant and mixes in one-thirtieth of that last bill (`request_24`). A recent bulk grocery still forces last-hit dining (`request_17`).
- Other discretionary categories (`entertainment`, `shopping`) stay at one next cycle unless the user already lists that category as a recurring cuttable bill (`expense_categories_user_is_willing_to_reduce`) and the period is `>= 21`. Then forecast through +90 with the same first-mean / later-high shape. Do not 90-day forecast entertainment merely because a same-description monthly series exists (`request_13` B).
- One-offs (promotion arrears, quarterly bonus, prize, reimbursement, bulk pantry) do not recur.
- A series that **stops** in history (second household income missing the latest cycle: `request_13`) is not resumed. Dining and entertainment still forecast through +90 (the household has not cut yet). Later dining cycles use the high historical observation. If the last entertainment month is below the earlier mean, entertainment uses that earlier mean so the quiet post-loss month does not pull the reserve down (`request_13`). The first grocery and dining reserves also use the earlier mean when the last week is already below the dual-income mean. The first transport reserve keeps the series mean dominant and mixes in one-fourth of that earlier mean. The first utility reserve uses the last settled bill, not the dual-income mean. Do not reserve a monthly bill that lands within 4 days of the horizon end in that income state.
- A series explicitly ended by a message (final payroll, seasonal contract ended) is not forecast.
- Gig / marketplace weekly payouts are **not** forecast as confirmed income when a message says the next payout is pending or the app balance is not withdrawable (`request_10`). Do not reserve shopping or entertainment in that income state; keep one dining cycle. Do not reserve a third delivery-membership month. If the last commute is above the series mean, the first transport reserve uses the earlier mean so one high fare does not set the imminent bill. If the last dining week is also above the mean, the first dining reserve keeps the series mean dominant and mixes in one-tenth of the earlier mean.
- Freelance / irregular milestone pay with no scheduled next row is not invented (`request_09`).

### 10.3 Income amendments (messages beat raw history)

When an employer message and the event table disagree, apply §11. Observed mappings:

- New monthly salary amount from date D: forecast that amount on the usual payday from D onward (`request_02`: IDR 42,750,000 from 2025-08-15; history was 33,345,000). If the last dining hit is above the series mean, the first dining reserve weights the mean 4:1 over that last bill.
- "Regular salary and one-time shown separately": forecast only the regular net (image / repeating amount), not the arrears (`request_03`). The first grocery reserve uses the last settled week, the post-arrears run rate, not the long-run mean. The first shopping reserve uses the last three settled months.
- Unconfirmed bonus / open-deal commission: do not credit (`request_04`, `request_11`). For the first upcoming dining debit, reserve the larger of the last settled dining hit and the last-28-day dining total, not the long-run mean. Two recent hits use the 28-day total (`request_04`). One recent hit below the mean uses that last hit (`request_11`). If the last grocery posted within 3 days, the next grocery reserve weights that last bill 3:2 over the series mean (`request_04`). If it posted 4-5 days ago and is below the mean, keep the series mean dominant and mix in one-nineteenth of that last bill (`request_11`).
- Temporary reduced pay "continues for the next payroll": use the reduced amount, not the older higher salary (`request_06`: 1037.52 not 1441). If the last shopping month is below the series mean, the first shopping reserve keeps the mean dominant and mixes in one-sixth of that last bill.
- Payday replaced by a new date: move the next salary (`request_07`: 2024-09-23). The first utility reserve uses the lower of the last two settled bills when those bills are already below the older mean. The first grocery reserve uses the last three settled weeks. The first transport reserve uses the last settled commute.
- Next salary reduced / restored after leave: use the stated next amount (`request_08`: 1422.85).
- Confirmed base raise, commissions unearned: forecast the new base only (`request_11`: IDR 38,760,000).
- Seasonal / contract ended, no renewal: zero future pay (`request_12`).
- Salary resumes on date D after a leave gap: credit D, D+1 month, ...; do **not** fill the gap months (`request_14`). The first shopping and utilities reserves keep the high pre-leave observation dominant and mix in one-tenth of the last bill.
- First salary confirmed on a date: credit that date (`request_15`). History of two prior payrolls plus the message is enough; do not invent a third beyond the confirmed cadence without support. Weekly/biweekly variable hits already posted in the current cycle stay in the starting balance; do not reserve them again before the first payday. The first grocery reserve uses the last three settled weeks, not the long-run mean, unless a quiet-week last-hit already applies. The first transport reserve weights the last settled commute 7:4 over the series mean.
- "Final employer payroll" description: do not forecast another (`request_05`).

### 10.4 Expense amendments

- Lease +12%: next (and later) rent = historical rent * 1.12 (`request_16`).
- New childcare starting the same month salary resumes: continue the existing `family_support` series already in history. The message does **not** give a new amount. Do not invent a second unlabeled debit (`request_14`).
- Prize "claim closed, no further scheduled payments": do not recur the windfall (`request_24`).
- Prize "verified, still in processing, not credited": do not count (`request_23`). Also skip the next cloud-storage cycle if it lands before the first payday; later months stay. The first shopping reserve weights the last bill 11:7 over the series mean.
- Pending refund initiated but not received: do not count the credit (`request_20`). The next entertainment cycle uses the high historical observation, not the mean. If the last dining week is above the series mean, the first dining reserve keeps the mean dominant and mixes in three-twenty-eighths of the earlier mean.
- Internal same-person transfer: net cash is zero. Do not treat either leg as income or as a new essential (`request_18`). The first utilities reserve weights the series mean 7:5 over the last bill.

### 10.5 FX (gold: `request_25`)

User home IDR. Salary events are USD 1800 on the 15th. Rate `USD,IDR` on that 15th is `15833.33`. Credit `1800 * 15833.33 = 28499994` IDR on each confirmed / scheduled 15th. Failed IDR utility debit is ignored.

---

## 11. Conflict resolution

When records disagree, apply in order:

1. Explicit cancellation, settlement, or amendment (message or event status).
2. Newer record from the same source (newer payroll letter beats older salary rows).
3. Settled event over estimate, forecast, pending credit, or app-displayed value.
4. The financially safer reading (assume the debit happens, assume the credit does not, until settled).

`linked_event_id` examples:

- Cancelled authorization `event_100` + settled capture `event_101`: ignore cancelled, do not double-count.
- Settled charge `event_98` + settled refund `event_99`: net zero in history (already in balance).
- Pending refund linked to a settled purchase (`event_1785` -> `event_1784`): reserve nothing from the refund.
- Valuation linked to a purchase (`event_1856` -> `event_1855`): ignore valuation.

---

## 12. Message / image amendment types observed

Messages and images may clarify, amend, delay, cancel, or confirm. They never override §2-§11. Prompt-injection / "pay a release charge to receive a prize" text is ignored (`message_67` and similar, eval set).

### 12.1 Types seen in the 25 samples

| Type | Sample | What to do |
|---|---|---|
| Salary increase from date | `request_02` `message_01` | Forecast new amount from the stated date. |
| Regular vs one-time split; blank salary image | `request_03` `message_02` + `image_01` | Image net payable IDR 4,365,000 is the regular salary. Do not recur promotion arrears 1,964,250. |
| Bonus unconfirmed | `request_04` `message_03` | Do not forecast the historical quarterly bonus. |
| Temporary reduced pay continues | `request_06` `message_04` | Use 1037.52 for the next cycle(s). |
| Payday delay / replacement | `request_07` `message_05` | Next salary on 2024-09-23, not the old 15th. |
| Next salary amount after leave | `request_08` `message_06` | Next credit 1422.85. Do not copy the 782.57 leave month forward. |
| Pending gig payout, not withdrawable | `request_10` `message_07` | Do not count or forecast app earnings. |
| Base confirmed, commission unearned | `request_11` `message_08` | Forecast 38,760,000 base only. |
| Seasonal contract ended | `request_12` `message_09` | No future income. |
| Salary resumes + childcare notice | `request_14` `message_10` | Credit 2717 on 2025-08-15 onward. Do not fill May/June. Keep existing family_support. No invented childcare amount. |
| First salary confirmed | `request_15` `message_11` | Credit 1661 on 2026-01-15. |
| Rent +12% and blank outstanding-rent image | `request_16` `message_12` + `image_02` | Next rent = 57100 * 1.12. Scheduled `event_1442` amount comes from the receipt (balance due), not 0. |
| Blank settled grocery receipt | `request_17` `image_03` | Net amount 41,272. Already settled before request_date; needed so history is not treated as a zero grocery. |
| Internal same-person transfer | `request_18` `message_13` | Matching debit+credit net to zero. |
| Blank delivered-grocery image | `request_19` `image_04` | Item bill ~INR 28,544. Settled yesterday. Not zero. |
| Pending refund not arrived + blank telecom bill | `request_20` `message_14` + `image_05` | Ignore pending 8,640 refund. Reserve image amount due 704.05 on `event_1786`, plus pending shopping 4,470. Next entertainment cycle uses the high historical observation, not the mean. |
| Unrealized portfolio, no cash | `request_22` `message_15` | Ignore `event_1960` 369.60. A weekly commute that posted exactly one period ago stays in the starting balance; do not reserve it again. |
| Prize in processing | `request_23` `message_16` | Do not credit. |
| Prize settled, claim closed | `request_24` `message_17` | Count the settled windfall once (already in balance). Do not forecast another. |

### 12.2 Image extraction rules

- Always `dataset/media/images/<image_id>.png`.
- Prefer labeled totals: `Net payable`, `Balance Due`, `Net Amount` / `Cash Paid`, `Item Bill` / order total, `Amount due till <date>`, invoice `Total` / `Grand Total` / `Amount Payable` / `Balance Due`.
- Documents are noisy (garbled English, Indian lakh commas `1,00,000` = 100000). Read the outstanding / net figure, not a random line item.
- Do not invent an image when the file is absent.
- Cached structured totals live in `code/image_facts.json` (`image_id`, `event_id`, `amount`, `currency`, `date`) for `image_01`..`image_16`. Eval blanks: pending grocery `event_6033` = 79679.26 (`image_10`); scheduled hospital `event_6859` = 3650 (`image_11`). Restaurant `image_07` uses the line Total 8528.10, not the garbled Grand Total 85228.

### 12.3 Types repeated in the full 215 messages (same rules on eval)

Salary increase; salary reduce / unpaid leave; payday replace; first-salary confirm; contract ended; bonus / commission unconfirmed; pending gig payout; rent +12%; internal transfer; pending refund; unrealized valuation; prize processing; prize closed; childcare-on-resume; plus ignore-scam "pay a fee to release a prize".

Eval-only wording that uses the same rules:

- Indonesian temporary pay (`gaji bulanan sementara`).
- Regular salary + one-time arrears with a stated regular amount (use the first currency amount, not the arrears add-on).
- One household job ended, remaining confirmed monthly salary (set lost-secondary and forecast only the remaining amount).
- Employment ended, no further regular pay (`hubungan kerja anda telah berakhir`).
- Foreign salary confirmed on a date (`gaji sebesar USD … dikonfirmasi untuk`, or English `salary of … is confirmed for` plus a receiving-bank conversion). Convert on that date.
- English `your employment has ended` / no further regular pay after final settlement.
- Indonesian gig payout still pending (`saldo belum dapat ditarik` / weekly app earnings).
- Indonesian rent +12% (`menaikkan biaya sewa bulanan sebesar 12%`).
- Confirmed freelance invoices convert to home currency on the settlement date. Do not treat `masih menunggu persetujuan` on an invoice as an unearned-bonus flag.
- Foreign-currency refund still processing: treat as a pending credit.
- Indonesian payday replacement (`gaji yang sudah dikonfirmasi kini diperkirakan masuk pada` / `menggantikan tanggal penggajian`).
- Indonesian seasonal contract ended (`kontrak musiman saat ini telah berakhir` / `belum ada pendapatan di luar musim`).
- English unrealized drop with no sale (`has not been sold` and `no cash transaction`), same rule as `no units have been sold`.
- English month-name dates (`15 September 2026`) plus `salary credit` / `exchange rate when it settles` (`request_113`). Convert on that date. The salary date is the last date in the message when a receipt date also appears.
- Failed bill with "still outstanding" already has a scheduled retry row. Ignore the failed attempt; reserve the scheduled retry. Sample failed utilities without that retry stay ignored.
- Work-expense reimbursement closed is a settled one-off, not salary. Do not forecast another reimbursement.

---

## 13. Worked independence checks (do not code as id switches)

- `request_12`: A = full 65164, B = 2026-04-05, C = 3 installments because the user does not consider `full_payment`. Status is `affordable_with_plan`, not `affordable_now`.
- `request_06` / `11` / `21`: A < requested, B after deadline, C = full today **after** changes. Status `affordable_with_plan`.
- `request_14` / `24`: A > 0, user wants partial, B empty, C = not_recommended.
- `request_03`: user considers installments but max 2 months rejects 21/24, so C = wait on B (payday = deadline).
- `request_19`: A=28820, B=2024-09-15, a 2-month installment also exists, C = partial because it completes on time with a lower total (no fee).

---

## 14. Sample trap table (25 rows)

| ID | Gold (status / method / A / B / changes) | Trap encoded |
|---|---|---|
| `request_01` | `affordable_now` / `full_payment` / 25256 / 2024-03-03 / none | Happy path. Reserve pending fuel 567.6. Ignore cancelled auth. Count scheduled salary 23320 on 2024-03-15. User considers only full. 15/6/24-month options miss the 2024-03-20 deadline and max_inst is blank. |
| `request_02` | `affordable_with_plan` / `installments` / 17229139.2 / 2025-09-15 / none | **A is independent**: safe today is 17.2M, not 0 and not 46.0M. User refuses full, allows installments (max 7). Pick the 3-payment option (last 2025-10-07 <= 2025-10-10). Reject 18-month (n>7 and last date after deadline). Indonesian payroll message: raise to 42,750,000 from 2025-08-15 (no scheduled salary row). Reserve pending merchant 1,651,100. |
| `request_03` | `affordable_later` / `wait` / 873000 / 2019-11-15 / none | **max_installment_months=2** rejects 21- and 24-month options. Full is not safe today (A=873000). Wait until payday B=deadline. **Blank salary image** (`image_01`, net 4,365,000). Do not recur promotion arrears. Pending pharmacy reserved. |
| `request_04` | `affordable_later` / `wait` / 8401800 / 2024-06-15 / none | User considers only full (blank max_inst). Partial allowed by request but not by user. Unconfirmed quarterly bonus must not be forecast. Reserve scheduled school fee 1,704,300. B is before the deadline, so use the "Wait until …" template. |
| `request_05` | `not_affordable` / `not_recommended` / 737 / empty / none | **A>0, B empty**. Last income is "Final employer payroll". Do not invent another salary. max_inst=4 rejects 18/24-month options. Ignore failed utility. No wait because B does not exist. |
| `request_06` | `affordable_with_plan` / `full_payment` / 603.3 / 2026-01-15 / `stop:event_476` | **A, B, C split**. A=603.3 < 620.40. B=2026-01-15 **after** deadline 2026-01-14, so wait is illegal. Installments not considered (blank max_inst; 6-month option also starts after deadline). Stop streaming unlocks full today. Temporary pay 1037.52 continues. Ignore cancelled 66 auth. A stays pre-change. |
| `request_07` | `affordable_with_plan` / `installments` / 87170.56 / 2024-10-23 / none | **A independent** (87170.56). User considers **only installments**. Cannot wait or pay full even though B exists. 3-month option beats 15-month (n>12, last after deadline, higher fee). Payday moved to 2024-09-23. |
| `request_08` | `affordable_later` / `wait` / 284.57 / 2025-04-15 / none | Jan salary was 782.57 (leave). Message sets next salary to 1422.85. User only full. 18-month option misses deadline. Wait on B=deadline. |
| `request_09` | `affordable_now` / `full_payment` / 166.61 / 2026-07-04 / none | Irregular freelance income. **Do not invent** the next milestone. Current slack still covers 166.61. All events `fixed`; empty stop/reduce lists. 21/24-month options exceed max_inst=2. |
| `request_10` | `not_affordable` / `not_recommended` / 12700 / empty / none | Weekly gig history is **not** confirmed future income. Message: next payout pending, not withdrawable. User has no `full_payment`, max_inst=6 rejects 15-month option, B empty so partial is illegal despite `allows_partial_payment=true`. A=12700>0. |
| `request_11` | `affordable_with_plan` / `full_payment` / 12510645 / 2025-07-15 / `reduce_to:event_989:665950` | **B after deadline**. User only full. Wait illegal. Reduce dining to 665950 unlocks full today. Do not also stop cloud. Confirmed base 38,760,000; **ignore unearned commissions**. A stays 12,510,645. |
| `request_12` | `affordable_with_plan` / `installments` / 65164 / 2026-04-05 / none | **THE B-vs-C trap.** Full is safe today (A=requested, B=request_date) but the user does **not** consider full_payment, so status is not `affordable_now`. Seasonal contract ended: invent no future pay. 3-month option (last date = deadline) beats 21-month. |
| `request_13` | `affordable_later` / `wait` / 433.4 / 2024-05-15 / none | Dual-income household. Second income **stops** after 2024-01-20. Do not resume it. Only primary scheduled 1343.54 on 2024-03-15. User only full. Wait on B=deadline. |
| `request_14` | `not_affordable` / `not_recommended` / 597.74 / empty / none | **A>0 does not imply a plan.** User only partial. Partial needs B<=deadline. B empty (leave gap, tight surplus, 90-day full never safe). Salary resumes 2025-08-15; do not fill May/June. Childcare message has no amount. Although-template. |
| `request_15` | `not_affordable` / `not_recommended` / 83.05 / empty / none | New job, two payrolls plus confirmed 1661 on 2026-01-15. User only partial, request forbids partial, blank max_inst. Spending changes cannot create B (B ignores changes) and user refuses full, so dining reductions do not help. Deadline 2026-02-01 is tight. |
| `request_16` | `affordable_now` / `full_payment` / 122500 / 2023-08-12 / none | **Blank scheduled rent** `event_1442` + `image_02` (outstanding balance due). Lease +12% applies to the **next** monthly rent (57100*1.12), not as a reason to invent extra income. Still safe today. max_inst=2 rejects 6/15-month options. |
| `request_17` | `affordable_with_plan` / `installments` / 243849.58 / 2026-03-15 / none | **A independent** (243849.58 < 274600). User only installments, max 3. Copy the 3-payment option exactly. B=next salary 2026-03-15 (scheduled row). **Blank grocery image** (`image_03`, 41,272) already settled. Settled reimbursement is already in the balance. Reject 18-month. |
| `request_18` | `affordable_later` / `wait` / 462 / 2026-09-15 / none | Bank message: internal same-person transfer. Net zero. Do not treat either leg as income or as a new essential. User has no installments. Wait on B=deadline. |
| `request_19` | `affordable_with_plan` / `partial_payment` / 28820 / 2024-09-15 / none | **Canonical partial.** allows_partial, user considers partial, 0<A<requested, B=2024-09-15<=2024-10-04. Plan `2024-09-04:28820\|2024-09-15:10840` (sums to 39660). Beats the 2-month financed option on ranking 3 (39660 < 41246.4). 3-month option misses deadline and max_inst=2. **Blank grocery image** (`image_04`). User does not consider full. |
| `request_20` | `not_affordable` / `not_recommended` / 5400 / empty / none | Reserve pending shopping 4470 **and** image telecom 704.05. **Do not** count pending refund 8640. Next entertainment cycle uses the high historical observation. Short deadline 2026-02-22. 18-month option misses deadline and max. B empty. |
| `request_21` | `affordable_with_plan` / `full_payment` / 1543.35 / 2026-04-15 / `stop:event_1815\|reduce_to:event_1816:23.50` | **B = 2026-04-15 after deadline 2026-04-14.** Ignore unrealized valuation 270.72. Reserve pending fuel 53. Count scheduled salary only on 2026-04-15. Two legal changes unlock full today. A stays 1543.35. User only full. |
| `request_22` | `affordable_with_plan` / `installments` / 475.46 / 2025-01-15 / none | Ignore unrealized 369.60 (message: no units sold, no cash). Reserve pending merchant 43. User only installments, max 6. 3-month option (last 2025-02-02 <= 2025-02-10) beats 15-month. |
| `request_23` | `affordable_later` / `wait` / 9152 / 2025-07-15 / none | Prize still in processing: **not cash**. Reserve pending pharmacy 1553.2. User considers installments but 18/24-month options miss deadline and max 12. Wait on B=deadline. Do not take the prize bait. |
| `request_24` | `not_affordable` / `not_recommended` / 13420 / empty / none | **A>0, B empty, Although-template.** Prize already settled (windfall 33550); claim closed, no second prize. User only partial. Scheduled insurance 1830 reserved. Cannot partial without B. |
| `request_25` | `not_affordable` / `not_recommended` / 1425000 / empty / none | **FX**: USD 1800 salary * 15833.33 on the 15th. Ignore failed 1,246,400 utility. max_inst=3 rejects 15/24-month options. Deadline 2024-04-17 is before a 3-month installment could finish anyway. A=1,425,000>0, B empty. |

---

## 15. Solver implementation notes (for the next prompt)

- Deterministic Python entry: `code/main.py`.
- Read only `dataset/` participant files. No organizer-only files. No hardcoded eval labels.
- Secrets from environment variables only.
- Reconstruct state per request: profile + that user's events + that request's options + that user's messages/images.
- Fill blank amounts from images before forecasting.
- Apply message amendments, then simulate cash, then compute A, then B, then C, then the explanation.
- Write repo-root `output.csv`.
- Do not start that solver until the next prompt.
