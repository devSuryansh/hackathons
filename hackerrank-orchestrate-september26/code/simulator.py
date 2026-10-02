from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from models import CashFlow

HORIZON_DAYS = 90


def horizon_end(request_date: date) -> date:
    return request_date + timedelta(days=HORIZON_DAYS)


def min_balance(
    start_balance: float,
    request_date: date,
    flows: list[CashFlow],
    extra_debits: list[tuple[date, float]] | None = None,
    until: date | None = None,
) -> float:
    """Walk each day. Apply debits first, then credits. Return the lowest balance."""
    end = until if until is not None else horizon_end(request_date)
    if end < request_date:
        end = request_date
    debits: dict[date, float] = defaultdict(float)
    credits: dict[date, float] = defaultdict(float)
    for flow in flows:
        if flow.on < request_date or flow.on > end:
            continue
        if flow.amount >= 0:
            credits[flow.on] += flow.amount
        else:
            debits[flow.on] += -flow.amount
    for on, amount in extra_debits or []:
        if request_date <= on <= end and amount > 0:
            debits[on] += amount

    balance = start_balance
    lowest = start_balance
    day = request_date
    while day <= end:
        # End-of-day check: same-day salary can fund same-day bills and payments.
        balance -= debits[day]
        balance += credits[day]
        if balance < lowest:
            lowest = balance
        day += timedelta(days=1)
    return lowest


def stays_above_minimum(
    start_balance: float,
    minimum: float,
    request_date: date,
    flows: list[CashFlow],
    extra_debits: list[tuple[date, float]] | None = None,
    until: date | None = None,
) -> bool:
    return (
        min_balance(
            start_balance, request_date, flows, extra_debits, until=until
        )
        + 1e-9
        >= minimum
    )
