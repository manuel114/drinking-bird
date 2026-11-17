import { SocketModeClient } from "@slack/socket-mode";
import { WebClient } from "@slack/web-api";
import type { Brain } from "./brain.ts";
import type { Config, SlackTokens } from "./config.ts";
import * as log from "./log.ts";
import type { HistoryLine } from "./prompt.ts";
import { triage, type ChannelType, type IncomingMessage } from "./triage.ts";

/** The fields of a Slack message event that the bird reads. */
interface SlackMessageEvent {
  channel: string;
  ts: string;
  channel_type?: string;
  user?: string;
  text?: string;
  thread_ts?: string;
  subtype?: string;
  bot_id?: string;
}

interface SocketEnvelope {
  event: SlackMessageEvent;
  ack: () => Promise<void>;
}

const HOUR_MS = 60 * 60 * 1000;
/** After you type in a conversation yourself, the bird leaves it alone for this long. */
const HUMAN_SNOOZE_MS = 15 * 60 * 1000;
const HISTORY_LINES = 8;

function toChannelType(value: string | undefined): ChannelType {
  return value === "im" || value === "mpim" || value === "group" ? value : "channel";
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export async function startBird(tokens: SlackTokens, config: Config, brain: Brain): Promise<void> {
  const web = new WebClient(tokens.userToken);
  const socket = new SocketModeClient({ appToken: tokens.appToken });

  const auth = await web.auth.test();
  const selfId = auth.user_id;
  if (!selfId) throw new Error("Slack did not say who this token belongs to.");

  const names = new Map<string, string>();
  const pending = new Map<string, NodeJS.Timeout>();
  const replyTimes = new Map<string, number[]>();
  const snoozedUntil = new Map<string, number>();
  /** Messages the bird posted, so it can tell them apart from messages you typed. */
  const birdPosts = new Set<string>();

  async function nameOf(userId: string): Promise<string> {
    const cached = names.get(userId);
    if (cached) return cached;
    let name = userId;
    try {
      const response = await web.users.info({ user: userId });
      name = response.user?.profile?.display_name || response.user?.real_name || userId;
    } catch {
      // Without a name the user ID still works in the log and the prompt.
    }
    names.set(userId, name);
    return name;
  }

  function recentReplies(channel: string): number {
    const cutoff = Date.now() - HOUR_MS;
    const times = (replyTimes.get(channel) ?? []).filter((time) => time > cutoff);
    replyTimes.set(channel, times);
    return times.length;
  }

  async function readHistory(channel: string, threadTs: string | undefined): Promise<HistoryLine[]> {
    try {
      const response = threadTs
        ? await web.conversations.replies({ channel, ts: threadTs, limit: HISTORY_LINES })
        : await web.conversations.history({ channel, limit: HISTORY_LINES });
      const messages = [...(response.messages ?? [])];
      // History comes newest first. Thread replies come oldest first.
      if (!threadTs) messages.reverse();
      const lines: HistoryLine[] = [];
      for (const message of messages.slice(0, -1)) {
        if (!message.text || !message.user) continue;
        const speaker = message.user === selfId ? "me" : await nameOf(message.user);
        lines.push({ speaker, text: message.text });
      }
      return lines;
    } catch {
      return [];
    }
  }

  async function answer(message: IncomingMessage, threadTs: string | undefined): Promise<void> {
    pending.delete(message.channel);
    const sender = await nameOf(message.user ?? "someone");
    const history = await readHistory(message.channel, threadTs);
    const result = await brain.reply({ senderName: sender, message: message.text, history, style: config.style });

    if (result.kind === "escalate") {
      log.alarm(sender, message.text, result.reason);
      return;
    }
    // You may have come back while the agent was thinking.
    if ((snoozedUntil.get(message.channel) ?? 0) > Date.now()) {
      log.skip(`${sender}: you answered this one yourself`);
      return;
    }
    if (!config.dryRun) {
      birdPosts.add(`${message.channel}:${result.text}`);
      await web.chat.postMessage({ channel: message.channel, text: result.text, thread_ts: threadTs });
    }
    replyTimes.set(message.channel, [...(replyTimes.get(message.channel) ?? []), Date.now()]);
    log.dip(sender, message.text, result.text, config.dryRun);
  }

  socket.on("message", async ({ event, ack }: SocketEnvelope) => {
    await ack();
    const message: IncomingMessage = {
      channel: event.channel,
      channelType: toChannelType(event.channel_type),
      text: event.text ?? "",
      ts: event.ts,
      user: event.user,
      threadTs: event.thread_ts,
      subtype: event.subtype,
      botId: event.bot_id,
    };

    // A message from you that the bird did not post means you are at your desk.
    if (message.user === selfId && !message.subtype) {
      if (birdPosts.delete(`${message.channel}:${message.text}`)) return;
      const timer = pending.get(message.channel);
      if (timer) clearTimeout(timer);
      pending.delete(message.channel);
      snoozedUntil.set(message.channel, Date.now() + HUMAN_SNOOZE_MS);
      log.skip("you typed something yourself. The bird leaves that conversation alone for 15 minutes");
      return;
    }

    const verdict = triage(message, {
      selfId,
      recentReplies: recentReplies(message.channel),
      maxRepliesPerHour: config.maxRepliesPerHour,
    });
    if (verdict.action === "ignore") return;

    const sender = await nameOf(message.user ?? "someone");
    if (verdict.action === "alarm") {
      log.alarm(sender, message.text, verdict.reason);
      return;
    }
    if ((snoozedUntil.get(message.channel) ?? 0) > Date.now()) {
      log.skip(`${sender}: you were just in this conversation`);
      return;
    }

    // If several messages arrive in a row, the bird answers only the last one.
    const earlier = pending.get(message.channel);
    if (earlier) clearTimeout(earlier);
    const delayMs = randomBetween(config.delaySeconds.min, config.delaySeconds.max) * 1000;
    log.info(`${sender} wrote. The bird dips in ${Math.round(delayMs / 1000)}s`);
    pending.set(
      message.channel,
      setTimeout(() => {
        answer(message, verdict.threadTs).catch((error: Error) => log.alarm(sender, message.text, error.message));
      }, delayMs),
    );
  });

  await socket.start();
  log.info(`The bird covers for ${auth.user ?? selfId} in ${auth.team ?? "your workspace"}.`);
  log.info(`Brain: ${brain.name}. Shift: ${config.hours}h.${config.dryRun ? " Dry run: nothing is sent." : ""}`);

  const shiftEnd = setTimeout(() => {
    log.info("Shift over. The bird stopped drinking.");
    void socket.disconnect().then(() => process.exit(0));
  }, config.hours * HOUR_MS);
  shiftEnd.unref();

  process.on("SIGINT", () => {
    log.info("The bird stopped drinking. Welcome back.");
    void socket.disconnect().then(() => process.exit(0));
  });
}
