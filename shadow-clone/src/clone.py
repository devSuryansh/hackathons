"""Allowlist gate, owner commands, and persona prompt assembly."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any

from .llm import FeatherlessLLM
from .store import Person, Store


OWNER_COMMANDS = {"/pause", "/resume", "/status"}


@dataclass
class SenderInfo:
    channel: str
    address: str
    name: str
    telegram_id: str = ""
    discord_id: str = ""
    email: str = ""
    username: str = ""


@dataclass
class HandleResult:
    action: str  # reply | silent | owner_ack
    text: str = ""
    person_name: str = ""
    reason: str = ""


def _looks_numeric_id(value: str) -> bool:
    v = (value or "").strip().lstrip("@")
    return bool(v) and v.isdigit()


def extract_sender(message: Any) -> SenderInfo:
    """Normalize Caspian Message into SenderInfo.

    On Telegram and Discord, Caspian typically sends ``sender.address`` as the
    **username** (not a numeric snowflake/user id). Allowlists must use those
    usernames. Numeric ids are still accepted if they ever appear.
    """
    channel = str(getattr(message, "channel", None) or "").lower()
    sender = getattr(message, "sender", None) or {}
    if not isinstance(sender, dict):
        sender = {}

    raw_id = str(sender.get("id") or "").strip().lstrip("@")
    raw_user = str(
        sender.get("username") or sender.get("user_name") or ""
    ).strip().lstrip("@")
    address = str(sender.get("address") or raw_user or raw_id or "").strip()
    address_bare = address.lstrip("@")
    name = str(sender.get("name") or raw_user or address_bare or "unknown")

    email = ""
    telegram_id = ""
    discord_id = ""
    username = raw_user or ""

    if not channel:
        if (
            "@" in address_bare
            and " " not in address_bare
            and "." in address_bare.split("@", 1)[-1]
        ):
            channel = "email"
        else:
            channel = "unknown"

    if (
        "@" in address_bare
        and " " not in address_bare
        and "." in address_bare.split("@", 1)[-1]
        and "telegram" not in channel
    ):
        email = address_bare.lower()

    if "telegram" in channel:
        # Prefer username / address handle; keep numeric id only as fallback key
        if address_bare and not _looks_numeric_id(address_bare):
            username = username or address_bare
            telegram_id = address_bare
        elif raw_user:
            username = raw_user
            telegram_id = raw_user
        elif _looks_numeric_id(raw_id):
            telegram_id = raw_id
        elif _looks_numeric_id(address_bare):
            telegram_id = address_bare
        else:
            telegram_id = address_bare
    elif "discord" in channel:
        if address_bare and not _looks_numeric_id(address_bare):
            username = username or address_bare
            discord_id = address_bare
        elif raw_user:
            username = raw_user
            discord_id = raw_user
        elif _looks_numeric_id(raw_id):
            discord_id = raw_id
        else:
            discord_id = address_bare
        if not username and discord_id and not _looks_numeric_id(discord_id):
            username = discord_id
    elif "email" in channel or "mail" in channel:
        email = email or address_bare.lower()
    elif email:
        channel = "email"

    if not channel:
        channel = "unknown"

    return SenderInfo(
        channel=channel,
        address=address_bare or address,
        name=name,
        telegram_id=telegram_id,
        discord_id=discord_id,
        email=email,
        username=username,
    )


class ShadowClone:
    def __init__(
        self,
        store: Store,
        llm: FeatherlessLLM,
        behavior_prompt: str = "",
    ) -> None:
        self.store = store
        self.llm = llm
        self.behavior_prompt = behavior_prompt
        self._sync_owner_ids_from_env()

    def _sync_owner_ids_from_env(self) -> None:
        """Pull OWNER_* env into owner row. Prefer usernames (what Caspian sends)."""
        fields: dict[str, str] = {}
        tg_user = os.environ.get("OWNER_TELEGRAM_USERNAME", "").strip().lstrip("@")
        tg_id = os.environ.get("OWNER_TELEGRAM_ID", "").strip()
        dc_user = os.environ.get("OWNER_DISCORD_USERNAME", "").strip().lstrip("@")
        dc_id = os.environ.get("OWNER_DISCORD_ID", "").strip()
        # Username first: matches live Caspian Telegram/Discord payloads
        if tg_user:
            fields["telegram_id"] = tg_user
        elif tg_id:
            fields["telegram_id"] = tg_id
        if dc_user:
            fields["discord_id"] = dc_user
        elif dc_id:
            fields["discord_id"] = dc_id
        if os.environ.get("OWNER_EMAIL"):
            fields["email"] = os.environ["OWNER_EMAIL"].strip().lower()
        if fields:
            self.store.update_owner(**fields)

    def is_owner(self, sender: SenderInfo) -> bool:
        owner = self.store.get_owner()
        handles = {
            Store._norm_handle(sender.telegram_id),
            Store._norm_handle(sender.discord_id),
            Store._norm_handle(sender.address),
            Store._norm_handle(sender.username),
            Store._norm_handle(sender.email),
        }
        handles.discard("")

        owner_ids = {
            Store._norm_handle(owner.telegram_id),
            Store._norm_handle(owner.discord_id),
            Store._norm_handle(owner.email),
            Store._norm_handle(os.environ.get("OWNER_TELEGRAM_ID", "")),
            Store._norm_handle(os.environ.get("OWNER_TELEGRAM_USERNAME", "")),
            Store._norm_handle(os.environ.get("OWNER_DISCORD_ID", "")),
            Store._norm_handle(os.environ.get("OWNER_DISCORD_USERNAME", "")),
            Store._norm_handle(os.environ.get("OWNER_EMAIL", "")),
        }
        owner_ids.discard("")
        return bool(handles & owner_ids)

    def handle_owner_command(self, text: str) -> HandleResult:
        cmd = text.strip().split()[0].lower() if text.strip() else ""
        if cmd == "/pause":
            self.store.set_paused(True)
            return HandleResult(
                action="owner_ack",
                text="Paused. I will not reply to counterparts.",
                reason="owner_command",
            )
        if cmd == "/resume":
            self.store.set_paused(False)
            return HandleResult(
                action="owner_ack",
                text="Resumed. Allowlisted people get replies again.",
                reason="owner_command",
            )
        if cmd == "/status":
            paused = self.store.is_paused()
            n = len(self.store.list_people())
            return HandleResult(
                action="owner_ack",
                text=f"paused={paused} people={n} llm={'ok' if self.llm.configured else 'missing FEATHERLESS_API_KEY'}",
                reason="owner_command",
            )
        return HandleResult(
            action="owner_ack",
            text="Commands: /pause /resume /status",
            reason="owner_command",
        )

    def build_system_prompt(self, person: Person) -> str:
        owner = self.store.get_owner()
        facts = self.store.list_facts(person.id)
        samples = self.store.list_style_samples(person.id)
        samples_blob = "\n---\n".join(samples[:6])
        if len(samples_blob) > 2500:
            samples_blob = samples_blob[:2500] + "\n…"

        parts = [
            f"You ARE {owner.name or 'the owner'}. You are not an AI assistant. "
            "Reply in first person as them. Never say you are a bot or language model "
            "unless they explicitly ask.",
            f"About you:\n{owner.bio}",
            f"How you talk:\n{owner.talking_style}",
            f"You are talking to {person.name}.",
            f"Relationship: {person.relationship}",
            f"How you know them: {person.how_met}",
            f"Notes: {person.notes}",
        ]
        if facts:
            parts.append("Facts about them:\n- " + "\n- ".join(facts))
        if samples_blob:
            parts.append(
                "Past conversation style samples (match cadence; do not copy long quotes):\n"
                + samples_blob
            )
        parts.append(
            "Keep replies natural for the channel. Be concise on chat apps. "
            "Do not invent facts that are not in the dossier. "
            "If unsure, ask a short in-character question."
        )
        if self.behavior_prompt:
            parts.append("Channel etiquette:\n" + self.behavior_prompt)
        return "\n\n".join(parts)

    def process(self, message: Any) -> HandleResult:
        text = (getattr(message, "text", None) or "").strip()
        if not text:
            return HandleResult(action="silent", reason="empty")

        sender = extract_sender(message)
        conversation_id = str(
            getattr(message, "conversation_id", None)
            or getattr(message, "thread_id", None)
            or "unknown"
        )
        handles = [sender.address, sender.username, sender.telegram_id, sender.discord_id]

        # Owner commands always work
        first = text.split()[0].lower() if text else ""
        if self.is_owner(sender) and (
            first in OWNER_COMMANDS or text.startswith("/")
        ):
            return self.handle_owner_command(text)

        if self.store.is_paused():
            return HandleResult(action="silent", reason="paused")

        person = self.store.find_person_for_sender(
            email=sender.email or None,
            telegram_id=sender.telegram_id or None,
            discord_id=sender.discord_id or None,
            handles=handles,
        )

        # Caspian test-email verify: gateway may send from a platform address.
        if person is None and os.environ.get("SHADOW_CLONE_OPEN_EMAIL_TEST") == "1":
            people = self.store.list_people()
            if people and ("email" in sender.channel or sender.email or "@" in sender.address):
                person = people[0]

        if person is None:
            return HandleResult(
                action="silent",
                reason=(
                    f"not_allowlisted channel={sender.channel} "
                    f"address={sender.address!r} tg={sender.telegram_id!r} "
                    f"user={sender.username!r}"
                ),
            )
        if not person.auto_reply:
            return HandleResult(
                action="silent",
                reason=f"auto_reply_off person={person.name}",
            )

        if not self.llm.configured:
            return HandleResult(
                action="reply",
                text="(clone online but FEATHERLESS_API_KEY missing — see GUIDE.md)",
                person_name=person.name,
                reason="llm_missing",
            )

        system = self.build_system_prompt(person)
        history = self.store.recent_memory(conversation_id)
        self.store.add_memory(conversation_id, "user", text)
        reply = self.llm.complete(system, text, history=history)
        reply = re.sub(r"^(Assistant|AI|Bot)\s*:\s*", "", reply, flags=re.I).strip()
        if not reply:
            reply = "hey, just saw this — give me a sec"
        self.store.add_memory(conversation_id, "assistant", reply)
        return HandleResult(
            action="reply",
            text=reply,
            person_name=person.name,
            reason="ok",
        )
