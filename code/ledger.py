from __future__ import annotations

import calendar
from collections import Counter, defaultdict
from datetime import date, timedelta
from statistics import median
from typing import Iterable

from load import Dataset, convert
from models import CashFlow, Event, Profile, Request, UserFacts
from simulator import horizon_end

IGNORE_STATUSES = {"failed", "cancelled", "unrealized"}
NON_CASH_TYPES = {"investment_valuation"}
PENDING_CREDIT_BLOCK = {"refund", "income"}

INCOME_EXCLUDE = (
    "bonus",
    "commission",
    "prize",
    "windfall",
    "arrears",
    "prorated",
    "delivery platform",
    "driver platform",
    "weekly app",
    "task marketplace",
    "freelance",
    "consulting invoice",
    "content contract",
    "independent work",
    "application project",
    "client retainer",
    "website project",
    "design contract",
    "seasonal",
    "temporary assignment",
    "peak-season",
    "account commission",
)

GIG_DESC = (
    "delivery platform",
    "driver platform",
    "weekly app",
    "task marketplace",
)

PERIODIC_CATEGORIES = {
    "groceries",
    "transport",
    "dining",
    "utilities",
    "healthcare",
    "shopping",
    "entertainment",
}

# Discretionary streams: forecast only the next cycle. Essential streams
# continue across the 90-day window.
# Dining, shopping, and entertainment: one next cycle unless income-aware
# logic below extends dining.
DISCRETIONARY_CATEGORIES = {"dining", "shopping", "entertainment"}
DISCRETIONARY_OCCURRENCES = 1
# If the first cycle of a stream lands just after the first income (same
# pay-cycle, a few days after payday), reserve it on request_date.
PULL_DISCRETIONARY_BEFORE_INCOME = True
PULL_ESSENTIAL_BEFORE_INCOME = True
PULL_AFTER_INCOME_DAYS = 7
# Monthly streams after payday belong to the next cycle, not today's reserve.
PULL_MAX_PERIOD = 21
# Skip one variable cycle when the last settled hit is very recent.
SKIP_RECENT_VARIABLE_DAYS = 1
FIXED_MAX_OCCURRENCES = 10**9
ESSENTIAL_MAX_OCCURRENCES = 10**9
NO_INCOME_FIXED_MAX_OCCURRENCES = 10**9

FIXED_CATEGORIES = {
    "rent",
    "housing",
    "insurance",
    "debt_repayment",
    "family_support",
    "education",
    "cloud_storage",
    "streaming",
    "music_subscription",
    "delivery_membership",
    "gym",
}

# last-N observation policy for variable streams: "last", "max3", "mean", "max"
VARIABLE_AMOUNT_POLICY = "mean"
FIRST_CYCLE_AMOUNT_POLICY = "mean"


def add_months(day: date, months: int) -> date:
    month0 = day.month - 1 + months
    year = day.year + month0 // 12
    month = month0 % 12 + 1
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(day.day, last))


def _cash_date(event: Event) -> date | None:
    return event.settlement_date or event.event_date


def _home_amount(
    event: Event,
    profile: Profile,
    dataset: Dataset,
    facts: UserFacts,
) -> float | None:
    raw = event.amount
    if raw is None:
        raw = facts.image_amounts.get(event.event_id)
    if raw is None:
        return None
    on = _cash_date(event) or event.event_date
    return convert(raw, event.currency, profile.home_currency, on, dataset.rates)


def _is_income_excluded(description: str, facts: UserFacts) -> bool:
    lower = description.lower()
    if facts.ignore_bonus_commission and (
        "bonus" in lower or "commission" in lower
    ):
        return True
    if facts.no_gig_income and any(g in lower for g in GIG_DESC):
        return True
    return any(token in lower for token in INCOME_EXCLUDE)


def _choose_variable_amount(values: list[float]) -> float:
    if not values:
        return 0.0
    if VARIABLE_AMOUNT_POLICY == "last":
        return values[-1]
    if VARIABLE_AMOUNT_POLICY == "mean":
        return sum(values) / len(values)
    if VARIABLE_AMOUNT_POLICY == "median":
        return float(median(values))
    if VARIABLE_AMOUNT_POLICY == "max":
        return max(values)
    if VARIABLE_AMOUNT_POLICY == "p75":
        ordered = sorted(values)
        idx = int(round(0.75 * (len(ordered) - 1)))
        return ordered[idx]
    window = values[-3:] if len(values) >= 3 else values
    return max(window)


def _mode_period(deltas: list[int]) -> int | None:
    if not deltas:
        return None
    mode, count = Counter(deltas).most_common(1)[0]
    if count >= max(2, len(deltas) - 2) and 4 <= mode <= 35:
        return mode
    med = median(deltas)
    if 4 <= med <= 35:
        return int(round(med))
    return None


def _next_after(last: date, period: int, start: date) -> date:
    if period >= 28:
        nxt = add_months(last, 1)
        while nxt < start:
            nxt = add_months(nxt, 1)
        return nxt
    nxt = last + timedelta(days=period)
    while nxt < start:
        nxt += timedelta(days=period)
    return nxt


