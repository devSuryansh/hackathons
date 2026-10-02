from __future__ import annotations

import re
from datetime import datetime

from models import OutputRow, Request

PLAN_PART = re.compile(r"^\d{4}-\d{2}-\d{2}:-?\d+(?:\.\d+)?$")
CHANGE_STOP = re.compile(r"^stop:event_\d+$")
CHANGE_REDUCE = re.compile(r"^reduce_to:event_\d+:\d+(?:\.\d+)?$")

STATUSES = {
    "affordable_now",
    "affordable_with_plan",
    "affordable_later",
    "not_affordable",
}
METHODS = {
    "full_payment",
    "partial_payment",
    "installments",
    "wait",
    "not_recommended",
}


class ValidationError(Exception):
    pass


def _parse_plan(plan: str) -> list[tuple[str, float]]:
    if plan in ("", "none"):
        return []
    parts = plan.split("|")
    parsed = []
    for part in parts:
        if not PLAN_PART.match(part):
            raise ValidationError(f"bad payment_plan part: {part}")
        day, amount = part.split(":", 1)
        parsed.append((day, float(amount)))
    dates = [p[0] for p in parsed]
    if dates != sorted(dates):
        raise ValidationError("payment_plan is not chronological")
    return parsed


def validate_row(request: Request, row: OutputRow, stub_ok: bool = True) -> list[str]:
    """Return a list of invariant failures. Empty means the row passes."""
    errors: list[str] = []
    requested = request.requested_amount
    safe = row.amount_safe_to_pay
    if safe < -1e-9 or safe - requested > 1e-6:
        errors.append(
            f"amount_safe_to_pay {safe} outside [0, {requested}]"
        )

    if row.earliest_date_for_full_payment:
        try:
            datetime.strptime(row.earliest_date_for_full_payment, "%Y-%m-%d")
        except ValueError:
            errors.append(
                f"bad earliest_date_for_full_payment {row.earliest_date_for_full_payment}"
            )

    if stub_ok and row.affordability_status in ("", "stub"):
        return errors

    if row.affordability_status not in STATUSES:
        errors.append(f"bad status {row.affordability_status}")
    if row.recommended_payment_method not in METHODS:
        errors.append(f"bad method {row.recommended_payment_method}")

    try:
        plan = _parse_plan(row.payment_plan)
    except ValidationError as exc:
        errors.append(str(exc))
        plan = []

    if row.affordability_status == "affordable_now":
        if row.recommended_payment_method != "full_payment":
            errors.append("affordable_now requires full_payment")
        if row.earliest_date_for_full_payment != request.request_date.isoformat():
            errors.append("affordable_now requires earliest == request_date")
        if row.spending_changes_needed != "none":
            errors.append("affordable_now requires spending_changes none")

    if row.affordability_status == "affordable_later":
        if row.recommended_payment_method != "wait":
            errors.append("affordable_later requires wait")
        if not row.earliest_date_for_full_payment:
            errors.append("affordable_later requires earliest_date")
        elif row.earliest_date_for_full_payment > request.desired_completion_date.isoformat():
            errors.append("wait earliest_date after deadline")

    if row.affordability_status == "not_affordable":
        if row.recommended_payment_method != "not_recommended":
            errors.append("not_affordable requires not_recommended")
        if row.payment_plan not in ("none", ""):
            errors.append("not_affordable requires payment_plan none")
        if row.spending_changes_needed != "none":
            errors.append("not_affordable requires spending_changes none")

    if row.recommended_payment_method == "partial_payment":
        if row.affordability_status != "affordable_with_plan":
            errors.append("partial_payment requires affordable_with_plan")
        if not request.allows_partial_payment:
            errors.append("partial_payment not allowed by request")
        if not (0 < safe < requested):
            errors.append("partial_payment requires 0 < amount_safe < requested")
        if len(plan) != 2:
            errors.append("partial_payment requires exactly two plan entries")
        elif abs(plan[0][1] + plan[1][1] - requested) > 0.02:
            errors.append("partial_payment amounts must sum to requested")

    if row.spending_changes_needed not in ("", "none"):
        if not row.earliest_date_for_full_payment:
            errors.append("spending changes when earliest_date is empty")
        elif (
            row.earliest_date_for_full_payment
            <= request.desired_completion_date.isoformat()
        ):
            errors.append("spending changes when earliest_date is on or before deadline")
        parts = row.spending_changes_needed.split("|")
        if len(parts) > 3:
            errors.append("more than 3 spending changes")
        seen = set()
        for part in parts:
            if CHANGE_STOP.match(part):
                eid = part.split(":", 1)[1]
            elif CHANGE_REDUCE.match(part):
                eid = part.split(":")[1]
            else:
                errors.append(f"bad spending change {part}")
                continue
            if eid in seen:
                errors.append(f"stop and reduce on same event {eid}")
            seen.add(eid)

    return errors
