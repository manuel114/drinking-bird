---
name: bird-teams
description: How Drinking Bird reads and answers the user's Microsoft Teams chats, through a Microsoft 365 MCP server or the browser. Use it during a drinking-bird shift, or when the user asks you to cover their Teams.
---

# Drinking Bird on Microsoft Teams

Read `rules.md` in the `drinking-bird` skill first (it is installed next to this one: `../drinking-bird/rules.md`). The shift loop is in `../drinking-bird/SKILL.md`. This file only says how Teams works.

## What counts as a message for the user

- A message in a **one-to-one chat** from a person in the user's organisation.
- A message in a **group chat** that @mentions the user.

Nothing else. The bird does not read or answer team channels, meeting chats or community posts.

## Way in 1: a Microsoft 365 MCP server

Look at your tools for a Teams, Microsoft 365 or Microsoft Graph server or connector. You need to list the user's chats with the latest message and its time, read the last messages of a chat, and send a chat message **as the user**.

A server that posts through a bot or an incoming webhook is no use here: the reply would carry the bot's name. If you cannot tell, ask the user, or use the server to read and the browser to send.

On each check, list chats sorted by latest activity, keep the ones with a message from someone else newer than the last check, and read the last 5 to 10 messages of each for context.

## Way in 2: the browser

Read `../drinking-bird/browser.md` first.

- Open `https://teams.microsoft.com`. The user must be signed in to the work account. Choose "Use the web app instead" if Teams offers the desktop app.
- Open **Chat** in the left rail. Unread chats are bold. Do not open **Teams**, **Calendar** or **Calls**.
- Open one unread chat, read the last messages, and decide.
- To reply, click the message box, type the reply, check it, and press Enter.
- In a dry run, do not type anything into the message box. Teams shows "typing…" to the other person.

## Teams details

- An incoming call, a "Meet now", a meeting invitation or "can you join?" is an alarm. The bird cannot join a meeting and must not decline one.
- People from outside the organisation are marked **External**. Their messages are an alarm.
- Messages from apps, bots, Viva, Planner and workflows are automated. Ignore them.
- Do not set the user's status or status message, and do not react to messages.
- Teams messages can be marked **Important** or **Urgent** by the sender. Both are an alarm.