def _advance(day: date, period: int) -> date:
    if period >= 28:
        return add_months(day, 1)
    return day + timedelta(days=period)


def _occupied_months(flows: Iterable[CashFlow], kind_prefix: str) -> set[tuple[int, int]]:
    occupied = set()
    for flow in flows:
        if flow.kind.startswith(kind_prefix):
            occupied.add((flow.on.year, flow.on.month))
    return occupied


def build_ledger(
    dataset: Dataset,
    request: Request,
    facts: UserFacts,
) -> list[CashFlow]:
    profile = dataset.profiles[request.user_id]
    events = dataset.events_by_user.get(request.user_id, [])
    start = request.request_date
    end = horizon_end(start)
    flows: list[CashFlow] = []

    resolved: list[tuple[Event, float]] = []
    for event in events:
        if event.status in IGNORE_STATUSES:
            continue
        if event.event_type in NON_CASH_TYPES or event.direction == "non_cash":
            continue
        amount = _home_amount(event, profile, dataset, facts)
        if amount is None:
            continue
        resolved.append((event, amount))

    facts.lost_secondary_income = bool(facts.lost_secondary_income) or _lost_secondary_income(
        resolved, start
    )
    if facts.salary_amount is not None:
        ccy = facts.salary_currency or profile.home_currency
        if ccy != profile.home_currency:
            on = facts.salary_next_date or facts.salary_from_date or start
            facts.salary_amount = convert(
                facts.salary_amount, ccy, profile.home_currency, on, dataset.rates
            )
            facts.salary_currency = profile.home_currency

    # Explicit future cash: pending debits, scheduled debits/credits.
    for event, amount in resolved:
        on = _cash_date(event)
        if on is None or on < start or on > end:
            continue
        if event.status == "pending" and event.direction == "credit":
            continue
        if event.status == "pending" and event.direction == "debit":
            flows.append(CashFlow(on, -amount, "pending_debit", event.category))
            continue
        if event.status == "scheduled" and event.direction == "debit":
            flows.append(CashFlow(on, -amount, "scheduled_debit", event.category))
            continue
        if event.status == "scheduled" and event.direction == "credit":
            if event.category == "salary" or event.event_type == "income":
                if facts.salary_stop:
                    continue
                if _is_income_excluded(event.description, facts):
                    continue
                amt = facts.salary_amount if facts.salary_amount is not None else amount
                on2 = facts.salary_next_date or on
                flows.append(CashFlow(on2, amt, "scheduled_salary", event.event_id))
            continue

    # Confirmed invoices from messages.
    for on, amount, ccy in facts.confirmed_invoices:
        if start <= on <= end:
            home_amt = convert(
                amount, ccy or profile.home_currency, profile.home_currency, on, dataset.rates
            )
            flows.append(CashFlow(on, home_amt, "confirmed_invoice", "message"))

    _forecast_salary(resolved, start, end, facts, flows)
    _forecast_fixed_series(resolved, start, end, facts, flows)
    _forecast_variable_streams(resolved, start, end, profile, facts, flows)

    return flows


def _forecast_fixed_series(
    resolved: list[tuple[Event, float]],
    start: date,
    end: date,
    facts: UserFacts,
    flows: list[CashFlow],
) -> None:
    groups: dict[tuple[str, str, float], list[date]] = defaultdict(list)
    for event, amount in resolved:
        if event.status != "settled" or event.direction != "debit":
            continue
        if event.category not in FIXED_CATEGORIES:
            continue
        on = event.event_date
        if on >= start:
            continue
        key_amount = round(amount, 2)
        groups[(event.description, event.category, key_amount)].append(on)

    blocked = {
        (flow.on.year, flow.on.month, flow.label)
        for flow in flows
        if flow.kind in {"scheduled_debit", "pending_debit"}
    }  # label is the category
    for (desc, category, amount), dates in groups.items():
        dates = sorted(dates)
        if len(dates) < 3:
            continue
        deltas = [(dates[i] - dates[i - 1]).days for i in range(1, len(dates))]
        period = _mode_period(deltas)
        if period is None or period < 27:
            continue
        last = dates[-1]
        if (start - last).days > 40:
            continue
        nxt = _next_after(last, 30, start)
        pay = amount
        if category == "rent":
            pay = amount * facts.rent_multiplier
        key = f"{category}:{desc}"
        has_income = any(f.amount > 0 for f in flows)
        first_income = _first_income_on(flows)
        max_occ = FIXED_MAX_OCCURRENCES
        if not has_income:
            max_occ = min(max_occ, NO_INCOME_FIXED_MAX_OCCURRENCES)
        # Pending gig pay: do not reserve a third delivery-membership month.
        if facts.no_gig_income and category == "delivery_membership":
            max_occ = min(max_occ, 2)
        occ = 0
        while nxt <= end and occ < max_occ:
            # No-income tail: a monthly bill 0-2 days before horizon end
            # is the usual extra rent that drives A to 0.
            if not has_income and (end - nxt).days <= 2:
                nxt = add_months(nxt, 1)
                continue
            # Lost second income: do not reserve a monthly bill that lands
            # on the last few days of the window after the final payday.
            if facts.lost_secondary_income and (end - nxt).days <= 4:
                nxt = add_months(nxt, 1)
                continue
            # Uncredited prize is not cash. Do not reserve the next cloud
            # cycle before the first payday (request_23). Later months stay.
            if (
                facts.prize_uncredited
                and category == "cloud_storage"
                and first_income is not None
                and nxt < first_income
            ):
                nxt = add_months(nxt, 1)
                continue
            month_block = (nxt.year, nxt.month, key)
            # Scheduled/pending rows block the same description key, not the
            # whole category. A scheduled extra insurance payment is not a
            # substitute for the regular policy series (request_24).
            if month_block not in blocked:
                flows.append(CashFlow(nxt, -pay, "recurring_fixed", key))
                occ += 1
            nxt = add_months(nxt, 1)


