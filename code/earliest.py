from __future__ import annotations

from datetime import timedelta

from models import CashFlow
from simulator import HORIZON_DAYS, stays_above_minimum


def earliest_date_for_full_payment(
    start_balance: float,
    minimum: float,
    request_date,
    requested_amount: float,
    flows: list[CashFlow],
) -> str:
    if requested_amount <= 0:
        return request_date.isoformat()
    for offset in range(HORIZON_DAYS + 1):
        day = request_date + timedelta(days=offset)
        if stays_above_minimum(
            start_balance,
            minimum,
            request_date,
            flows,
            extra_debits=[(day, requested_amount)],
        ):
            return day.isoformat()
    return ""
