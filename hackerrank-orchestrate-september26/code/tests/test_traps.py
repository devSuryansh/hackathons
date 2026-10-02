from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from datetime import date

from facts import extract_facts
from load import Dataset
from models import Message
from sample_eval import amounts_close
from solver import solve_request

SAMPLES = None


def _dataset() -> Dataset:
    global SAMPLES
    if SAMPLES is None:
        SAMPLES = Dataset()
    return SAMPLES


class SampleTrapTests(unittest.TestCase):
    def _check(self, request_id: str) -> None:
        dataset = _dataset()
        request = next(r for r in dataset.sample_requests if r.request_id == request_id)
        gold = dataset.sample_gold[request_id]
        got = solve_request(dataset, request)
        self.assertTrue(
            amounts_close(got.amount_safe_to_pay, float(gold["amount_safe_to_pay"])),
            f"{request_id} amount_safe expected {gold['amount_safe_to_pay']} "
            f"got {got.amount_safe_to_pay}",
        )
        self.assertEqual(
            got.earliest_date_for_full_payment,
            (gold.get("earliest_date_for_full_payment") or "").strip(),
            f"{request_id} earliest expected "
            f"{gold.get('earliest_date_for_full_payment')!r} "
            f"got {got.earliest_date_for_full_payment!r}",
        )

    def test_request_01_happy_path(self) -> None:
        self._check("request_01")

    def test_request_03_image_salary_and_wait(self) -> None:
        self._check("request_03")

    def test_request_12_full_safe_today_without_income(self) -> None:
        self._check("request_12")

    def test_request_14_safe_positive_earliest_empty(self) -> None:
        self._check("request_14")

    def test_request_19_partial_gold_ab(self) -> None:
        self._check("request_19")

    def test_request_11_b_after_deadline(self) -> None:
        self._check("request_11")

    def test_request_06_temporary_pay(self) -> None:
        self._check("request_06")

    def test_request_21_b_after_deadline(self) -> None:
        self._check("request_21")

    def test_request_25_fx_salary(self) -> None:
        self._check("request_25")

    def test_request_10_no_gig_income(self) -> None:
        self._check("request_10")

    def test_request_15_first_salary(self) -> None:
        self._check("request_15")

    def test_request_04_unconfirmed_bonus(self) -> None:
        self._check("request_04")

    def test_request_24_prize_closed(self) -> None:
        self._check("request_24")

    def test_request_13_second_income_stopped(self) -> None:
        self._check("request_13")

    def test_request_05_final_payroll(self) -> None:
        self._check("request_05")

    def test_request_23_prize_uncredited(self) -> None:
        self._check("request_23")


def _message(text: str) -> Message:
    return Message(
        message_id="m",
        user_id="u",
        request_id="",
        related_event_id="",
        sent_at="",
        source_type="employer",
        message_text=text,
    )


class EvalWordingTests(unittest.TestCase):
    def test_indonesian_payday_replacement(self) -> None:
        facts = extract_facts(
            [
                _message(
                    "Gaji yang sudah dikonfirmasi kini diperkirakan masuk "
                    "pada 2025-02-23. Tanggal ini menggantikan tanggal "
                    "penggajian pada pemberitahuan sebelumnya."
                )
            ],
            [],
        )
        self.assertTrue(facts.payday_replaced)
        self.assertEqual(facts.salary_next_date, date(2025, 2, 23))

    def test_indonesian_seasonal_contract_ended(self) -> None:
        facts = extract_facts(
            [
                _message(
                    "Kontrak musiman saat ini telah berakhir. Belum ada "
                    "pendapatan di luar musim atau perpanjangan kontrak "
                    "yang dikonfirmasi."
                )
            ],
            [],
        )
        self.assertTrue(facts.salary_stop)

    def test_english_unrealized_drop_no_sale(self) -> None:
        facts = extract_facts(
            [
                _message(
                    "The displayed value of the investment has fallen. "
                    "The holding has not been sold and there has been no "
                    "cash transaction."
                )
            ],
            [],
        )
        self.assertTrue(facts.unrealized_no_cash)

    def test_english_salary_credit_month_name_date(self) -> None:
        facts = extract_facts(
            [
                _message(
                    "Your wallet was charged on 3 September 2026. "
                    "Your employer has confirmed a USD 1296 salary credit "
                    "for 15 September 2026. The salary will use the "
                    "exchange rate when it settles."
                )
            ],
            [],
        )
        self.assertEqual(facts.salary_amount, 1296.0)
        self.assertEqual(facts.salary_currency, "USD")
        self.assertEqual(facts.salary_next_date, date(2026, 9, 15))


if __name__ == "__main__":
    unittest.main()
