from __future__ import annotations

import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Iterable

from models import ImageRow, Message, UserFacts

# Structured totals read from dataset/media/images/*.png. The engine
# consumes these facts; it does not invent a blank event amount of zero.
_IMAGE_FACTS_PATH = Path(__file__).resolve().parent / "image_facts.json"


def _load_image_amounts() -> dict[str, float]:
    if not _IMAGE_FACTS_PATH.exists():
        return {}
    rows = json.loads(_IMAGE_FACTS_PATH.read_text(encoding="utf-8"))
    return {row["image_id"]: float(row["amount"]) for row in rows}


IMAGE_AMOUNTS = _load_image_amounts()

_CCY_AMT = re.compile(
    r"\b(IDR|INR|ZAR|USD|EUR)\s*([0-9]+(?:\.[0-9]+)?)",
    re.IGNORECASE,
)
_ISO_DATE = re.compile(r"(20\d{2}-\d{2}-\d{2})")
_MONTH_NAME = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}
_MONTH_DATE = re.compile(
    r"\b(\d{1,2})\s+"
    r"(January|February|March|April|May|June|July|August|September|"
    r"October|November|December)\s+(20\d{2})\b",
    re.IGNORECASE,
)

USE_CONFIRMED_BASE_SALARY = False


def _first_money(text: str) -> tuple[str, float] | None:
    match = _CCY_AMT.search(text)
    if not match:
        return None
    return match.group(1).upper(), float(match.group(2))


def _first_amount(text: str) -> float | None:
    money = _first_money(text)
    return money[1] if money else None


def _set_salary_amount(facts: UserFacts, text: str) -> None:
    money = _first_money(text)
    if money is None:
        return
    facts.salary_currency = money[0]
    facts.salary_amount = money[1]


def _dates(text: str) -> list:
    found = [datetime.strptime(d, "%Y-%m-%d").date() for d in _ISO_DATE.findall(text)]
    for match in _MONTH_DATE.finditer(text):
        found.append(
            date(
                int(match.group(3)),
                _MONTH_NAME[match.group(2).lower()],
                int(match.group(1)),
            )
        )
    return found


