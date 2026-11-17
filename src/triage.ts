/**
 * Triage decides what the bird does with one Slack message.
 * It is a pure function so the rules are easy to read and test.
 */

export type ChannelType = "im" | "mpim" | "channel" | "group";

export interface IncomingMessage {
  channel: string;
  channelType: ChannelType;
  text: string;
  ts: string;
  user?: string;
  threadTs?: string;
  subtype?: string;
  botId?: string;
}

export interface TriageContext {
  /** Slack user ID of the person the bird is covering for. */
  selfId: string;
  /** How many times the bird already replied in this conversation in the last hour. */
  recentReplies: number;
  maxRepliesPerHour: number;
}

export type Verdict =
  | { action: "ignore"; reason: string }
  | { action: "alarm"; reason: string }
  | { action: "reply"; threadTs?: string };

/**
 * Messages that a bird must never answer. A human has to look at these.
 * In the source material the bird was left alone with a nuclear reactor.
 * We have learned from that.
 */
const MELTDOWN_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(urgent|urgently|asap|emergency|immediately|right now)\b/i, "sounds urgent"],
  [/\b(incident|outage|sev[ -]?[0-3]|p[01]|rollback|on fire|meltdown)\b/i, "sounds like an incident"],
  [/\b(prod|production|site|app|server|database|db)\b.{0,20}\b(down|broken|dead|dying|crash)/i, "something is down"],
  [/\b(call|ring|phone) me\b|\b(quick|jump on a|hop on a|join the) (call|huddle|zoom|meet)\b|\bhuddle\b/i, "someone wants a call"],
  [/\b(where are you|are you (there|around|awake|ok|okay|alive|coming|joining))\b/i, "someone is looking for you"],
  [/\b(are you|is this|am i talking to) (a |an )?(bot|ai|robot|real|automated|chatgpt|claude|bird)\b/i, "someone suspects the bird"],
  [/\b(gta|grand theft auto|rockstar|vice city|playstation|ps5|xbox|gaming|playing)\b/i, "someone knows what day it is"],
  [/\b(hr|disciplinary|fired|termination|redundan\w+|performance review|resign\w*)\b/i, "this one matters for your job"],
  [/\b(password|credentials?|api key|secret|token|2fa|otp|bank|invoice|payment|wire)\b/i, "asks for something sensitive"],
  [/\b(approve|approval|sign[- ]?off|sign this|lgtm\?|merge|deploy|ship it\?)\b/i, "asks for a decision"],
];

export function findMeltdown(text: string): string | undefined {
  for (const [pattern, reason] of MELTDOWN_PATTERNS) {
    if (pattern.test(text)) return reason;
  }
  return undefined;
}

export function mentions(text: string, userId: string): boolean {
  return text.includes(`<@${userId}>`);
}

export function triage(message: IncomingMessage, context: TriageContext): Verdict {
  if (message.botId) return { action: "ignore", reason: "from a bot" };
  if (message.subtype) return { action: "ignore", reason: `subtype ${message.subtype}` };
  if (!message.user) return { action: "ignore", reason: "no sender" };
  if (message.user === context.selfId) return { action: "ignore", reason: "from you" };
  if (!message.text.trim()) return { action: "ignore", reason: "no text" };

  const direct = message.channelType === "im";
  if (!direct && !mentions(message.text, context.selfId)) {
    return { action: "ignore", reason: "not addressed to you" };
  }

  const meltdown = findMeltdown(message.text);
  if (meltdown) return { action: "alarm", reason: meltdown };

  if (context.recentReplies >= context.maxRepliesPerHour) {
    return { action: "alarm", reason: "the bird has replied too often here and fell over" };
  }

  // In a DM the reply goes in the main conversation unless the message was in a thread.
  // In a channel the reply always goes in a thread, to keep the noise down.
  const threadTs = direct ? message.threadTs : (message.threadTs ?? message.ts);
  return threadTs ? { action: "reply", threadTs } : { action: "reply" };
}
