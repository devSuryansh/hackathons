# Shadow Clone

**Your digital twin on Caspian.** It talks as you to people you allowlist (friends, colleagues, customers). Same voice across email, Telegram, and Discord, with one `on_message` handler.

Built with [caspian-sdk](https://github.com/TryCaspian/caspian-sdk). Inference via [Featherless.ai](https://featherless.ai).

> Caspian cannot log into your personal WhatsApp/Gmail/Discord account. Counterparts message the clone's Caspian email and bots. Replies sound like you.

**Bring your own keys.** This repo ships empty placeholders in [`.env.example`](.env.example) only. Never commit `.env`, API keys, bot tokens, or real chat logs.

## Setup

Follow the full step-by-step guide:

**→ [GUIDE.md](GUIDE.md)** (Caspian key, Featherless, Telegram, Discord, dashboard, testing)

Short version once keys are in `.env`:

```bash
cp .env.example .env
# edit .env with YOUR keys — see GUIDE.md

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python -m src.dashboard   # http://127.0.0.1:8787
python -m src.agent       # listen on connected channels
```

## How it works

```
Allowlisted person ──► Caspian email / Telegram bot / Discord bot
                              │
                              ▼
                     one on_message handler
                              │
              allowlist + pause gate (src/clone.py)
                              │
              persona prompt (you + dossier + style)
                              │
                     Featherless LLM
                              │
                        message.reply()
```

| Piece | Role |
|-------|------|
| `src/agent.py` | Connects channels, single handler |
| `src/clone.py` | Allowlist, `/pause` `/resume` `/status`, prompts |
| `src/store.py` | SQLite personas + memory (`data/clone.db`, gitignored) |
| `src/llm.py` | Featherless OpenAI-compatible client |
| `src/dashboard.py` | Local UI for you + people |
| `data/examples/sam.md` | Fictional demo dossier |

### Stack notes

- **caspian-sdk** for transport (no discord.py / python-telegram-bot)
- **One** `@client.on_message` for email + Telegram + Discord
- Telegram/Discord allowlists use **usernames** (`sender.address`), not numeric ids

## Owner controls

From your owner Telegram/Discord username (see [GUIDE.md](GUIDE.md)):

- `/pause` — stop auto-replies
- `/resume` — start again
- `/status` — paused flag + people count

## Tests

```bash
source .venv/bin/activate
python -m unittest tests.test_clone -v
```

## License / contributing

Use your own credentials. Keep real dossiers and chats out of git.
