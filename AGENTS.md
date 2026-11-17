# Instructions for coding agents

A person asked you to set up Drinking Bird for them. It is a small Node program that answers their Slack messages while they are away. Follow these steps in order.

## 1. Install and check

```bash
npm install
npm test
npm run demo -- "hey, did you get a chance to look at the Q4 deck?"
```

The demo must print a line that starts with `would say:`. If it says no coding agent was found, set `DRINKING_BIRD_AGENT` in `.env` to the command for the agent you are (see `.env.example`), or use `DRINKING_BIRD_MODE=y`.

## 2. Slack tokens: the person does this part

You cannot create the Slack app. Ask the person to do it, and give them these exact steps:

1. Open https://api.slack.com/apps?new_app=1, choose **From a manifest**, pick the workspace, and paste the contents of `slack-manifest.json`.
2. **Basic Information → App-Level Tokens**: generate a token with the scope `connections:write`. It starts with `xapp-`.
3. **Install App**: install to the workspace. Copy the **User OAuth Token**. It starts with `xoxp-`.

Copy `.env.example` to `.env`. Ask the person to paste both tokens into `.env` themselves. Do not ask them to paste tokens into the chat, and do not print the contents of `.env`.

## 3. Ask how they write

Ask one question: "How do you usually write on Slack?" Put the answer in `DRINKING_BIRD_STYLE` in `.env`. Skip this if they do not care.

## 4. Dry run first

```bash
npm run dry-run
```

Ask the person to have a colleague, or a second account, send them a direct message. Show them the `would say:` line. Nothing is sent in a dry run.

## 5. Real run, only when the person says so

```bash
npm start
```

Start the real run only after the person has seen a dry-run reply and has said to go ahead. The real run posts messages as them.

## Rules for you

- Do not loosen the rules in `src/triage.ts` or the output checks in `src/brain.ts` unless the person asks for that change.
- Do not commit `.env`.
- The program must keep running in a terminal the person can see, so they notice an alarm.
