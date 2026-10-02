from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class Profile:
    user_id: str
    home_currency: str
    current_available_balance: float
    minimum_balance_to_keep: float
    financial_priorities: list[str]
    expense_categories_to_protect: list[str]
    expense_categories_user_is_willing_to_reduce: list[str]
    expense_categories_user_is_willing_to_stop: list[str]
    payment_methods_user_will_consider: list[str]
    max_installment_months: Optional[int]


@dataclass
class Event:
    event_id: str
    user_id: str
    event_type: str
    description: str
    category: str
    direction: str
    amount: Optional[float]
    currency: str
    event_date: date
    settlement_date: Optional[date]
    status: str
    linked_event_id: str
    flexibility: str
    minimum_allowed_amount: Optional[float]


@dataclass
class Request:
    request_id: str
    user_id: str
    request_date: date
    request_type: str
    requested_amount: float
    desired_completion_date: date
    allows_partial_payment: bool
    request_text: str


@dataclass
class PaymentOption:
    payment_option_id: str
    request_id: str
    payment_method: str
    payment_amount: float
    number_of_payments: int
    first_payment_date: date
    payment_frequency_days: Optional[int]
    financing_fee: float
    total_payable_amount: float


@dataclass
class Message:
    message_id: str
    user_id: str
    request_id: str
    related_event_id: str
    sent_at: str
    source_type: str
    message_text: str


@dataclass
class ImageRow:
    image_id: str
    user_id: str
    request_id: str
    related_event_id: str


@dataclass
class UserFacts:
    """Structured facts consumed by the cash engine. Never a payment decision."""

    salary_amount: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_from_date: Optional[date] = None
    salary_next_date: Optional[date] = None
    salary_stop: bool = False
    ignore_bonus_commission: bool = False
    rent_multiplier: float = 1.0
    confirmed_invoices: list[tuple[date, float, str]] = field(default_factory=list)
    no_gig_income: bool = False
    ignore_internal_transfers: bool = False
    first_salary: bool = False
    salary_resume: bool = False
    lost_secondary_income: bool = False
    prize_uncredited: bool = False
    pending_refund: bool = False
    unrealized_no_cash: bool = False
    payday_replaced: bool = False
    arrears_split: bool = False
    salary_raise: bool = False
    salary_reduced: bool = False
    image_amounts: dict[str, float] = field(default_factory=dict)


@dataclass
class CashFlow:
    on: date
    amount: float  # +credit / -debit, home currency
    kind: str
    label: str


@dataclass
class OutputRow:
    request_id: str
    amount_safe_to_pay: float
    affordability_status: str
    recommended_payment_method: str
    payment_plan: str
    earliest_date_for_full_payment: str
    spending_changes_needed: str
    decision_explanation: str