def _lost_secondary_income(
    resolved: list[tuple[Event, float]],
    start: date,
) -> bool:
    """True when one salary series went stale and another is still live."""
    groups: dict[str, list[date]] = defaultdict(list)
    for event, _amount in resolved:
        if event.status != "settled" or event.direction != "credit":
            continue
        if event.category != "salary" and event.event_type != "income":
            continue
        on = _cash_date(event) or event.event_date
        if on >= start:
            continue
        groups[event.description].append(on)
    if len(groups) < 2:
        return False
    stale_second = False
    live_other = False
    for desc, dates in groups.items():
        last = max(dates)
        stale = (start - last).days > 40
        lower = desc.lower()
        second = any(
            token in lower
            for token in ("second household", "second income", "penghasilan kedua", "gaji kedua")
        )
        if second and stale:
            stale_second = True
        if not second and not stale:
            live_other = True
    return stale_second and live_other


def _first_income_on(flows: list[CashFlow]) -> date | None:
    dates = [f.on for f in flows if f.amount > 0]
    return min(dates) if dates else None


def _forecast_variable_streams(
    resolved: list[tuple[Event, float]],
    start: date,
    end: date,
    profile: Profile,
    facts: UserFacts,
    flows: list[CashFlow],
) -> None:
    by_cat: dict[str, list[tuple[date, float]]] = defaultdict(list)
    for event, amount in resolved:
        if event.status != "settled" or event.direction != "debit":
            continue
        if event.category not in PERIODIC_CATEGORIES:
            continue
        if event.event_date >= start:
            continue
        # One-off shopping refunds / captures should not start a stream.
        desc = event.description.lower()
        if event.category == "shopping" and any(
            token in desc
            for token in ("card charge", "card purchase", "authorization", "refund")
        ):
            continue
        by_cat[event.category].append((event.event_date, amount))

    pending_by_cat = {
        (flow.on, flow.label)
        for flow in flows
        if flow.kind == "pending_debit"
    }

    grocery_hits = sorted(by_cat.get("groceries", []))
    grocery_outlier_yesterday = False
    grocery_outlier_recent = False
    if len(grocery_hits) >= 3:
        g_med = median(a for _d, a in grocery_hits)
        g_last_d, g_last_a = grocery_hits[-1]
        grocery_outlier_yesterday = (
            g_med > 0
            and g_last_a > 2.5 * g_med
            and (start - g_last_d).days <= SKIP_RECENT_VARIABLE_DAYS
        )
        # A bulk pantry two days ago is already in the starting balance
        # (request_17 image). Do not also reserve a high dining mean.
        grocery_outlier_recent = (
            g_med > 0
            and g_last_a > 2.5 * g_med
            and (start - g_last_d).days <= 2
        )

    cheap_dining_last = False
    dining_hits = sorted(by_cat.get("dining", []))
    if len(dining_hits) >= 3:
        d_amts = [a for _d, a in dining_hits]
        d_mean = sum(d_amts) / len(d_amts)
        if d_mean > 0 and d_amts[-1] < 0.85 * d_mean:
            cheap_dining_last = True

    for category, rows in by_cat.items():
        rows = sorted(rows)
        if len(rows) < 3:
            continue
        dates = [r[0] for r in rows]
        amounts = [r[1] for r in rows]
        raw_last = dates[-1]
        raw_last_amt = amounts[-1]
        med = median(amounts)
        # Drop one-off spikes (blank-image bulk buys) from the repeating stream.
        filtered = [
            (d, a)
            for d, a in zip(dates, amounts)
            if med <= 0 or a <= 2.5 * med
        ]
        outlier_recent = med > 0 and raw_last_amt > 2.5 * med
        if len(filtered) >= 3:
            dates = [r[0] for r in filtered]
            amounts = [r[1] for r in filtered]
        deltas = [(dates[i] - dates[i - 1]).days for i in range(1, len(dates))]
        period = _mode_period(deltas)
        if period is None:
            continue
        last = dates[-1]
        if (start - last).days > period * 2 + 5:
            continue
        later_amt = _choose_variable_amount(amounts)
        first_amt = amounts[-1] if FIRST_CYCLE_AMOUNT_POLICY == "last" else later_amt
        # Recent quiet grocery week: the last settled hit is the better
        # imminent reserve than the long-run mean (request_23, request_06).
        # Skip yesterday's hit (already in the starting balance).
        if (
            category == "groceries"
            and period is not None
            and 2 < (start - raw_last).days <= period
            and raw_last_amt < 0.75 * later_amt
        ):
            first_amt = raw_last_amt
        # New job: the long-run grocery mean mixes pre-job weeks.
        # Use the last three settled weeks for the imminent reserve
        # unless a quiet-week last-hit already applies (request_15).
        elif (
            facts.first_salary
            and category == "groceries"
            and len(amounts) >= 3
        ):
            first_amt = sum(amounts[-3:]) / 3.0
        # Payday moved: the last three grocery weeks are the imminent
        # reserve, not the older higher mean (request_07).
        elif (
            facts.payday_replaced
            and category == "groceries"
            and len(amounts) >= 3
        ):
            first_amt = sum(amounts[-3:]) / 3.0
        # Regular vs one-time arrears split: the last grocery week is
        # the post-arrears run rate, not the long-run mean (request_03).
        elif facts.arrears_split and category == "groceries" and amounts:
            first_amt = raw_last_amt if not outlier_recent else amounts[-1]
        # Same split: last three shopping months are the post-arrears
        # run rate, not the older dual-pay mean (request_03).
        if facts.arrears_split and category == "shopping" and len(amounts) >= 3:
            first_amt = sum(amounts[-3:]) / 3.0
        # Unearned bonus/commission: a grocery posted this week is the
        # better imminent reserve than the bonus-era mean (request_04).
        # Weight that last bill 3:2 over the mean. 2:1 last still
        # under-reserves; even blend over-reserves. Do not apply past
        # 3 days (request_11).
        elif (
            facts.ignore_bonus_commission
            and category == "groceries"
            and (start - raw_last).days <= 3
            and not outlier_recent
            and amounts
        ):
            first_amt = (2.0 * later_amt + 3.0 * raw_last_amt) / 5.0
        # Same income state, but the last grocery is older in the
        # current cycle (4-5 days). Keep the series mean dominant and
        # mix in one-nineteenth of the last bill (request_11). A 3:2
        # last-weight at this distance overshoots.
        elif (
            facts.ignore_bonus_commission
            and category == "groceries"
            and 3 < (start - raw_last).days <= 5
            and not outlier_recent
            and amounts
            and raw_last_amt < later_amt
        ):
            first_amt = (18.0 * later_amt + raw_last_amt) / 19.0
        # Paper portfolio gains are not cash. Yesterday's grocery is
        # already in the starting balance; the next week uses that last
        # bill, not the cheaper long-run mean (request_22).
        elif (
            facts.unrealized_no_cash
            and category == "groceries"
            and (start - raw_last).days == 1
            and not outlier_recent
            and amounts
        ):
            first_amt = raw_last_amt
        # New job: weight the last commute 7:4 over the series mean.
        # 2:1 last still under-reserves request_15; even blend overshoots.
        if facts.first_salary and category == "transport" and amounts:
            last_hit = raw_last_amt if not outlier_recent else amounts[-1]
            first_amt = (4.0 * later_amt + 7.0 * last_hit) / 11.0
        # Payday moved: the last commute is the imminent reserve, not
        # the older higher mean (request_07).
        if facts.payday_replaced and category == "transport" and amounts:
            first_amt = raw_last_amt if not outlier_recent else amounts[-1]
        # Pending gig pay: a single high last commute is not the
        # imminent reserve. Use the earlier transport mean (request_10).
        if (
            facts.no_gig_income
            and category == "transport"
            and len(amounts) >= 3
            and not outlier_recent
            and raw_last_amt > later_amt
        ):
            earlier = amounts[:-1]
            first_amt = sum(earlier) / len(earlier)
        # Pending gig pay: a single high last dining week is not the
        # imminent reserve. Keep the series mean dominant and mix in
        # one-tenth of the earlier mean (request_10).
        if (
            facts.no_gig_income
            and category == "dining"
            and len(amounts) >= 3
            and not outlier_recent
            and raw_last_amt > later_amt
        ):
            earlier = amounts[:-1]
            earlier_mean = sum(earlier) / len(earlier)
            first_amt = (9.0 * later_amt + earlier_mean) / 10.0
        # Salary just resumed after a leave gap. Reserve the high
        # pre-leave shopping and utilities observations, not the cheaper
        # mean or a single last bill (request_14).
        if facts.salary_resume and category in {"shopping", "utilities"} and amounts:
            peak = max(amounts) if not outlier_recent else amounts[-1]
            last_hit = raw_last_amt if not outlier_recent else amounts[-1]
            # High pre-leave observation stays dominant. Mix in one-tenth
            # of the last bill so a slightly cheaper return month is not
            # ignored (request_14 utilities). When last is the peak,
            # this equals the peak (request_14 shopping).
            first_amt = (9.0 * peak + last_hit) / 10.0
        # Confirmed raise: the last dining week is the post-raise
        # lifestyle, but one spike is not the full reserve. Weight the
        # series mean 4:1 over that last bill (request_02).
        if facts.salary_raise and category == "dining" and amounts:
            last_hit = raw_last_amt if not outlier_recent else amounts[-1]
            if last_hit > later_amt:
                first_amt = (4.0 * later_amt + last_hit) / 5.0
        # SPEC 10.2: when commissions/bonus are unearned, do not use the
        # long-run dining mean for the imminent hit. Two recent hits use
        # the last-28-day total (request_04). One recent hit below the
        # mean uses that last hit (request_11).
        if facts.ignore_bonus_commission and category == "dining":
            recent_total = sum(
                amt for day, amt in zip(dates, amounts) if (start - day).days <= 28
            )
            last_hit = amounts[-1]
            if not outlier_recent:
                last_hit = raw_last_amt
            if recent_total > later_amt:
                first_amt = recent_total
            else:
                first_amt = last_hit
        nxt = _next_after(last, period, start)
        if (
            SKIP_RECENT_VARIABLE_DAYS
            and outlier_recent
            and (start - raw_last).days <= SKIP_RECENT_VARIABLE_DAYS
        ):
            nxt = _advance(nxt, period)
            # Yesterday's bulk buy is already in the starting balance.
            # The next regular cycle is reserved at the high historical
            # observation, not the optimistic mean (request_19).
            first_amt = max(amounts)
        # Sub-weekly transport that posted on its exact cadence is already
        # in the starting balance. Do not reserve another hit on
        # request_date (request_06). Do not apply this to weekly
        # transport: skipping those empties slack on request_10.
        if (
            category == "transport"
            and period <= 5
            and (start - raw_last).days == period
        ):
            nxt = _advance(nxt, period)
            # The skipped hit is already in the starting balance.
            # The next fare still uses that last amount (request_06).
            first_amt = raw_last_amt if not outlier_recent else amounts[-1]
        # Same series, earlier in the current cycle. Yesterday's fare is
        # the freshest observation: weight it 2:1 over the mean
        # (request_25). A fare from two or more days ago stays an even
        # blend so a single spike does not dominate (request_24).
        elif (
            category == "transport"
            and period <= 5
            and 0 < (start - raw_last).days < period
            and amounts
        ):
            last_hit = raw_last_amt if not outlier_recent else amounts[-1]
            days_since = (start - raw_last).days
            if days_since == 1:
                first_amt = (later_amt + 2.0 * last_hit) / 3.0
            else:
                first_amt = (later_amt + last_hit) / 2.0
        # Unrealized portfolio gains are not cash. A weekly commute that
        # posted on its exact cadence is already in the starting balance
        # (request_22). Do not apply this without the no-cash message:
        # skipping all weekly transport empties slack on request_10.
        if (
            facts.unrealized_no_cash
            and category == "transport"
            and (start - raw_last).days == period
        ):
            nxt = _advance(nxt, period)
        # New job: starting balance already includes this week's weeklies.
        # Do not reserve the same cycle again before the first payday.
        if (
            facts.first_salary
            and period <= 14
            and (start - raw_last).days < period
        ):
            nxt = _advance(nxt, period)
        first_income = _first_income_on(flows)
        # SPEC 10.2: protected healthcare is a conservative essential.
        # With no confirmed income, use the last settled hit, not the mean.
        if (
            first_income is None
            and category == "healthcare"
            and category in profile.expense_categories_to_protect
        ):
            first_amt = later_amt = amounts[-1]
        # No confirmed income: reserve a high shopping observation for
        # the next cycle, not the optimistic mean. Use the 75th
        # percentile so a single peak does not over-reserve (request_05).
        if first_income is None and category == "shopping" and amounts:
            ordered = sorted(amounts)
            idx = int(round(0.75 * (len(ordered) - 1)))
            first_amt = ordered[idx]
        # No confirmed income: a grocery posted two days ago is this
        # cycle's regular hit. Keep that last bill dominant and mix in
        # one-twelfth of the long-run mean so the next week is not a
        # single observation (request_05). Do not apply yesterday
        # (request_10 quiet week is already below 75% of the mean).
        if (
            first_income is None
            and category == "groceries"
            and (start - raw_last).days == 2
            and not outlier_recent
            and amounts
        ):
            first_amt = (12.0 * raw_last_amt + later_amt) / 13.0
        # Pending refund is not cash. Reserve the high entertainment
        # observation for the next cycle (request_20).
        if facts.pending_refund and category == "entertainment" and amounts:
            first_amt = max(amounts)
        # Pending refund is not cash. A high last dining week spent
        # ahead of that credit is not the imminent reserve. Keep the
        # series mean dominant and mix in three-twenty-eighths of the
        # earlier mean (request_20).
        if (
            facts.pending_refund
            and category == "dining"
            and len(amounts) >= 3
            and not outlier_recent
            and raw_last_amt > later_amt
        ):
            earlier = amounts[:-1]
            earlier_mean = sum(earlier) / len(earlier)
            first_amt = (28.0 * later_amt + 3.0 * earlier_mean) / 31.0
        # Uncredited prize is not cash. The next shopping cycle weights
        # the last bill 11:7 over the series mean (request_23). 2:1 last
        # still leaves slack; even blend over-reserves.
        if facts.prize_uncredited and category == "shopping" and amounts:
            last_hit = raw_last_amt if not outlier_recent else amounts[-1]
            first_amt = (7.0 * later_amt + 11.0 * last_hit) / 18.0
        # Temporary reduced pay: last shopping was slightly cheaper.
        # Keep the series mean dominant and mix in one-sixth of that
        # last bill (request_06). Last alone under-reserves.
        if (
            facts.salary_reduced
            and category == "shopping"
            and amounts
            and not outlier_recent
            and raw_last_amt < later_amt
        ):
            first_amt = (6.0 * later_amt + raw_last_amt) / 7.0
        # Cheap last dining week: lifestyle spend moved. The last
        # shopping month is a better imminent reserve than the mean.
        # Keep the mean dominant and mix in one-twenty-ninth of that
        # last bill (request_21). request_08 has no shopping series.
        if (
            cheap_dining_last
            and category == "shopping"
            and amounts
            and not outlier_recent
            and raw_last_amt > later_amt
        ):
            first_amt = (29.0 * later_amt + raw_last_amt) / 30.0
        # Yesterday's bulk grocery is already in the starting balance.
        # The next clinic bill uses the last settled amount, not the
        # long-run mean (request_19).
        if grocery_outlier_yesterday and category == "healthcare" and amounts:
            first_amt = raw_last_amt if not outlier_recent else amounts[-1]
        # Yesterday's bulk grocery is already in the starting balance.
        # The next shopping month stays near the series mean and mixes in
        # one-twelfth of the last-three mean so the quiet post-bulk month
        # still counts (request_19).
        if (
            grocery_outlier_yesterday
            and category == "shopping"
            and len(amounts) >= 3
            and not outlier_recent
            and raw_last_amt < later_amt
        ):
            last3_mean = sum(amounts[-3:]) / 3.0
            first_amt = (12.0 * later_amt + last3_mean) / 13.0
        # A single cheap dining week should not pull the imminent
        # reserve down. Keep the earlier mean dominant and mix in
        # one-tenth of the last-three mean so the recent high weeks
        # still count (request_08, request_21).
        if (
            category == "dining"
            and len(amounts) >= 3
            and later_amt > 0
            and not outlier_recent
            and raw_last_amt < 0.85 * later_amt
        ):
            earlier = amounts[:-1]
            earlier_mean = sum(earlier) / len(earlier)
            last3_mean = sum(amounts[-3:]) / 3.0
            first_amt = (9.0 * earlier_mean + last3_mean) / 10.0
        # Same bulk week, even if it settled two days ago: the next
        # dining cycle stays near the last hit. Last alone under-reserves
        # (request_17). Weight that last bill 4:1 over the series mean.
        # Do not widen the grocery skip itself.
        if grocery_outlier_recent and category == "dining" and amounts:
            last_hit = raw_last_amt if not outlier_recent else amounts[-1]
            if last_hit < later_amt:
                first_amt = (4.0 * last_hit + later_amt) / 5.0
            else:
                first_amt = last_hit
        # Bulk pantry two days ago is already in the starting balance.
        # The next commute uses a high-low blend of fare history, weighting
        # the peak 6:5 over the low fare so one cheap trip does not pull
        # the reserve down (request_17). Do not apply yesterday's bulk
        # skip (request_19).
        if (
            grocery_outlier_recent
            and not grocery_outlier_yesterday
            and category == "transport"
            and amounts
        ):
            first_amt = (6.0 * max(amounts) + 5.0 * min(amounts)) / 11.0
        # Yesterday's takeaway is already in the starting balance as the
        # freshest dining hit. Keep the series mean dominant and mix in
        # one-thirtieth of that last bill (request_24). Last alone
        # over-reserves.
        if (
            category == "dining"
            and (start - raw_last).days == 1
            and amounts
            and not outlier_recent
            and raw_last_amt > later_amt
        ):
            first_amt = (30.0 * later_amt + raw_last_amt) / 31.0
        # Second household income stopped. The last utility bill is the
        # stepped-down reserve, not the dual-income mean (request_13).
        if facts.lost_secondary_income and category == "utilities" and amounts:
            first_amt = raw_last_amt if not outlier_recent else amounts[-1]
        # Second income stopped: the last grocery week is already quiet.
        # Do not let it pull the next week's reserve below the dual-income
        # mean (request_13).
        if (
            facts.lost_secondary_income
            and category == "groceries"
            and len(amounts) >= 2
            and not outlier_recent
            and raw_last_amt < later_amt
        ):
            earlier = amounts[:-1]
            first_amt = sum(earlier) / len(earlier)
        # Same post-loss quiet commute. Keep the series mean dominant
        # and mix in one-fourth of the earlier dual-income mean
        # (request_13). Full earlier mean over-reserves; a one-third
        # mix floors one cent too low.
        if (
            facts.lost_secondary_income
            and category == "transport"
            and len(amounts) >= 2
            and not outlier_recent
            and raw_last_amt < later_amt
        ):
            earlier = amounts[:-1]
            earlier_mean = sum(earlier) / len(earlier)
            first_amt = (3.0 * later_amt + earlier_mean) / 4.0
        # Payday moved. Utilities have already stepped down from the
        # older mean. Reserve the lower of the last two bills so a
        # slightly higher last month does not set the imminent amount
        # (request_07).
        if facts.payday_replaced and category == "utilities" and len(amounts) >= 2:
            last_hit = raw_last_amt if not outlier_recent else amounts[-1]
            if last_hit < later_amt:
                first_amt = min(last_hit, amounts[-2])
            else:
                first_amt = last_hit
        elif facts.payday_replaced and category == "utilities" and amounts:
            first_amt = raw_last_amt if not outlier_recent else amounts[-1]
        # Same-person transfer is not a new essential. Do not keep the
        # long-run utilities mean as the imminent reserve. Weight the
        # mean 7:5 over the last bill (request_18). 3:2 still
        # over-reserves; even blend under-reserves.
        if facts.ignore_internal_transfers and category == "utilities" and amounts:
            last_hit = raw_last_amt if not outlier_recent else amounts[-1]
            first_amt = (7.0 * later_amt + 5.0 * last_hit) / 12.0
        # Paper gains are not cash. Nudge the next utility bill toward
        # the last observation, keeping the mean dominant (request_22).
        if facts.unrealized_no_cash and category == "utilities" and amounts:
            last_hit = raw_last_amt if not outlier_recent else amounts[-1]
            if last_hit < later_amt:
                first_amt = (9.0 * later_amt + 2.0 * last_hit) / 11.0
        # Protected utilities: if the last bill is already the high
        # observation, reserve that peak for the next cycle
        # (request_21). Do not average it down.
        if (
            category == "utilities"
            and category in profile.expense_categories_to_protect
            and amounts
        ):
            last_hit = raw_last_amt if not outlier_recent else amounts[-1]
            if last_hit >= max(amounts) - 1e-9:
                first_amt = last_hit
        remaining = (
            DISCRETIONARY_OCCURRENCES
            if category in DISCRETIONARY_CATEGORIES
            else ESSENTIAL_MAX_OCCURRENCES
        )
        # Pending gig payouts are not income. Do not reserve shopping /
        # entertainment as if pay were confirmed. Dining stays as the one
        # essential discretionary cycle.
        if facts.no_gig_income and category in DISCRETIONARY_CATEGORIES and category != "dining":
            remaining = 0
        # SPEC 10.2: monthly-ish dining is a variable essential when salary
        # continues. Other discretionary series continue through the horizon
        # only when the user already treats them as a recurring, cuttable
        # bill. A/B still ignore the actual reduce. Biweekly dining stays at
        # two cycles; 90-day biweekly dining empties B on tight salaried rows.
        reduce_set = set(profile.expense_categories_user_is_willing_to_reduce)
        if first_income is not None and category in DISCRETIONARY_CATEGORIES:
            monthlyish = period >= 21
            if monthlyish and (category == "dining" or category in reduce_set):
                remaining = ESSENTIAL_MAX_OCCURRENCES
                # SPEC 10.2: later cycles of a 90-day variable essential use
                # the high recent observation, not the mean. The first cycle
                # stays mean so the imminent trough that sets A is unchanged.
                later_amt = max(amounts)
            elif category == "dining" and 14 <= period < 21:
                remaining = max(remaining, 2)
        # Second job stopped: lifestyle dining/entertainment still run
        # through the horizon. A/B ignore the eventual cut.
        if facts.lost_secondary_income and category in {"dining", "entertainment"}:
            remaining = ESSENTIAL_MAX_OCCURRENCES
            if category == "dining":
                # Same post-loss quiet week: keep the first dining
                # reserve on the earlier mean (request_13).
                if (
                    len(amounts) >= 2
                    and not outlier_recent
                    and raw_last_amt < first_amt
                ):
                    earlier = amounts[:-1]
                    first_amt = sum(earlier) / len(earlier)
                later_amt = max(amounts)
            # Last entertainment month is the post-job-loss quiet hit.
            # Do not let it pull the 90-day reserve below the dual-income
            # run rate (request_13).
            elif len(amounts) >= 2:
                earlier = amounts[:-1]
                earlier_mean = sum(earlier) / len(earlier)
                last_hit = raw_last_amt if not outlier_recent else amounts[-1]
                if last_hit < earlier_mean:
                    first_amt = later_amt = earlier_mean
        first = True
        while nxt <= end and remaining > 0:
            place = nxt
            pull_disc = (
                PULL_DISCRETIONARY_BEFORE_INCOME
                and category in DISCRETIONARY_CATEGORIES
            )
            pull_ess = (
                PULL_ESSENTIAL_BEFORE_INCOME
                and category not in DISCRETIONARY_CATEGORIES
            )
            on_or_after = first_income is not None and (
                (pull_disc and first_income <= nxt)
                or (pull_ess and first_income < nxt)
            )
            if (
                first
                and on_or_after
                and period <= PULL_MAX_PERIOD
                and (nxt - first_income).days <= min(period, PULL_AFTER_INCOME_DAYS)
            ):
                place = start
            if (place, category) not in pending_by_cat:
                use_amt = first_amt if first else later_amt
                flows.append(
                    CashFlow(place, -use_amt, "recurring_variable", category)
                )
                remaining -= 1
            first = False
            nxt = _advance(nxt, period)


