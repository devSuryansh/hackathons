from __future__ import annotations

from amount_safe import format_money
from models import OutputRow, Request
from solver import solve_request
from validator import validate_row

# Rounding rule (applied everywhere we compare amount_safe_to_pay):
# binary search is floored to cents; treat as a hit if |got - gold| < 0.015.
# Gold keeps native precision (17229139.2, 603.3, 243849.58); we do not
# force two decimals on the emitted value.
AMOUNT_TOL = 0.015

OUTPUT_FIELDS = (
    "amount_safe_to_pay",
    "affordability_status",
    "recommended_payment_method",
    "payment_plan",
    "earliest_date_for_full_payment",
    "spending_changes_needed",
    "decision_explanation",
)


def _fmt(value: float) -> str:
    return format_money(value)


def amounts_close(got: float, expected: float) -> bool:
    return abs(got - expected) < AMOUNT_TOL


def _field_ok(name: str, got: OutputRow, gold: dict) -> bool:
    if name == "amount_safe_to_pay":
        return amounts_close(got.amount_safe_to_pay, float(gold["amount_safe_to_pay"]))
    if name == "earliest_date_for_full_payment":
        return (got.earliest_date_for_full_payment or "").strip() == (
            gold.get("earliest_date_for_full_payment") or ""
        ).strip()
    got_val = (getattr(got, name) or "").strip()
    exp_val = (gold.get(name) or "").strip()
    return got_val == exp_val


def _field_got(name: str, got: OutputRow):
    if name == "amount_safe_to_pay":
        return got.amount_safe_to_pay
    return getattr(got, name)


def _field_exp(name: str, gold: dict):
    if name == "amount_safe_to_pay":
        return float(gold["amount_safe_to_pay"])
    return (gold.get(name) or "").strip()


def evaluate_samples(dataset) -> dict:
    hits = {name: 0 for name in OUTPUT_FIELDS}
    misses: list[dict] = []
    rows: list[OutputRow] = []
    perfect = 0
    for request in dataset.sample_requests:
        gold = dataset.sample_gold[request.request_id]
        got = solve_request(dataset, request)
        rows.append(got)
        errors = validate_row(request, got, stub_ok=True)
        field_misses = []
        all_ok = True
        for name in OUTPUT_FIELDS:
            ok = _field_ok(name, got, gold)
            if ok:
                hits[name] += 1
            else:
                all_ok = False
                field_misses.append(
                    {
                        "field": name,
                        "expected": _field_exp(name, gold),
                        "got": _field_got(name, got),
                    }
                )
        if all_ok and not errors:
            perfect += 1
        if field_misses or errors:
            misses.append(
                {
                    "request_id": request.request_id,
                    "fields": field_misses,
                    "validator": errors,
                    "safe_ok": _field_ok("amount_safe_to_pay", got, gold),
                    "earliest_ok": _field_ok(
                        "earliest_date_for_full_payment", got, gold
                    ),
                }
            )
    return {
        "n": len(dataset.sample_requests),
        "hits": hits,
        "perfect": perfect,
        "safe_hits": hits["amount_safe_to_pay"],
        "earliest_hits": hits["earliest_date_for_full_payment"],
        "misses": misses,
        "rows": rows,
    }


def print_report(result: dict) -> None:
    n = result["n"]
    print(f"perfect rows (all 8 columns): {result['perfect']}/{n}")
    print("hits per field:")
    for name in OUTPUT_FIELDS:
        print(f"  {name}: {result['hits'][name]}/{n}")
    print(
        f"amount_safe_to_pay exact/near (|d|<{AMOUNT_TOL}): "
        f"{result['safe_hits']}/{n}"
    )
    print(
        f"earliest_date_for_full_payment exact: "
        f"{result['earliest_hits']}/{n}"
    )
    if not result["misses"]:
        print("miss list: (none)")
        return
    print("miss list:")
    for miss in result["misses"]:
        print(f" - {miss['request_id']}")
        for item in miss["fields"]:
            print(
                f"     {item['field']}: expected={item['expected']!r} "
                f"got={item['got']!r}"
            )
        if miss["validator"]:
            print(f"     validator={miss['validator']}")
