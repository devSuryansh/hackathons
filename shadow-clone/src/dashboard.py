"""Local FastAPI dashboard for editing owner + people dossiers."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
import uvicorn

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / ".env")

from src.store import Store  # noqa: E402

DB_PATH = os.environ.get("CLONE_DB_PATH", str(ROOT / "data" / "clone.db"))
store = Store(DB_PATH)

app = FastAPI(title="Shadow Clone Dashboard", docs_url="/api/docs")


class OwnerUpdate(BaseModel):
    name: str | None = None
    bio: str | None = None
    talking_style: str | None = None
    telegram_id: str | None = None
    discord_id: str | None = None
    email: str | None = None


class PersonPayload(BaseModel):
    name: str
    relationship: str = ""
    how_met: str = ""
    notes: str = ""
    allow_emails: list[str] = Field(default_factory=list)
    allow_telegram_ids: list[str] = Field(default_factory=list)
    allow_discord_ids: list[str] = Field(default_factory=list)
    auto_reply: bool = True
    facts: list[str] = Field(default_factory=list)
    style_samples: list[str] = Field(default_factory=list)


class PausePayload(BaseModel):
    paused: bool


@app.get("/api/state")
def api_state() -> dict[str, Any]:
    return store.snapshot()


@app.put("/api/owner")
def api_owner(body: OwnerUpdate) -> dict[str, Any]:
    owner = store.update_owner(**body.model_dump(exclude_none=True))
    return {
        "name": owner.name,
        "bio": owner.bio,
        "talking_style": owner.talking_style,
        "telegram_id": owner.telegram_id,
        "discord_id": owner.discord_id,
        "email": owner.email,
    }


@app.post("/api/pause")
def api_pause(body: PausePayload) -> dict[str, bool]:
    store.set_paused(body.paused)
    return {"paused": store.is_paused()}


@app.post("/api/people")
def api_create_person(body: PersonPayload) -> dict[str, Any]:
    person = store.upsert_person(body.model_dump())
    store.set_facts(person.id, body.facts)
    store.set_style_samples(person.id, body.style_samples)
    return store.snapshot()["people"][-1]


@app.put("/api/people/{person_id}")
def api_update_person(person_id: int, body: PersonPayload) -> dict[str, Any]:
    if not store.get_person(person_id):
        raise HTTPException(404, "person not found")
    store.upsert_person(body.model_dump(), person_id=person_id)
    store.set_facts(person_id, body.facts)
    store.set_style_samples(person_id, body.style_samples)
    for p in store.snapshot()["people"]:
        if p["id"] == person_id:
            return p
    raise HTTPException(500, "update failed")


@app.delete("/api/people/{person_id}")
def api_delete_person(person_id: int) -> dict[str, str]:
    if not store.get_person(person_id):
        raise HTTPException(404, "person not found")
    store.delete_person(person_id)
    return {"status": "deleted"}


DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Shadow Clone</title>
  <style>
    :root {
      --bg: #0f1115;
      --panel: #1a1d24;
      --text: #e8eaed;
      --muted: #9aa0a6;
      --accent: #7c9cff;
      --danger: #ff7b72;
      --ok: #3dd68c;
      --border: #2a2f3a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: ui-sans-serif, system-ui, sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.45;
    }
    header {
      padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      flex-wrap: wrap;
    }
    h1 { font-size: 1.15rem; margin: 0; font-weight: 600; }
    .sub { color: var(--muted); font-size: 0.85rem; }
    main {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem 1.5rem 2rem;
    }
    @media (max-width: 900px) { main { grid-template-columns: 1fr; } }
    .card {
      background: var(--panel); border: 1px solid var(--border);
      border-radius: 12px; padding: 1rem 1.1rem;
    }
    .card h2 { font-size: 0.95rem; margin: 0 0 0.75rem; }
    label { display: block; font-size: 0.75rem; color: var(--muted); margin: 0.6rem 0 0.25rem; }
    input, textarea, select {
      width: 100%; background: var(--bg); color: var(--text);
      border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 0.65rem;
      font: inherit;
    }
    textarea { min-height: 72px; resize: vertical; }
    .row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.85rem; }
    button {
      background: var(--accent); color: #0b0d12; border: 0; border-radius: 8px;
      padding: 0.45rem 0.85rem; font-weight: 600; cursor: pointer; font: inherit;
    }
    button.secondary { background: transparent; color: var(--text); border: 1px solid var(--border); }
    button.danger { background: var(--danger); color: #1a0505; }
    .pill {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.8rem;
      border: 1px solid var(--border);
    }
    .pill.on { border-color: var(--ok); color: var(--ok); }
    .pill.off { border-color: var(--danger); color: var(--danger); }
    .person {
      border: 1px solid var(--border); border-radius: 10px; padding: 0.75rem;
      margin-bottom: 0.75rem; cursor: pointer;
    }
    .person.active { border-color: var(--accent); }
    .person h3 { margin: 0 0 0.25rem; font-size: 0.95rem; }
    .muted { color: var(--muted); font-size: 0.8rem; }
    #toast {
      position: fixed; bottom: 1rem; right: 1rem; background: #222; padding: 0.6rem 0.9rem;
      border-radius: 8px; border: 1px solid var(--border); display: none;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Shadow Clone</h1>
      <div class="sub">Edit you + allowlisted people. Agent speaks as you on Caspian channels.</div>
    </div>
    <div class="row" style="margin:0">
      <span id="pausePill" class="pill off">paused?</span>
      <button type="button" id="togglePause" class="secondary">Toggle pause</button>
      <button type="button" id="reload">Reload</button>
    </div>
  </header>
  <main>
    <section class="card">
      <h2>You (the owner)</h2>
      <label>Name</label>
      <input id="ownerName" />
      <label>Bio</label>
      <textarea id="ownerBio"></textarea>
      <label>Talking style</label>
      <textarea id="ownerStyle"></textarea>
      <label>Owner email (optional)</label>
      <input id="ownerEmail" placeholder="you@example.com" />
      <label>Owner Telegram username (as Caspian logs it)</label>
      <input id="ownerTg" placeholder="your_telegram_username" />
      <label>Owner Discord username (as Caspian logs it)</label>
      <input id="ownerDc" placeholder="your_discord_username" />
      <div class="row">
        <button type="button" id="saveOwner">Save you</button>
      </div>
    </section>

    <section class="card">
      <h2>People (allowlist)</h2>
      <div id="peopleList"></div>
      <div class="row">
        <button type="button" id="newPerson" class="secondary">New person</button>
      </div>
      <div id="editor" style="display:none; margin-top:1rem; border-top:1px solid var(--border); padding-top:0.75rem">
        <h2 id="editorTitle">Edit person</h2>
        <input type="hidden" id="personId" />
        <label>Name</label>
        <input id="pName" />
        <label>Relationship</label>
        <input id="pRel" />
        <label>How you met / context</label>
        <textarea id="pMet"></textarea>
        <label>Notes / boundaries</label>
        <textarea id="pNotes"></textarea>
        <label>Allow emails (comma-separated)</label>
        <input id="pEmails" />
        <label>Allow Telegram usernames (comma-separated, no @)</label>
        <input id="pTg" placeholder="friend_username" />
        <label>Allow Discord usernames (comma-separated)</label>
        <input id="pDc" placeholder="friend_discord_username" />
        <label>Facts (one per line)</label>
        <textarea id="pFacts"></textarea>
        <label>Past chat samples (blocks separated by a blank line)</label>
        <textarea id="pSamples" style="min-height:120px"></textarea>
        <label><input type="checkbox" id="pAuto" checked /> Auto-reply</label>
        <div class="row">
          <button type="button" id="savePerson">Save person</button>
          <button type="button" id="deletePerson" class="danger">Delete</button>
        </div>
      </div>
    </section>
  </main>
  <div id="toast"></div>
  <script>
    let state = null;
    let selectedId = null;

    function toast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.style.display = 'block';
      setTimeout(() => el.style.display = 'none', 2200);
    }

    function splitCsv(s) {
      return (s || '').split(',').map(x => x.trim()).filter(Boolean);
    }

    function render() {
      if (!state) return;
      const o = state.owner;
      document.getElementById('ownerName').value = o.name || '';
      document.getElementById('ownerBio').value = o.bio || '';
      document.getElementById('ownerStyle').value = o.talking_style || '';
      document.getElementById('ownerEmail').value = o.email || '';
      document.getElementById('ownerTg').value = o.telegram_id || '';
      document.getElementById('ownerDc').value = o.discord_id || '';

      const pill = document.getElementById('pausePill');
      pill.textContent = state.paused ? 'PAUSED' : 'LIVE';
      pill.className = 'pill ' + (state.paused ? 'off' : 'on');

      const list = document.getElementById('peopleList');
      list.innerHTML = '';
      state.people.forEach(p => {
        const div = document.createElement('div');
        div.className = 'person' + (selectedId === p.id ? ' active' : '');
        div.innerHTML = `<h3>${escapeHtml(p.name)}</h3>
          <div class="muted">${escapeHtml(p.relationship || 'no relationship set')}</div>`;
        div.onclick = () => selectPerson(p.id);
        list.appendChild(div);
      });
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      }[c]));
    }

    function selectPerson(id) {
      selectedId = id;
      const p = state.people.find(x => x.id === id);
      if (!p) return;
      document.getElementById('editor').style.display = 'block';
      document.getElementById('editorTitle').textContent = 'Edit ' + p.name;
      document.getElementById('personId').value = p.id;
      document.getElementById('pName').value = p.name || '';
      document.getElementById('pRel').value = p.relationship || '';
      document.getElementById('pMet').value = p.how_met || '';
      document.getElementById('pNotes').value = p.notes || '';
      document.getElementById('pEmails').value = (p.allow_emails || []).join(', ');
      document.getElementById('pTg').value = (p.allow_telegram_ids || []).join(', ');
      document.getElementById('pDc').value = (p.allow_discord_ids || []).join(', ');
      document.getElementById('pFacts').value = (p.facts || []).join('\\n');
      document.getElementById('pSamples').value = (p.style_samples || []).join('\\n\\n');
      document.getElementById('pAuto').checked = !!p.auto_reply;
      render();
    }

    async function load() {
      const res = await fetch('/api/state');
      state = await res.json();
      render();
      if (selectedId) selectPerson(selectedId);
    }

    document.getElementById('reload').onclick = load;
    document.getElementById('togglePause').onclick = async () => {
      await fetch('/api/pause', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ paused: !state.paused })
      });
      toast(state.paused ? 'Resumed' : 'Paused');
      await load();
    };

    document.getElementById('saveOwner').onclick = async () => {
      await fetch('/api/owner', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: document.getElementById('ownerName').value,
          bio: document.getElementById('ownerBio').value,
          talking_style: document.getElementById('ownerStyle').value,
          email: document.getElementById('ownerEmail').value,
          telegram_id: document.getElementById('ownerTg').value,
          discord_id: document.getElementById('ownerDc').value,
        })
      });
      toast('Saved you');
      await load();
    };

    document.getElementById('newPerson').onclick = () => {
      selectedId = null;
      document.getElementById('editor').style.display = 'block';
      document.getElementById('editorTitle').textContent = 'New person';
      document.getElementById('personId').value = '';
      ['pName','pRel','pMet','pNotes','pEmails','pTg','pDc','pFacts','pSamples'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('pAuto').checked = true;
      render();
    };

    function personPayload() {
      const samplesRaw = document.getElementById('pSamples').value.trim();
      const samples = samplesRaw
        ? samplesRaw.split(/\\n\\s*\\n/).map(s => s.trim()).filter(Boolean)
        : [];
      return {
        name: document.getElementById('pName').value.trim() || 'Unnamed',
        relationship: document.getElementById('pRel').value,
        how_met: document.getElementById('pMet').value,
        notes: document.getElementById('pNotes').value,
        allow_emails: splitCsv(document.getElementById('pEmails').value),
        allow_telegram_ids: splitCsv(document.getElementById('pTg').value),
        allow_discord_ids: splitCsv(document.getElementById('pDc').value),
        auto_reply: document.getElementById('pAuto').checked,
        facts: document.getElementById('pFacts').value.split('\\n').map(s => s.trim()).filter(Boolean),
        style_samples: samples,
      };
    }

    document.getElementById('savePerson').onclick = async () => {
      const id = document.getElementById('personId').value;
      const body = personPayload();
      const url = id ? '/api/people/' + id : '/api/people';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });
      const data = await res.json();
      toast('Saved person');
      await load();
      if (data.id) selectPerson(data.id);
    };

    document.getElementById('deletePerson').onclick = async () => {
      const id = document.getElementById('personId').value;
      if (!id) return;
      if (!confirm('Delete this person?')) return;
      await fetch('/api/people/' + id, { method: 'DELETE' });
      selectedId = null;
      document.getElementById('editor').style.display = 'none';
      toast('Deleted');
      await load();
    };

    load();
  </script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return DASHBOARD_HTML


def main() -> None:
    host = os.environ.get("DASHBOARD_HOST", "127.0.0.1")
    port = int(os.environ.get("DASHBOARD_PORT", "8787"))
    print(f"Dashboard http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
