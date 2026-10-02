from __future__ import annotations

from amount_safe import amount_safe_to_pay as compute_safe
from earliest import earliest_date_for_full_payment as compute_earliest
from facts import extract_facts
from ledger import build_ledger
from load import Dataset
from models import CashFlow, OutputRow, Request
from plan import choose_plan


def solve_cash(dataset: Dataset, request: Request) -> tuple[float, str, list[CashFlow]]:
    messages = dataset.messages_by_user.get(request.user_id, [])
    images = [
        image
        for image in dataset.images
        if image.user_id == request.user_id
    ]
    facts = extract_facts(messages, images)
    flows = build_ledger(dataset, request, facts)
    profile = dataset.profiles[request.user_id]
    safe = compute_safe(
        profile.current_available_balance,
        profile.minimum_balance_to_keep,
        request.request_date,
        request.requested_amount,
        flows,
    )
    earliest = compute_earliest(
        profile.current_available_balance,
        profile.minimum_balance_to_keep,
        request.request_date,
        request.requested_amount,
        flows,
    )
    return safe, earliest, flows


def solve_request(dataset: Dataset, request: Request) -> OutputRow:
    safe, earliest, flows = solve_cash(dataset, request)
    profile = dataset.profiles[request.user_id]
    events = dataset.events_by_user.get(request.user_id, [])
    options = dataset.options_by_request.get(request.request_id, [])
    status, method, plan, changes, explanation = choose_plan(
        request, profile, events, options, flows, safe, earliest
    )
    return OutputRow(
        request_id=request.request_id,
        amount_safe_to_pay=safe,
        affordability_status=status,
        recommended_payment_method=method,
        payment_plan=plan,
        earliest_date_for_full_payment=earliest,
        spending_changes_needed=changes,
        decision_explanation=explanation,
    )
