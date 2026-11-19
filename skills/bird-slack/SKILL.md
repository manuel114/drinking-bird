---
name: bird-slack
description: How Drinking Bird reads and answers the user's Slack direct messages, through a Slack MCP server or the browser. Use it during a drinking-bird shift, or when the user asks you to cover their Slack.
---

# Drinking Bird on Slack

Read `rules.md` in the `drinking-bird` skill first (it is installed next to this one: `../drinking-bird/rules.md`). The shift loop is in `../drinking-bird/SKILL.md`. This file only says how Slack works.

## What counts as a message for the user

- A **direct message** from a person.
- A message in a **group direct message** that @mentions the user.

Nothing else. The bird does not read channels, does not answer in channels, and does not answer threads in channels.

## Way in 1: a Slack MCP server

Look at your tools for a Slack server or connector. You need three things from it:

1. list or search the user's direct messages, with sender and time
2. read the last few messages of a conversation, for context
3. send a message **as the user**

Check the third one with care. Many Slack integrations post as a bot or an app with its own name. A reply from "Drinking Bird APP" ends the shift early. If you cannot tell from the tool's description whether it posts as the user, ask the user, or treat this server as read-only and use the browser to send.

On each check:

- Find direct messages newer than the last check. A search such as `to:me` limited to today, or a list of direct message conversations sorted by latest activity, both work.
- For each one, read the last 5 to 10 messages of the conversation. You need them to see whether the user already answered, and to avoid repeating yourself.
- Reply in the conversation itself. If the message was in a thread, reply in that thread.

## Way in 2: the browser

Read `../drinking-bird/browser.md` first.

- Open `https://app.slack.com/client`. The user must be signed in to the right workspace.
- Unread direct messages are bold in the **Direct messages** part of the sidebar, with a count badge. Use that list. Do not open channels.
- Open one unread conversation, read the last messages, and decide.
- To reply, click the message box at the bottom, type the reply, check it, and press Enter.
- In a dry run, do not type anything into the message box. Slack shows "typing…" to the other person.

## Slack details

- Mentions look like `<@U123ABC>` through the API and like `@name` in the browser. A reply never contains one.
- Slackbot, workflow messages, reminders and app messages are automated. Ignore them.
- A huddle invitation or a call is an alarm.
- Do not set the user's status, do not mark messages as unread, and do not react with emoji.
