from __future__ import annotations

import math

from models import CashFlow
from simulator import stays_above_minimum


def floor_money(value: float) -> float:
    if value <= 0:
        return 0.0
    return math.floor(value * 100 + 1e-9) / 100.0


def format_money(value: float) -> str:
    quantized = round(value + 1e-9, 2)
    if abs(quantized - round(quantized)) < 1e-9:
        return str(int(round(quantized)))
    return f"{quantized:.2f}".rstrip("0").rstrip(".")


def amount_safe_to_pay(
    start_balance: float,
    minimum: float,
    request_date,
    requested_amount: float,
    flows: list[CashFlow],
) -> float:
    if requested_amount <= 0:
        return 0.0
    if stays_above_minimum(
        start_balance,
        minimum,
        request_date,
        flows,
        extra_debits=[(request_date, requested_amount)],
    ):
        return requested_amount

    low = 0.0
    high = requested_amount
    for _ in range(64):
        mid = (low + high) / 2.0
        if stays_above_minimum(
            start_balance,
            minimum,
            request_date,
            flows,
            extra_debits=[(request_date, mid)],
        ):
            low = mid
        else:
            high = mid

    candidate = floor_money(low)
    if candidate > 0 and stays_above_minimum(
        start_balance,
        minimum,
        request_date,
        flows,
        extra_debits=[(request_date, candidate)],
    ):
        return min(requested_amount, candidate)
    return 0.0
