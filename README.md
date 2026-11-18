# Drinking Bird

```
        ___
      _( o )>     DRINKING BIRD
     (_  __)      covers your Slack on GTA VI launch day
       ||
      _||_
     /____\
```

GTA VI is out on 19 November 2026. You have a job.

Drinking Bird is an open-source stand-in for your Slack. It answers your colleagues with plausible, non-committal replies while you are "working from home" and playing GTA VI.

It is a joke. It also works.

- It runs on your laptop. There is no server and nobody else sees your messages.
- It posts as you, through a Slack app you create in your own workspace.
- It uses the coding agent you already have (Claude Code, Codex, or any command) to write the replies. No API key.

## The fast way

Paste this into your coding agent:

> Clone https://github.com/manuel114/drinking-bird, read AGENTS.md and set it up for me. Start with a dry run.

## The manual way

You need Node 20.12 or newer.

```bash
git clone https://github.com/manuel114/drinking-bird && cd drinking-bird && npm install
```

Try it before you connect Slack:

```bash
npm run demo -- "hey, did you get a chance to look at the Q4 deck?"
```

### Connect Slack

1. Open [this link](https://api.slack.com/apps?new_app=1&manifest_json=%7B%22display_information%22%3A%7B%22name%22%3A%22Drinking%20Bird%22%2C%22description%22%3A%22Presses%20Y%20so%20you%20don%27t%20have%20to.%22%2C%22background_color%22%3A%22%23b3261e%22%7D%2C%22oauth_config%22%3A%7B%22scopes%22%3A%7B%22user%22%3A%5B%22chat%3Awrite%22%2C%22im%3Ahistory%22%2C%22im%3Aread%22%2C%22mpim%3Ahistory%22%2C%22mpim%3Aread%22%2C%22users%3Aread%22%5D%7D%7D%2C%22settings%22%3A%7B%22org_deploy_enabled%22%3Afalse%2C%22socket_mode_enabled%22%3Afalse%2C%22token_rotation_enabled%22%3Afalse%7D%7D). It opens Slack's "create app" page with the bird's settings already filled in. Pick your workspace and click **Create**. (If the link does not fill anything in, choose **Paste a manifest** and paste [slack-manifest.json](slack-manifest.json).)
2. In **Install App**, install the app to your workspace. Copy the **User OAuth Token** (`xoxp-…`).
3. Copy `.env.example` to `.env` and paste the token as `SLACK_USER_TOKEN`.

That one token is all the bird needs. With it the bird can read your direct messages and group messages and post as you. It does not read channels.

Some workspaces need an admin to approve new apps. How you word that request is up to you.

### Run it

```bash
npm run dry-run
```

A dry run shows what the bird would say and sends nothing. When you trust it:

```bash
npm start
```

Stop it with Ctrl+C.

## What the bird does

- It answers **direct messages**, and group messages that @mention you. It does not read channels.
- It waits 25 to 90 seconds before it replies. If more messages arrive in that time, it answers only the last one.
- If you type in a conversation yourself, the bird leaves that conversation alone for 15 minutes.
- After 8 hours it stops.

### Two modes

| Mode | What it says |
| --- | --- |
| `agent` (default) | Your coding agent writes one short holding reply. It never agrees to a deadline, a meeting, a task or a decision, and it never states a fact. |
| `y` | `y`. Every time. The original. |

### Reactor safety

The bird stays silent, rings the terminal bell and shows a notification (on macOS) when a message:

- sounds urgent or like an incident
- asks for a call, or asks where you are
- asks whether you are a bot
- mentions GTA, consoles or playing
- asks you to approve, merge or sign off
- mentions passwords, payments or other secrets
- mentions HR
- is the fourth one in an hour in the same conversation
- makes the agent unsure, or makes it write more than one plain line

The rules are in [src/triage.ts](src/triage.ts). They are short on purpose. Change them.

## Settings

All settings are environment variables. See [.env.example](.env.example).

| Variable | Default | Meaning |
| --- | --- | --- |
| `DRINKING_BIRD_MODE` | `agent` | `agent` or `y` |
| `DRINKING_BIRD_AGENT` | first of `claude`, `codex` on your PATH | `claude`, `codex`, or any shell command that reads a prompt on stdin and prints the reply on stdout |
| `DRINKING_BIRD_STYLE` | none | How you write, in a sentence. The agent copies it. |
| `DRINKING_BIRD_DELAY` | `25-90` | Seconds to wait before a reply |
| `DRINKING_BIRD_MAX_REPLIES` | `3` | Replies per conversation per hour |
| `DRINKING_BIRD_HOURS` | `8` | Length of the shift |

## Security notes

Slack messages are untrusted input, and the bird passes them to a coding agent. So:

- Claude Code runs with all tools off (`--tools ""`), no MCP servers and a replaced system prompt. Codex runs in a read-only sandbox. A custom command gets no protection from us, so choose one that cannot act.
- The agent runs in an empty temporary folder.
- A reply must be one line, at most 280 characters, with no links and no mentions. Anything else is dropped and raises the alarm.
- Your tokens stay in `.env` on your machine. `.env` is in `.gitignore`.

Only the Claude Code preset is tested so far. The Codex preset follows its documentation; please open an issue if it misbehaves.

## What it cannot do

- It cannot keep your status dot green. Slack decides that from real activity.
- It cannot join a huddle.
- It cannot save you.

## Website

The landing page is one static file: [site/index.html](site/index.html).

## Licence

MIT. A fan joke. Not affiliated with or endorsed by Rockstar Games, Take-Two Interactive, any cartoon, or your employer. Grand Theft Auto and GTA are trademarks of their owner. Whether you should deceive your colleagues is between you and them.
