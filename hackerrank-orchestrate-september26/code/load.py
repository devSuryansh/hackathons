from __future__ import annotations

import csv
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from models import (
    Event,
    ImageRow,
    Message,
    PaymentOption,
    Profile,
    Request,
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def dataset_dir() -> Path:
    return repo_root() / "dataset"


def _split_pipe(value: str) -> list[str]:
    value = (value or "").strip()
    if not value:
        return []
    return [part.strip() for part in value.split("|") if part.strip()]


def _parse_date(value: str) -> Optional[date]:
    value = (value or "").strip()
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


def _parse_float(value: str) -> Optional[float]:
    value = (value or "").strip()
    if value == "":
        return None
    return float(value)


def _parse_bool(value: str) -> bool:
    return (value or "").strip().lower() == "true"


class Dataset:
    def __init__(self, root: Optional[Path] = None) -> None:
        self.root = root or dataset_dir()
        self.profiles: dict[str, Profile] = {}
        self.events_by_user: dict[str, list[Event]] = {}
        self.requests: list[Request] = []
        self.sample_requests: list[Request] = []
        self.sample_gold: dict[str, dict] = {}
        self.options_by_request: dict[str, list[PaymentOption]] = {}
        self.messages_by_user: dict[str, list[Message]] = {}
        self.images: list[ImageRow] = []
        self.rates: list[tuple[date, str, str, float]] = []
        self._load()

    def _load(self) -> None:
        for row in self._rows("financial_profiles.csv"):
            max_inst = (row["max_installment_months"] or "").strip()
            profile = Profile(
                user_id=row["user_id"],
                home_currency=row["home_currency"],
                current_available_balance=float(row["current_available_balance"]),
                minimum_balance_to_keep=float(row["minimum_balance_to_keep"]),
                financial_priorities=_split_pipe(row["financial_priorities"]),
                expense_categories_to_protect=_split_pipe(
                    row["expense_categories_to_protect"]
                ),
                expense_categories_user_is_willing_to_reduce=_split_pipe(
                    row["expense_categories_user_is_willing_to_reduce"]
                ),
                expense_categories_user_is_willing_to_stop=_split_pipe(
                    row["expense_categories_user_is_willing_to_stop"]
                ),
                payment_methods_user_will_consider=_split_pipe(
                    row["payment_methods_user_will_consider"]
                ),
                max_installment_months=int(max_inst) if max_inst else None,
            )
            self.profiles[profile.user_id] = profile

        events_by_user: dict[str, list[Event]] = {}
        for row in self._rows("financial_events.csv"):
            event = Event(
                event_id=row["event_id"],
                user_id=row["user_id"],
                event_type=row["event_type"],
                description=row["description"],
                category=row["category"],
                direction=row["direction"],
                amount=_parse_float(row["amount"]),
                currency=row["currency"],
                event_date=_parse_date(row["event_date"]),
                settlement_date=_parse_date(row["settlement_date"]),
                status=row["status"],
                linked_event_id=(row["linked_event_id"] or "").strip(),
                flexibility=row["flexibility"],
                minimum_allowed_amount=_parse_float(row["minimum_allowed_amount"]),
            )
            events_by_user.setdefault(event.user_id, []).append(event)
        self.events_by_user = events_by_user

        self.requests = [self._request(row) for row in self._rows("requests.csv")]

        self.sample_requests = []
        self.sample_gold = {}
        for row in self._rows("sample_requests.csv"):
            req = self._request(row)
            self.sample_requests.append(req)
            self.sample_gold[req.request_id] = row

        options: dict[str, list[PaymentOption]] = {}
        for row in self._rows("request_payment_options.csv"):
            freq = (row["payment_frequency_days"] or "").strip()
            option = PaymentOption(
                payment_option_id=row["payment_option_id"],
                request_id=row["request_id"],
                payment_method=row["payment_method"],
                payment_amount=float(row["payment_amount"]),
                number_of_payments=int(row["number_of_payments"]),
                first_payment_date=_parse_date(row["first_payment_date"]),
                payment_frequency_days=int(freq) if freq else None,
                financing_fee=float(row["financing_fee"] or 0),
                total_payable_amount=float(row["total_payable_amount"]),
            )
            options.setdefault(option.request_id, []).append(option)
        self.options_by_request = options

        messages: dict[str, list[Message]] = {}
        for row in self._rows("messages.csv"):
            message = Message(
                message_id=row["message_id"],
                user_id=row["user_id"],
                request_id=(row["request_id"] or "").strip(),
                related_event_id=(row["related_event_id"] or "").strip(),
                sent_at=row["sent_at"],
                source_type=row["source_type"],
                message_text=row["message_text"],
            )
            messages.setdefault(message.user_id, []).append(message)
        self.messages_by_user = messages

        self.images = [
            ImageRow(
                image_id=row["image_id"],
                user_id=row["user_id"],
                request_id=(row["request_id"] or "").strip(),
                related_event_id=(row["related_event_id"] or "").strip(),
            )
            for row in self._rows("images.csv")
        ]

        rates = []
        for row in self._rows("exchange_rates.csv"):
            rates.append(
                (
                    _parse_date(row["rate_date"]),
                    row["from_currency"],
                    row["to_currency"],
                    float(row["rate"]),
                )
            )
        self.rates = rates

    def _rows(self, name: str) -> list[dict]:
        path = self.root / name
        with path.open(newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))

    def _request(self, row: dict) -> Request:
        return Request(
            request_id=row["request_id"],
            user_id=row["user_id"],
            request_date=_parse_date(row["request_date"]),
            request_type=row["request_type"],
            requested_amount=float(row["requested_amount"]),
            desired_completion_date=_parse_date(row["desired_completion_date"]),
            allows_partial_payment=_parse_bool(row["allows_partial_payment"]),
            request_text=row.get("request_text", ""),
        )


def convert(
    amount: float,
    currency: str,
    home: str,
    on: date,
    rates: list[tuple[date, str, str, float]],
) -> float:
    if currency == home:
        return amount
    exact = [r for r in rates if r[0] == on and r[1] == currency and r[2] == home]
    if exact:
        return amount * exact[0][3]
    prior = [
        r
        for r in rates
        if r[0] <= on and r[1] == currency and r[2] == home
    ]
    if prior:
        prior.sort(key=lambda r: r[0])
        return amount * prior[-1][3]
    later = [
        r
        for r in rates
        if r[0] > on and r[1] == currency and r[2] == home
    ]
    if later:
        later.sort(key=lambda r: r[0])
        return amount * later[0][3]
    raise ValueError(f"No FX rate for {currency}->{home} on {on}")
