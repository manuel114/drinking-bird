# Instructions for coding agents

A person asked you to set up Drinking Bird for them. It is a small Node program that answers their Slack messages while they are away. Follow these steps in order.

## 1. Install and check

```bash
npm install
npm test
npm run demo -- "hey, did you get a chance to look at the Q4 deck?"
```

The demo must print a line that starts with `would say:`. If it says no coding agent was found, set `DRINKING_BIRD_AGENT` in `.env` to the command for the agent you are (see `.env.example`), or use `DRINKING_BIRD_MODE=y`.

## 2. Slack token: the person does this part

You cannot create the Slack app. Ask the person to do it, and give them these exact steps:

1. Open this link: https://api.slack.com/apps?new_app=1&manifest_json=%7B%22display_information%22%3A%7B%22name%22%3A%22Drinking%20Bird%22%2C%22description%22%3A%22Presses%20Y%20so%20you%20don%27t%20have%20to.%22%2C%22background_color%22%3A%22%23b3261e%22%7D%2C%22oauth_config%22%3A%7B%22scopes%22%3A%7B%22user%22%3A%5B%22chat%3Awrite%22%2C%22im%3Ahistory%22%2C%22im%3Aread%22%2C%22mpim%3Ahistory%22%2C%22mpim%3Aread%22%2C%22users%3Aread%22%5D%7D%7D%2C%22settings%22%3A%7B%22org_deploy_enabled%22%3Afalse%2C%22socket_mode_enabled%22%3Afalse%2C%22token_rotation_enabled%22%3Afalse%7D%7D
   It opens Slack's "create app" page with the settings filled in. Pick the workspace and click **Create**. If nothing is filled in, choose **Paste a manifest** and paste the contents of `slack-manifest.json`.
2. **Install App**: install to the workspace. Copy the **User OAuth Token**. It starts with `xoxp-`.

Copy `.env.example` to `.env`. Ask the person to paste the token into `.env` themselves, as `SLACK_USER_TOKEN`. Do not ask them to paste the token into the chat, and do not print the contents of `.env`.

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