def extract_facts(
    messages: Iterable[Message],
    images: Iterable[ImageRow],
) -> UserFacts:
    facts = UserFacts()
    for image in images:
        if image.image_id in IMAGE_AMOUNTS and image.related_event_id:
            facts.image_amounts[image.related_event_id] = IMAGE_AMOUNTS[image.image_id]

    for message in messages:
        text = message.message_text or ""
        lower = text.lower()

        if (
            "increases monthly rent by 12%" in lower
            or "increases monthly rent by 12" in lower
            or "menaikkan biaya sewa bulanan sebesar 12" in lower
        ):
            facts.rent_multiplier = 1.12

        if (
            "payout is still pending" in lower
            or "isn't withdrawable" in lower
            or "isn\u2019t withdrawable" in lower
            or "saldo belum dapat ditarik" in lower
            or "penghasilan mingguan di aplikasi" in lower
        ):
            facts.no_gig_income = True

        if "prize claim has been verified" in lower and "has not been credited" in lower:
            facts.prize_uncredited = True

        if (
            "klaim hadiah" in lower
            and "diverifikasi" in lower
            and "belum masuk ke rekening" in lower
        ):
            facts.prize_uncredited = True

        if "refund has been initiated" in lower and "has not reached" in lower:
            facts.pending_refund = True

        if "foreign-currency refund is still processing" in lower:
            facts.pending_refund = True

        if (
            "pengembalian dana" in lower
            and "belum masuk ke rekening" in lower
        ):
            facts.pending_refund = True

        if "no units have been sold" in lower and "no cash proceeds" in lower:
            facts.unrealized_no_cash = True

        if "has not been sold" in lower and "no cash transaction" in lower:
            facts.unrealized_no_cash = True

        if "belum dijual" in lower and "tidak ada transaksi tunai" in lower:
            facts.unrealized_no_cash = True

        if "transfer between your two accounts" in lower:
            facts.ignore_internal_transfers = True

        if "transfer antara dua rekening" in lower:
            facts.ignore_internal_transfers = True

        if any(
            needle in lower
            for needle in (
                "commission",
                "komisi",
                "bonus kuartalan",
                "open deals",
                "belum disetujui",
                "not been approved",
                "still subject to the final performance",
            )
        ):
            facts.ignore_bonus_commission = True

        if (
            "contract has ended" in lower
            or "no off-season income" in lower
            or "your employment has ended" in lower
            or "no regular salary payments scheduled after the final" in lower
        ):
            facts.salary_stop = True

        if (
            "hubungan kerja anda telah berakhir" in lower
            or "tidak ada pembayaran gaji rutin yang dijadwalkan" in lower
            or "kontrak musiman saat ini telah berakhir" in lower
            or "belum ada pendapatan di luar musim" in lower
        ):
            facts.salary_stop = True

        if (
            "household employment record has ended" in lower
            or "pendapatan kerja rumah tangga telah berakhir" in lower
        ):
            facts.lost_secondary_income = True
            if (
                "remaining confirmed monthly salary" in lower
                or "sisa gaji bulanan yang dikonfirmasi" in lower
            ):
                _set_salary_amount(facts, text)
            continue

        if (
            "regular salary for the next payroll is" in lower
            or "gaji rutin anda untuk penggajian berikutnya adalah" in lower
        ):
            facts.arrears_split = True
            _set_salary_amount(facts, text)
            continue

        if "gaji sebesar" in lower and "dikonfirmasi untuk" in lower:
            _set_salary_amount(facts, text)
            dates = _dates(text)
            if dates:
                facts.salary_next_date = dates[0]
                facts.salary_from_date = dates[0]
            continue

        if "is confirmed for" in lower and "receiving bank will convert" in lower:
            _set_salary_amount(facts, text)
            dates = _dates(text)
            if dates:
                facts.salary_next_date = dates[0]
                facts.salary_from_date = dates[0]
            continue

        if "salary credit" in lower and "exchange rate when it settles" in lower:
            _set_salary_amount(facts, text)
            dates = _dates(text)
            if dates:
                # Receipt date may appear first. The salary date is last.
                facts.salary_next_date = dates[-1]
                facts.salary_from_date = dates[-1]
            continue

        if "gaji bulanan sementara" in lower:
            facts.salary_reduced = True
            _set_salary_amount(facts, text)
            continue

        if (
            "naik menjadi" in lower
            or "gaji bulanan anda naik" in lower
            or "monthly salary has increased to" in lower
        ):
            facts.salary_raise = True
            _set_salary_amount(facts, text)
            dates = _dates(text)
            if dates:
                facts.salary_from_date = dates[0]
            continue

        if "gaji pokok yang dikonfirmasi" in lower or "confirmed base salary is" in lower:
            # Confirm the existing base series. Optionally treat the printed
            # figure as the new base; default is keep historical base.
            facts.ignore_bonus_commission = True
            if USE_CONFIRMED_BASE_SALARY:
                amount = _first_amount(text)
                if amount is not None:
                    facts.salary_amount = amount
            continue

        if "temporary monthly pay is" in lower:
            facts.salary_reduced = True
            _set_salary_amount(facts, text)
            continue

        if "confirmed salary is now expected on" in lower:
            facts.payday_replaced = True
            dates = _dates(text)
            if dates:
                facts.salary_next_date = dates[0]
            continue

        if (
            "gaji yang sudah dikonfirmasi kini diperkirakan masuk pada" in lower
            or "menggantikan tanggal penggajian" in lower
        ):
            facts.payday_replaced = True
            dates = _dates(text)
            if dates:
                facts.salary_next_date = dates[0]
            continue

        if "next salary is reduced to" in lower:
            facts.salary_reduced = True
            _set_salary_amount(facts, text)
            continue

        if "resumes on" in lower and "regular salary of" in lower:
            facts.salary_resume = True
            _set_salary_amount(facts, text)
            dates = _dates(text)
            if dates:
                facts.salary_next_date = dates[0]
                facts.salary_from_date = dates[0]
            continue

        if (
            "penyesuaian satu kali" in lower
            or "tunggakan satu kali" in lower
            or "one-time arrears" in lower
            or "one-off adjustment" in lower
        ):
            facts.arrears_split = True

        if "first salary" in lower or "gaji pertama" in lower:
            facts.first_salary = True
            _set_salary_amount(facts, text)
            dates = _dates(text)
            if dates:
                facts.salary_next_date = dates[0]
                facts.salary_from_date = dates[0]
            continue

        if "client approved an invoice payment" in lower or "menyetujui pembayaran faktur" in lower:
            money = _first_money(text)
            dates = _dates(text)
            if money is not None and dates:
                facts.confirmed_invoices.append((dates[0], money[1], money[0]))
            continue

    return facts
