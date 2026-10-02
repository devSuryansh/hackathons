"""SQLite store for owner persona, people dossiers, and conversation memory."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Owner:
    name: str
    bio: str
    talking_style: str
    telegram_id: str
    discord_id: str
    email: str


@dataclass
class Person:
    id: int
    name: str
    relationship: str
    how_met: str
    notes: str
    allow_emails: list[str]
    allow_telegram_ids: list[str]
    allow_discord_ids: list[str]
    auto_reply: bool


class Store:
    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()
        self._seed_if_empty()

    @contextmanager
    def _conn(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS owner (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    name TEXT NOT NULL DEFAULT '',
                    bio TEXT NOT NULL DEFAULT '',
                    talking_style TEXT NOT NULL DEFAULT '',
                    telegram_id TEXT NOT NULL DEFAULT '',
                    discord_id TEXT NOT NULL DEFAULT '',
                    email TEXT NOT NULL DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS people (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    relationship TEXT NOT NULL DEFAULT '',
                    how_met TEXT NOT NULL DEFAULT '',
                    notes TEXT NOT NULL DEFAULT '',
                    allow_emails TEXT NOT NULL DEFAULT '[]',
                    allow_telegram_ids TEXT NOT NULL DEFAULT '[]',
                    allow_discord_ids TEXT NOT NULL DEFAULT '[]',
                    auto_reply INTEGER NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS facts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
                    fact TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS style_samples (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
                    sample TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS conversation_memory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_memory_conv
                    ON conversation_memory(conversation_id, id);
                """
            )

    def _seed_if_empty(self) -> None:
        with self._conn() as conn:
            row = conn.execute("SELECT COUNT(*) AS c FROM owner").fetchone()
            if row["c"] == 0:
                conn.execute(
                    """
                    INSERT INTO owner (id, name, bio, talking_style)
                    VALUES (1, '',
                            'Fill this in via the dashboard: who you are.',
                            'Fill this in: tone, length, slang, emoji habits.')
                    """
                )
            paused = conn.execute(
                "SELECT value FROM settings WHERE key = 'paused'"
            ).fetchone()
            if not paused:
                conn.execute(
                    "INSERT INTO settings (key, value) VALUES ('paused', '0')"
                )

            people_count = conn.execute("SELECT COUNT(*) AS c FROM people").fetchone()
            if people_count["c"] == 0:
                cur = conn.execute(
                    """
                    INSERT INTO people
                    (name, relationship, how_met, notes, allow_emails,
                     allow_telegram_ids, allow_discord_ids, auto_reply)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        "Sam",
                        "colleague (demo)",
                        "Worked on a project together. Replace with a real contact.",
                        "Demo only. Set allowlist emails/usernames to people you approve.",
                        json.dumps(["sam@example.com"]),
                        json.dumps(["sam_demo"]),
                        json.dumps(["sam_demo"]),
                        1,
                    ),
                )
                pid = cur.lastrowid
                facts = [
                    "Prefers short updates over long emails",
                    "Usually free after 6pm on weekdays",
                    "Timezone: same as owner (demo)",
                ]
                for f in facts:
                    conn.execute(
                        "INSERT INTO facts (person_id, fact) VALUES (?, ?)",
                        (pid, f),
                    )
                samples = [
                    "me: hey sam, can you review the PR today?\nsam: yep, after standup",
                    "me: running 10 min late to the call\nsam: all good, ping when you're on",
                    "me: ship it or wait for design?\nsam: ship the backend, design can follow",
                ]
                for s in samples:
                    conn.execute(
                        "INSERT INTO style_samples (person_id, sample) VALUES (?, ?)",
                        (pid, s),
                    )

    def get_owner(self) -> Owner:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM owner WHERE id = 1").fetchone()
            return Owner(
                name=row["name"],
                bio=row["bio"],
                talking_style=row["talking_style"],
                telegram_id=row["telegram_id"],
                discord_id=row["discord_id"],
                email=row["email"],
            )

    def update_owner(self, **fields: str) -> Owner:
        allowed = {
            "name",
            "bio",
            "talking_style",
            "telegram_id",
            "discord_id",
            "email",
        }
        updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
        if updates:
            cols = ", ".join(f"{k} = ?" for k in updates)
            with self._conn() as conn:
                conn.execute(
                    f"UPDATE owner SET {cols} WHERE id = 1",
                    list(updates.values()),
                )
        return self.get_owner()

    def is_paused(self) -> bool:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT value FROM settings WHERE key = 'paused'"
            ).fetchone()
            return bool(row and row["value"] == "1")

    def set_paused(self, paused: bool) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO settings (key, value) VALUES ('paused', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                ("1" if paused else "0",),
            )

    def _person_from_row(self, row: sqlite3.Row) -> Person:
        return Person(
            id=row["id"],
            name=row["name"],
            relationship=row["relationship"],
            how_met=row["how_met"],
            notes=row["notes"],
            allow_emails=json.loads(row["allow_emails"] or "[]"),
            allow_telegram_ids=json.loads(row["allow_telegram_ids"] or "[]"),
            allow_discord_ids=json.loads(row["allow_discord_ids"] or "[]"),
            auto_reply=bool(row["auto_reply"]),
        )

    def list_people(self) -> list[Person]:
        with self._conn() as conn:
            rows = conn.execute("SELECT * FROM people ORDER BY id").fetchall()
            return [self._person_from_row(r) for r in rows]

    def get_person(self, person_id: int) -> Person | None:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM people WHERE id = ?", (person_id,)
            ).fetchone()
            return self._person_from_row(row) if row else None

    def upsert_person(self, data: dict[str, Any], person_id: int | None = None) -> Person:
        payload = {
            "name": data.get("name", ""),
            "relationship": data.get("relationship", ""),
            "how_met": data.get("how_met", ""),
            "notes": data.get("notes", ""),
            "allow_emails": json.dumps(data.get("allow_emails") or []),
            "allow_telegram_ids": json.dumps(data.get("allow_telegram_ids") or []),
            "allow_discord_ids": json.dumps(data.get("allow_discord_ids") or []),
            "auto_reply": 1 if data.get("auto_reply", True) else 0,
        }
        with self._conn() as conn:
            if person_id:
                conn.execute(
                    """
                    UPDATE people SET name=?, relationship=?, how_met=?, notes=?,
                    allow_emails=?, allow_telegram_ids=?, allow_discord_ids=?, auto_reply=?
                    WHERE id=?
                    """,
                    (
                        payload["name"],
                        payload["relationship"],
                        payload["how_met"],
                        payload["notes"],
                        payload["allow_emails"],
                        payload["allow_telegram_ids"],
                        payload["allow_discord_ids"],
                        payload["auto_reply"],
                        person_id,
                    ),
                )
                pid = person_id
            else:
                cur = conn.execute(
                    """
                    INSERT INTO people
                    (name, relationship, how_met, notes, allow_emails,
                     allow_telegram_ids, allow_discord_ids, auto_reply)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        payload["name"],
                        payload["relationship"],
                        payload["how_met"],
                        payload["notes"],
                        payload["allow_emails"],
                        payload["allow_telegram_ids"],
                        payload["allow_discord_ids"],
                        payload["auto_reply"],
                    ),
                )
                pid = int(cur.lastrowid)
        person = self.get_person(pid)
        assert person is not None
        return person

    def delete_person(self, person_id: int) -> None:
        with self._conn() as conn:
            conn.execute("DELETE FROM facts WHERE person_id = ?", (person_id,))
            conn.execute("DELETE FROM style_samples WHERE person_id = ?", (person_id,))
            conn.execute("DELETE FROM people WHERE id = ?", (person_id,))

    def list_facts(self, person_id: int) -> list[str]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT fact FROM facts WHERE person_id = ? ORDER BY id",
                (person_id,),
            ).fetchall()
            return [r["fact"] for r in rows]

    def set_facts(self, person_id: int, facts: list[str]) -> None:
        with self._conn() as conn:
            conn.execute("DELETE FROM facts WHERE person_id = ?", (person_id,))
            for f in facts:
                f = f.strip()
                if f:
                    conn.execute(
                        "INSERT INTO facts (person_id, fact) VALUES (?, ?)",
                        (person_id, f),
                    )

    def list_style_samples(self, person_id: int) -> list[str]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT sample FROM style_samples WHERE person_id = ? ORDER BY id",
                (person_id,),
            ).fetchall()
            return [r["sample"] for r in rows]

    def set_style_samples(self, person_id: int, samples: list[str]) -> None:
        with self._conn() as conn:
            conn.execute(
                "DELETE FROM style_samples WHERE person_id = ?", (person_id,)
            )
            for s in samples:
                s = s.strip()
                if s:
                    conn.execute(
                        "INSERT INTO style_samples (person_id, sample) VALUES (?, ?)",
                        (person_id, s),
                    )

    @staticmethod
    def _norm_handle(value: str) -> str:
        """Normalize Telegram/Discord handles: strip @, casefold."""
        return (value or "").strip().lstrip("@").casefold()

    def find_person_for_sender(
        self,
        *,
        email: str | None = None,
        telegram_id: str | None = None,
        discord_id: str | None = None,
        handles: list[str] | None = None,
    ) -> Person | None:
        """Match allowlist by email, numeric ids, or usernames (Caspian often
        sends Telegram as address=username without the numeric id)."""
        email_l = (email or "").strip().lower()
        candidates_tg = {
            self._norm_handle(x)
            for x in [telegram_id, *(handles or [])]
            if x
        }
        candidates_dc = {
            self._norm_handle(x)
            for x in [discord_id, *(handles or [])]
            if x
        }
        for person in self.list_people():
            if email_l and email_l in {e.lower() for e in person.allow_emails}:
                return person
            allowed_tg = {self._norm_handle(str(x)) for x in person.allow_telegram_ids}
            if candidates_tg & allowed_tg:
                return person
            allowed_dc = {self._norm_handle(str(x)) for x in person.allow_discord_ids}
            if candidates_dc & allowed_dc:
                return person
        return None

    def add_memory(self, conversation_id: str, role: str, content: str) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO conversation_memory (conversation_id, role, content, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (conversation_id, role, content, _utc_now()),
            )

    def recent_memory(self, conversation_id: str, limit: int = 12) -> list[dict[str, str]]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT role, content FROM conversation_memory
                WHERE conversation_id = ?
                ORDER BY id DESC LIMIT ?
                """,
                (conversation_id, limit),
            ).fetchall()
            return [
                {"role": r["role"], "content": r["content"]} for r in reversed(rows)
            ]

    def snapshot(self) -> dict[str, Any]:
        owner = self.get_owner()
        people = []
        for p in self.list_people():
            people.append(
                {
                    "id": p.id,
                    "name": p.name,
                    "relationship": p.relationship,
                    "how_met": p.how_met,
                    "notes": p.notes,
                    "allow_emails": p.allow_emails,
                    "allow_telegram_ids": p.allow_telegram_ids,
                    "allow_discord_ids": p.allow_discord_ids,
                    "auto_reply": p.auto_reply,
                    "facts": self.list_facts(p.id),
                    "style_samples": self.list_style_samples(p.id),
                }
            )
        return {
            "owner": {
                "name": owner.name,
                "bio": owner.bio,
                "talking_style": owner.talking_style,
                "telegram_id": owner.telegram_id,
                "discord_id": owner.discord_id,
                "email": owner.email,
            },
            "paused": self.is_paused(),
            "people": people,
        }
