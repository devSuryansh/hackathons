# Setup guide

Step-by-step instructions to run **Shadow Clone** on your machine with **your own** API keys and bots.

You will need:

- A [Caspian](https://www.trycaspianai.com/docs/) API key
- A [Featherless.ai](https://featherless.ai) API key (LLM replies)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

Never commit `.env`, bot tokens, or real chat logs.

---

## 1. Clone and create `.env`

```bash
git clone <this-repo-url>
cd shadow-clone
cp .env.example .env
```

Open `.env` and fill in values as you complete the steps below. All variable names are listed in [`.env.example`](.env.example).

---

## 2. Caspian API key

Mint a free sandbox key (no signup required for free channels):

```bash
curl -s -X POST https://api.trycaspianai.com/v1/projects/sandbox \
  -H 'Content-Type: application/json' -d '{"name":"shadow-clone"}'
```

Copy the returned `api_key` into `.env`:

```
CASPIAN_API_KEY=comm_sandbox_...
CASPIAN_BASE_URL=https://api.trycaspianai.com
```

Optional UI: https://dashboard.trycaspianai.com

Docs: https://www.trycaspianai.com/docs/  
Agent guide: https://api.trycaspianai.com/SKILL.md

---

## 3. Featherless.ai API key

1. Create an account at https://featherless.ai
2. Copy an API key from the dashboard
3. In `.env`:

```
FEATHERLESS_API_KEY=...
FEATHERLESS_MODEL=Qwen/Qwen2.5-7B-Instruct
```

Docs: https://featherless.ai/docs/overview

---

## 4. Telegram bot

1. In Telegram, open [@BotFather](https://t.me/BotFather)
2. Send `/newbot`, choose a display name and a username ending in `bot`
3. Paste the token into `.env` as `TELEGRAM_BOT_TOKEN=...`
4. Start the agent (step 7), message your bot once, and check the agent log for your username in `sender.address`
5. Set that username in `.env` (no `@`):

```
OWNER_TELEGRAM_USERNAME=your_telegram_username
```

Also enter the same value under **You** in the dashboard. For people the clone may talk to, add **their** Telegram usernames to each person's allowlist (Caspian sends usernames, not numeric ids).

---

## 5. Discord bot

1. Open https://discord.com/developers/applications → **New Application**
2. **Bot** → Reset Token → copy into `.env` as `DISCORD_BOT_TOKEN=...`
3. Under **Bot** → Privileged Gateway Intents, enable **Message Content Intent**
4. **OAuth2 → URL Generator**: scope `bot`; permissions at least Send Messages and Read Message History
5. Open the invite URL and add the bot to a server you control
6. Message the bot once; copy the username Caspian logs as `address` into:

```
OWNER_DISCORD_USERNAME=your_discord_username
```

Use the same username style in allowlists for counterparts.

---

## 6. Agent email address

Pick a mailbox name for the clone's Caspian inbox:

```
EMAIL_USERNAME=myclone
```

On first run this becomes something like `myclone@agents.trycaspianai.com`. If the name is taken (HTTP 409), try another name or use a suggestion from the API error.

---

## 7. Install and run

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Terminal A (dashboard):

```bash
python -m src.dashboard
```

Open http://127.0.0.1:8787

Terminal B (agent):

```bash
python -m src.agent
```

You should see email, Telegram, and Discord connected, then `listening…`.

---

## 8. Configure yourself and allowlists

In the dashboard:

1. Fill in **You** (name, bio, talking style, owner Telegram/Discord usernames, optional email)
2. Edit or replace the demo person **Sam**, or add a new person
3. For each person, set:
   - Relationship / how you met / notes / facts
   - Past chat samples (optional, for style)
   - **Allow emails** and **Telegram/Discord usernames** exactly as Caspian will log them
4. Leave **Auto-reply** on for people the clone should answer

Unknown senders get no reply. Only allowlisted people (and your owner commands) are handled.

---

## 9. Test that it works

With `python -m src.agent` still running:

**Email (Caspian test inject):**

```bash
set -a && source .env && set +a
curl -s -X POST https://api.trycaspianai.com/v1/test-emails \
  -H "Authorization: Bearer $CASPIAN_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"text":"hey, are you free later?"}'
curl -s "https://api.trycaspianai.com/v1/events?type=message.sent" \
  -H "Authorization: Bearer $CASPIAN_API_KEY"
```

A `message.sent` event means a reply went out. Real mail clients may put early replies in spam until the domain warms up.

**Telegram / Discord:** message the bot from an allowlisted username. The agent terminal should print `<- …` then `-> replied …`.

---

## 10. Owner commands

From your owner Telegram or Discord account (the usernames in `.env` / dashboard):

| Command | Effect |
|---------|--------|
| `/pause` | Stop auto-replies to counterparts |
| `/resume` | Start again |
| `/status` | Show paused flag and people count |

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| `silent (not_allowlisted …)` | Username in allowlist must match Caspian's `address` (case-insensitive, no `@`) |
| No Telegram/Discord events | Bot token, Message Content Intent (Discord), agent process still running |
| `FEATHERLESS_API_KEY missing` | Key in `.env`, restart agent after editing |
| Email 409 on connect | Change `EMAIL_USERNAME` |
| Gateway poll 500 | Transient Caspian issue; agent retries. Restart if stuck |

---

## Links

- Project overview: [README.md](README.md)
- Caspian docs: https://www.trycaspianai.com/docs/
- Caspian Discord: https://discord.com/invite/A28qnkvgCM
- Featherless docs: https://featherless.ai/docs/overview
