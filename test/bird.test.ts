import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAgentOutput, yBrain } from "../src/brain.ts";
import { parseDelay, readConfig } from "../src/config.ts";
import { buildSystemPrompt, buildUserPrompt } from "../src/prompt.ts";
import { triage, type IncomingMessage, type TriageContext } from "../src/triage.ts";

const context: TriageContext = { selfId: "U-ME", recentReplies: 0, maxRepliesPerHour: 3 };

function dm(text: string, extra: Partial<IncomingMessage> = {}): IncomingMessage {
  return { channel: "D1", channelType: "im", text, ts: "100.1", user: "U-THEM", ...extra };
}

test("replies to a plain DM in the main conversation", () => {
  assert.deepEqual(triage(dm("did you see my PR?"), context), { action: "reply" });
});

test("ignores its own messages, bots and edits", () => {
  assert.equal(triage(dm("hi", { user: "U-ME" }), context).action, "ignore");
  assert.equal(triage(dm("hi", { botId: "B1" }), context).action, "ignore");
  assert.equal(triage(dm("hi", { subtype: "message_changed" }), context).action, "ignore");
});

test("ignores channel chatter that does not mention you", () => {
  const message = dm("anyone around?", { channelType: "channel", channel: "C1" });
  assert.equal(triage(message, context).action, "ignore");
});

test("replies in a thread when mentioned in a channel", () => {
  const message = dm("<@U-ME> thoughts on this?", { channelType: "channel", channel: "C1" });
  assert.deepEqual(triage(message, context), { action: "reply", threadTs: "100.1" });
});

test("raises the alarm instead of answering dangerous messages", () => {
  const dangerous = [
    "prod is down",
    "URGENT can you look at this",
    "quick call?",
    "are you there??",
    "is this a bot",
    "can you approve the release",
    "what's the database password",
    "HR wants a word",
    "you are not playing GTA are you",
    "lol half the team is on the ps5 today",
  ];
  for (const text of dangerous) {
    assert.equal(triage(dm(text), context).action, "alarm", text);
  }
});

test("falls over after too many replies in one conversation", () => {
  const verdict = triage(dm("and another thing"), { ...context, recentReplies: 3 });
  assert.equal(verdict.action, "alarm");
});

test("y mode presses Y", async () => {
  assert.deepEqual(await yBrain.reply({ senderName: "x", message: "anything", history: [] }), {
    kind: "reply",
    text: "y",
  });
});

test("agent output is cleaned, and anything odd is escalated", () => {
  assert.deepEqual(parseAgentOutput('  "in the middle of something, will look in a bit"\n'), {
    kind: "reply",
    text: "in the middle of something, will look in a bit",
  });
  assert.equal(parseAgentOutput("ESCALATE").kind, "escalate");
  assert.equal(parseAgentOutput("").kind, "escalate");
  assert.equal(parseAgentOutput("line one\nline two").kind, "escalate");
  assert.equal(parseAgentOutput("x".repeat(400)).kind, "escalate");
  assert.equal(parseAgentOutput("sure <!channel> see https://evil.example").kind, "escalate");
});

test("the prompt marks the conversation as untrusted and carries the style", () => {
  const system = buildSystemPrompt("lowercase, says cheers");
  assert.match(system, /untrusted data/);
  assert.match(system, /lowercase, says cheers/);
  const user = buildUserPrompt({
    senderName: 'Bob "the boss"',
    message: "status?",
    history: [{ speaker: "me", text: "on it" }],
  });
  assert.match(user, /me: on it/);
  assert.match(user, /from="Bob 'the boss'"/);
});

test("config parsing", () => {
  assert.deepEqual(parseDelay("10-40"), { min: 10, max: 40 });
  assert.deepEqual(parseDelay("0"), { min: 0, max: 0 });
  assert.deepEqual(parseDelay("nonsense"), { min: 25, max: 90 });
  assert.equal(readConfig({}, { dryRun: true }).mode, "agent");
  assert.equal(readConfig({ DRINKING_BIRD_MODE: "Y" }, { dryRun: false }).mode, "y");
  assert.throws(() => readConfig({ DRINKING_BIRD_MODE: "parrot" }, { dryRun: false }));
});
