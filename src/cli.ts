#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createAgentBrain, yBrain, type Brain } from "./brain.ts";
import { loadEnvFile, readConfig, readSlackTokens, type Config } from "./config.ts";
import * as log from "./log.ts";
import { triage } from "./triage.ts";

const HELP = `Usage:
  drinking-bird start [--dry-run] [--mode agent|y] [--hours 8]
      Cover for you in Slack. --dry-run shows replies but sends nothing.

  drinking-bird demo "hey, did you see my PR?" [--mode agent|y]
      Show what the bird does with one message. Needs no Slack tokens.
`;

function pickBrain(config: Config): Brain {
  return config.mode === "y" ? yBrain : createAgentBrain(config.agent, config.style);
}

async function demo(text: string, config: Config): Promise<void> {
  const verdict = triage(
    { channel: "D-DEMO", channelType: "im", text, ts: "1", user: "U-COLLEAGUE" },
    { selfId: "U-YOU", recentReplies: 0, maxRepliesPerHour: config.maxRepliesPerHour },
  );
  if (verdict.action === "alarm") {
    log.alarm("colleague", text, verdict.reason);
    return;
  }
  if (verdict.action === "ignore") {
    log.skip(verdict.reason);
    return;
  }
  const brain = pickBrain(config);
  const result = await brain.reply({ senderName: "colleague", message: text, history: [], style: config.style });
  if (result.kind === "escalate") log.alarm("colleague", text, result.reason);
  else log.dip("colleague", text, result.text, true);
}

async function main(): Promise<void> {
  loadEnvFile();
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      mode: { type: "string" },
      hours: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const command = positionals[0] ?? "start";
  if (values.help || !["start", "demo"].includes(command)) {
    console.log(HELP);
    return;
  }

  const config = readConfig(process.env, { dryRun: values["dry-run"], mode: values.mode, hours: values.hours });

  if (command === "demo") {
    const text = positionals.slice(1).join(" ");
    if (!text) {
      console.log(HELP);
      return;
    }
    await demo(text, config);
    return;
  }

  console.log(log.BANNER);
  const tokens = readSlackTokens(process.env);
  // Import Slack only for a real run, so the demo starts fast.
  const { startBird } = await import("./slack.ts");
  await startBird(tokens, config, pickBrain(config));
}

main().catch((error: Error) => {
  console.error(`\nThe bird fell over: ${error.message}`);
  process.exit(1);
});
