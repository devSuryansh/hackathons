"""Shadow Clone agent: one Caspian on_message handler for email, Telegram, Discord."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Ensure project root is importable when run as `python -m src.agent`
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / ".env")

from caspian_sdk import CommClient  # noqa: E402

from src.clone import ShadowClone  # noqa: E402
from src.llm import FeatherlessLLM  # noqa: E402
from src.store import Store  # noqa: E402


def _require_env(name: str) -> str:
    val = os.environ.get(name, "").strip()
    if not val:
        raise SystemExit(
            f"Missing {name}. Copy .env.example to .env and follow GUIDE.md."
        )
    return val


def main() -> None:
    _require_env("CASPIAN_API_KEY")
    email_username = os.environ.get("EMAIL_USERNAME", "myclone").strip() or "myclone"
    tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    dc_token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()

    if not tg_token and not dc_token:
        print(
            "Warning: neither TELEGRAM_BOT_TOKEN nor DISCORD_BOT_TOKEN is set. "
            "Email alone does not meet the two-channel rule. See GUIDE.md."
        )

    db_path = os.environ.get("CLONE_DB_PATH", str(ROOT / "data" / "clone.db"))
    store = Store(db_path)
    llm = FeatherlessLLM()

    client = CommClient()

    inbox = client.connect_email(username=email_username)
    address = inbox.get("address") if isinstance(inbox, dict) else getattr(inbox, "address", inbox)
    print(f"Email connected: {address}")

    if tg_token:
        tg = client.connect_telegram(bot_token=tg_token)
        tg_addr = tg.get("address") if isinstance(tg, dict) else getattr(tg, "address", tg)
        print(f"Telegram connected: {tg_addr}")
    else:
        print("Telegram skipped (no TELEGRAM_BOT_TOKEN)")

    if dc_token:
        dc = client.connect_discord(bot_token=dc_token)
        dc_addr = dc.get("address") if isinstance(dc, dict) else getattr(dc, "address", dc)
        print(f"Discord connected: {dc_addr}")
    else:
        print("Discord skipped (no DISCORD_BOT_TOKEN)")

    behavior = ""
    try:
        behavior = client.behavior_prompt() or ""
    except Exception as exc:  # noqa: BLE001
        print(f"behavior_prompt unavailable: {exc}")

    clone = ShadowClone(store=store, llm=llm, behavior_prompt=behavior)

    @client.on_message
    def handle(message):  # single handler for every channel
        sender = getattr(message, "sender", None) or {}
        preview = (getattr(message, "text", None) or "")[:80]
        print(f"<- {sender}: {preview!r}")

        result = clone.process(message)
        if result.action in ("reply", "owner_ack") and result.text:
            message.reply(result.text)
            who = result.person_name or "owner"
            print(f"-> replied ({result.action}) as voice for {who}")
        else:
            print(f"-> silent ({result.reason or 'paused, not allowlisted, or empty'})")

    print("Shadow Clone listening on connected channels (Ctrl+C to stop)…")
    # Allow Caspian test-email during first verify without allowlist match
    if os.environ.get("SHADOW_CLONE_OPEN_EMAIL_TEST") is None:
        os.environ["SHADOW_CLONE_OPEN_EMAIL_TEST"] = "1"
        print("SHADOW_CLONE_OPEN_EMAIL_TEST=1 (demo email verify). Set to 0 for strict allowlist.")

    client.listen()


if __name__ == "__main__":
    main()
