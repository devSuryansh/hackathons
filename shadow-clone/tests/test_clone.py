"""Lightweight tests for store + clone gating (no network)."""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.clone import ShadowClone, extract_sender  # noqa: E402
from src.llm import FeatherlessLLM  # noqa: E402
from src.store import Store  # noqa: E402


class FakeLLM(FeatherlessLLM):
    def __init__(self) -> None:
        super().__init__(api_key="test")

    @property
    def configured(self) -> bool:
        return True

    def complete(self, system_prompt, user_text, history=None) -> str:
        return f"hey — got your msg about {user_text[:20]}"


class StoreCloneTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.tmp.name) / "t.db")
        self.clone = ShadowClone(self.store, FakeLLM(), behavior_prompt="be brief")
        os.environ.pop("SHADOW_CLONE_OPEN_EMAIL_TEST", None)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_seed_has_sam(self) -> None:
        people = self.store.list_people()
        self.assertTrue(any(p.name == "Sam" for p in people))

    def test_allowlist_email(self) -> None:
        person = self.store.find_person_for_sender(email="sam@example.com")
        self.assertIsNotNone(person)
        self.assertEqual(person.name, "Sam")

    def test_allowlist_telegram_username(self) -> None:
        person = self.store.find_person_for_sender(
            telegram_id="sam_demo", handles=["sam_demo"]
        )
        self.assertIsNotNone(person)
        self.assertEqual(person.name, "Sam")

    def test_pause_silences(self) -> None:
        self.store.set_paused(True)
        msg = SimpleNamespace(
            text="hey",
            sender={"address": "sam@example.com", "name": "Sam"},
            channel="email",
            conversation_id="c1",
        )
        result = self.clone.process(msg)
        self.assertEqual(result.action, "silent")

    def test_allowlisted_reply(self) -> None:
        self.store.set_paused(False)
        msg = SimpleNamespace(
            text="can you review the PR?",
            sender={"address": "sam@example.com", "name": "Sam"},
            channel="email",
            conversation_id="c2",
        )
        result = self.clone.process(msg)
        self.assertEqual(result.action, "reply")
        self.assertIn("hey", result.text.lower())

    def test_unknown_silent(self) -> None:
        msg = SimpleNamespace(
            text="spam",
            sender={"address": "stranger@example.com"},
            channel="email",
            conversation_id="c3",
        )
        result = self.clone.process(msg)
        self.assertEqual(result.action, "silent")

    def test_owner_pause_command(self) -> None:
        self.store.update_owner(telegram_id="owner_user")
        msg = SimpleNamespace(
            text="/pause",
            sender={"address": "owner_user", "name": "Owner"},
            channel="telegram",
            conversation_id="c4",
        )
        result = self.clone.process(msg)
        self.assertEqual(result.action, "owner_ack")
        self.assertTrue(self.store.is_paused())

    def test_extract_sender_email(self) -> None:
        msg = SimpleNamespace(
            text="hi",
            sender={"address": "a@b.com", "name": "A"},
            channel="email",
        )
        s = extract_sender(msg)
        self.assertEqual(s.email, "a@b.com")

    def test_extract_sender_telegram_username(self) -> None:
        msg = SimpleNamespace(
            text="hi",
            sender={"address": "SomeUser", "name": "Some User"},
            channel="telegram",
        )
        s = extract_sender(msg)
        self.assertEqual(s.telegram_id, "SomeUser")
        self.assertEqual(s.username, "SomeUser")


if __name__ == "__main__":
    unittest.main()
