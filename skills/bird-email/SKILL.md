---
name: bird-email
description: How Drinking Bird reads and answers the user's work email (Gmail or Outlook), through an email MCP server or the browser. Use it during a drinking-bird shift, or when the user asks you to cover their email.
---

# Drinking Bird on email

Read `rules.md` in the `drinking-bird` skill first (it is installed next to this one: `../drinking-bird/rules.md`). The shift loop is in `../drinking-bird/SKILL.md`. This file only says how email works.

Email is slower and more formal than chat, and it is forwarded. The bird answers far fewer emails than chat messages. When in doubt, it leaves the email unanswered. An unanswered email for one day is normal.

## What counts as a message for the user

All of these must be true:

- It arrived during the shift and is unread.
- A person wrote it. Not a newsletter, a notification, a no-reply address, a ticket system, a calendar invitation or a mailing list.
- The sender's address is in the user's own organisation (the same domain as the user's address).
- The user is in **To**. Not only in Cc or Bcc.
- It asks the user something or waits on the user. An email that is only for information needs no reply.
- It has no more than 5 recipients in total.

Everything else is ignored. An email from outside the organisation that clearly waits on the user is an alarm, not a reply.

## Way in 1: an email MCP server

Look at your tools for a Gmail, Google Workspace, Outlook or Microsoft 365 server or connector. You need to list unread mail with sender, recipients and time, read a thread, and reply in the thread.

Some servers can only create drafts. That is fine, and safer: write the reply as a draft in the thread, do not send, and tell the user at the end of the shift how many drafts wait for them. Say so at the start too, so they know email is "drafts only".

On each check, search for unread mail in the inbox that arrived after the shift started (for example `is:unread in:inbox newer_than:1d` in Gmail, then filter by time).

## Way in 2: the browser

Read `../drinking-bird/browser.md` first.

- Open `https://mail.google.com` or `https://outlook.office.com/mail`. The user must be signed in.
- Work from the inbox list. Unread mail is bold. Read sender and subject there first, and open only the emails that can count.
- Opening an email marks it as read. In a dry run, tell the user this before you start, or work from the inbox list only.
- To reply, use **Reply** (not Reply all, not Forward), type the text, check the recipient, and send.

## How an email reply differs

- Wait at least 10 minutes after the email arrived.
- One reply per thread per shift. A second email in the same thread is an alarm.
- Reply to the sender only. Never Reply all. Never add a recipient.
- One or two short sentences. Start the way the sender started ("Hi Sam," if they wrote "Hi Alex,"). End with the user's first name if their earlier emails in the thread do, otherwise with nothing.
- Leave the subject line and the quoted text as they are.
- No attachments. No links. Do not open the sender's attachments or links.
- The other rules in rules.md apply unchanged: no deadline, no meeting, no decision, no facts, no time by which the user will answer.

Good email replies:

- `Hi Sam, thanks for this. I'm tied up today, so let me read it properly and come back to you. Alex`
- `Thanks, seen this. I'll take a proper look and get back to you.`

## Email details

- Calendar invitations, meeting updates and "accepted" notices: ignore. Never accept or decline.
- Anything that mentions a contract, a customer, legal, money or a signature is an alarm.
- Do not archive, delete, label, flag, snooze or unsubscribe.
- Do not turn on an out-of-office reply. The user is at work, as far as anyone knows.