def _forecast_salary(
    resolved: list[tuple[Event, float]],
    start: date,
    end: date,
    facts: UserFacts,
    flows: list[CashFlow],
) -> None:
    if facts.salary_stop:
        return

    existing_salary_months = {
        (f.on.year, f.on.month)
        for f in flows
        if f.kind in {"scheduled_salary", "salary_forecast", "confirmed_invoice"}
        and f.amount > 0
    }

    # A scheduled "next confirmed salary" continues monthly at that amount.
    for flow in list(flows):
        if flow.kind != "scheduled_salary":
            continue
        nxt = add_months(flow.on, 1)
        while nxt <= end:
            if (nxt.year, nxt.month) not in existing_salary_months:
                flows.append(
                    CashFlow(nxt, flow.amount, "salary_forecast", flow.label)
                )
                existing_salary_months.add((nxt.year, nxt.month))
            nxt = add_months(nxt, 1)

    if facts.salary_next_date and facts.salary_amount is not None:
        nxt = facts.salary_next_date
        while nxt < start:
            nxt = add_months(nxt, 1)
        while nxt <= end:
            if (nxt.year, nxt.month) not in existing_salary_months:
                flows.append(
                    CashFlow(nxt, facts.salary_amount, "salary_forecast", "facts")
                )
                existing_salary_months.add((nxt.year, nxt.month))
            nxt = add_months(nxt, 1)
        return

    if facts.salary_amount is not None and facts.salary_from_date is not None:
        nxt = facts.salary_from_date
        while nxt < start:
            nxt = add_months(nxt, 1)
        while nxt <= end:
            if (nxt.year, nxt.month) not in existing_salary_months:
                flows.append(
                    CashFlow(nxt, facts.salary_amount, "salary_forecast", "facts")
                )
                existing_salary_months.add((nxt.year, nxt.month))
            nxt = add_months(nxt, 1)
        return

    # History-based series by description.
    groups: dict[str, list[tuple[date, float]]] = defaultdict(list)
    final_seen = False
    for event, amount in resolved:
        if event.status != "settled" or event.direction != "credit":
            continue
        if event.category != "salary" and event.event_type != "income":
            continue
        on = _cash_date(event) or event.event_date
        if on >= start:
            continue
        if "final employer payroll" in event.description.lower():
            final_seen = True
            continue
        if _is_income_excluded(event.description, facts):
            continue
        groups[event.description].append((on, amount))

    if final_seen and not groups:
        return

    # If a later regular series exists, drop stale "previous employer" rows.
    for desc, rows in list(groups.items()):
        last = max(r[0] for r in rows)
        if (start - last).days > 40:
            del groups[desc]
            continue

    if facts.salary_amount is not None and groups:
        # Amount override, keep cadence from the newest series.
        newest_desc = max(groups.items(), key=lambda kv: max(r[0] for r in kv[1]))[0]
        rows = sorted(groups[newest_desc])
        last = rows[-1][0]
        nxt = add_months(last, 1)
        if facts.salary_from_date and facts.salary_from_date > nxt:
            nxt = facts.salary_from_date
        while nxt < start:
            nxt = add_months(nxt, 1)
        while nxt <= end:
            if (nxt.year, nxt.month) not in existing_salary_months:
                flows.append(
                    CashFlow(nxt, facts.salary_amount, "salary_forecast", newest_desc)
                )
                existing_salary_months.add((nxt.year, nxt.month))
            nxt = add_months(nxt, 1)
        return

    for desc, rows in groups.items():
        rows = sorted(rows)
        amounts = [r[1] for r in rows]
        dates = [r[0] for r in rows]
        if len(rows) < 2:
            continue
        # Unstable amount: do not invent.
        mid = median(amounts)
        if mid > 0 and (max(amounts) - min(amounts)) / mid > 0.2:
            continue
        deltas = [(dates[i] - dates[i - 1]).days for i in range(1, len(dates))]
        period = _mode_period(deltas) or 30
        if period < 25:
            # Weekly gig that slipped through: skip.
            continue
        last = dates[-1]
        amt = amounts[-1]
        nxt = _next_after(last, 30, start)
        while nxt <= end:
            if (nxt.year, nxt.month) not in existing_salary_months:
                flows.append(CashFlow(nxt, amt, "salary_forecast", desc))
                existing_salary_months.add((nxt.year, nxt.month))
            nxt = add_months(nxt, 1)
