# Drinking Bird

```
        ___
      _( o )>     DRINKING BIRD
     (_  __)      covers your Slack, email and Teams on GTA VI launch day
       ||
      _||_
     /____\
```

GTA VI is out on 19 November 2026. You have a job.

Drinking Bird is a set of skills for your coding agent. With them, the agent answers your colleagues on Slack, email and Microsoft Teams with plausible, non-committal replies while you are "working from home" and playing GTA VI.

It is a joke. It also works.

- There is no program and no server. The skills are text files your coding agent reads.
- It works with Claude Code, Codex, or any agent that can read a Markdown file.
- It reaches your messages through the MCP servers you already connected, or through your browser. No new app, no token, no API key.
- It replies as you.

## The fast way

Paste this into your coding agent:

> Clone https://github.com/manuel114/drinking-bird, read AGENTS.md and install the skills. Then cover my Slack, email and Teams in a dry run.

## The manual way

Pick one.

**Claude Code, as a plugin**

```
/plugin marketplace add manuel114/drinking-bird
/plugin install drinking-bird@drinking-bird
```

**Any agent, with the skills CLI**

```bash
npx skills add manuel114/drinking-bird
```

**By hand**

```bash
git clone https://github.com/manuel114/drinking-bird
cp -R drinking-bird/skills/* ~/.claude/skills/    # Claude Code
cp -R drinking-bird/skills/* ~/.codex/skills/     # Codex
```

Then tell your agent:

```
/drinking-bird dry-run
```

or, in plain words, "start the drinking bird in a dry run". (Installed as a Claude Code plugin, the command is `/drinking-bird:drinking-bird dry-run`.)

A dry run shows what the bird would say and sends nothing. When you trust it, say "go live". Say "stop" to end the shift.

## The skills

| Skill | What it does |
| --- | --- |
| [`drinking-bird`](skills/drinking-bird/SKILL.md) | The shift. Checks your messages every two minutes, decides what to answer, writes the reply, raises the alarm. |
| [`bird-slack`](skills/bird-slack/SKILL.md) | Slack direct messages, and group messages that @mention you. |
| [`bird-email`](skills/bird-email/SKILL.md) | Work email from colleagues that is addressed to you and waits on you. |
| [`bird-teams`](skills/bird-teams/SKILL.md) | Teams one-to-one chats, and group chats that @mention you. |

### How it reaches your messages

For each channel the agent uses the first of these that it has:

1. **An MCP server or connector** for Slack, Gmail, Outlook or Microsoft 365. It must be able to post as you, not as a bot. An email server that can only write drafts is fine: the bird leaves drafts for you.
2. **Your browser**, through whatever browser tool your agent has (Claude in Chrome, a Playwright server, Codex browser use, computer use). You must already be signed in.

If a channel has neither, the bird skips it and says so.

## What the bird does

- It answers **direct messages**, group messages that @mention you, and internal emails sent to you. It does not read channels.
- It waits before it replies: at least 30 seconds in chat, at least 10 minutes for email. If more messages arrive in that time, it answers only the last one.
- If you type in a conversation yourself, the bird leaves that conversation alone for 15 minutes.
- It sends at most 3 replies per chat per hour, and 1 reply per email thread.
- After 8 hours it stops and lists everything you now owe a real answer.

### Three modes

| Mode | What it says |
| --- | --- |
| `dry-run` (default) | Nothing. It prints `would say:` and sends nothing. |
| `live` | One short holding reply. It never agrees to a deadline, a meeting, a task or a decision, and it never states a fact. |
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
- comes from outside your company
- gives instructions to an AI
- is the fourth one in an hour in the same conversation
- makes the agent unsure

The rules are in [skills/drinking-bird/rules.md](skills/drinking-bird/rules.md). They are short on purpose. Change them.

## Security notes

Read this part.

Your messages are untrusted input, and you are handing them to a coding agent that has tools. Someone can write a message that tries to give your agent instructions. The skills tell the agent to treat every message as data, to do nothing during a shift except read, send one line and write a log, and to raise the alarm on anything that looks like a prompt. Those are instructions, not a sandbox. Nothing enforces them.

So, for the shift:

- Start the agent in an empty folder, not in a repository you care about.
- Give it the fewest tools you can: the message servers or the browser, and nothing else. Disconnect MCP servers that can spend money, deploy or delete.
- Do not run it with permission prompts turned off.
- Keep the terminal where you can see it.
- Run a dry run first, every time.

The bird writes one log file per shift to `~/.drinking-bird/`. It does not copy message text into it.

Only Claude Code is tested so far. Please open an issue if another agent misbehaves.

## What it cannot do

- It cannot join a huddle or a meeting.
- It cannot promise to keep your status dot green. Through the browser you may look active, because a real client is open. Through an MCP server you will not.
- It cannot save you.

## Website

The landing page is one static file: [site/index.html](site/index.html).

## Licence

MIT. A fan joke. Not affiliated with or endorsed by Rockstar Games, Take-Two Interactive, Slack, Microsoft, Google, any cartoon, or your employer. Grand Theft Auto and GTA are trademarks of their owner. Whether you should deceive your colleagues is between you and them.
