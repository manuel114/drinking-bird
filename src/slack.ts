import { WebClient } from "@slack/web-api";
import type { Brain } from "./brain.ts";
import type { Config } from "./config.ts";
import * as log from "./log.ts";
import type { HistoryLine } from "./prompt.ts";
import { triage, type ChannelType, type IncomingMessage } from "./triage.ts";

/**
 * The bird has no real-time connection to Slack. It asks Slack for new messages
 * in your direct messages and group messages, one conversation at a time.
 * That needs one token and no extra Slack setup, and the bird waits before
 * it answers anyway.
 */
interface Conversation {
  id: string;
  type: ChannelType;
  /** Timestamp of the newest message the bird has seen here. */
  cursor: string;
  /** Busy conversations are checked on every pass. Quiet ones take turns. */
  hot: boolean;
  visited: boolean;
}

const HOUR_MS = 60 * 60 * 1000;
/** After you type in a conversation yourself, the bird leaves it alone for this long. */
const HUMAN_SNOOZE_MS = 15 * 60 * 1000;
const HISTORY_LINES = 8;
/** Slack allows about 50 history calls a minute. The bird stays well under that. */
const CALL_GAP_MS = 1500;
const MIN_PASS_MS = 15 * 1000;
const CALLS_PER_PASS = 20;
const LIST_REFRESH_MS = 5 * 60 * 1000;
/** A conversation with a message in the last three days counts as busy. */
const HOT_WINDOW_S = 3 * 24 * 60 * 60;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export async function startBird(userToken: string, config: Config, brain: Brain): Promise<void> {
  const web = new WebClient(userToken);

  const auth = await web.auth.test();
  const selfId = auth.user_id;
  if (!selfId) throw new Error("Slack did not say who this token belongs to.");

  const names = new Map<string, string>();
  const pending = new Map<string, NodeJS.Timeout>();
  const replyTimes = new Map<string, number[]>();
  const snoozedUntil = new Map<string, number>();
  /** Timestamps of messages the bird posted, so it can tell them apart from messages you typed. */
  const birdPosts = new Set<string>();
  const conversations = new Map<string, Conversation>();
  const startTs = (Date.now() / 1000).toFixed(6);
  let running = true;

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
      const posted = await web.chat.postMessage({ channel: message.channel, text: result.text, thread_ts: threadTs });
      if (posted.ts) birdPosts.add(posted.ts);
    }
    replyTimes.set(message.channel, [...(replyTimes.get(message.channel) ?? []), Date.now()]);
    log.dip(sender, message.text, result.text, config.dryRun);
  }

  async function handle(message: IncomingMessage): Promise<void> {
    // A message from you that the bird did not post means you are at your desk.
    if (message.user === selfId && !message.subtype) {
      if (birdPosts.delete(message.ts)) return;
      const timer = pending.get(message.channel);
      if (timer) clearTimeout(timer);
      pending.delete(message.channel);
      snoozedUntil.set(message.channel, Date.now() + HUMAN_SNOOZE_MS);
      log.skip("you typed something yourself. The bird leaves that conversation alone for 15 minutes");
      return;
    }

    const verdict = triage(message, {
      selfId: selfId!,
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
  }

  /** Finds your direct messages and group messages, including ones opened after the bird started. */
  async function refreshConversations(): Promise<void> {
    let cursor: string | undefined;
    do {
      const page = await web.users.conversations({ types: "im,mpim", exclude_archived: true, limit: 200, cursor });
      for (const channel of page.channels ?? []) {
        if (!channel.id || conversations.has(channel.id)) continue;
        conversations.set(channel.id, {
          id: channel.id,
          type: channel.is_mpim ? "mpim" : "im",
          cursor: startTs,
          hot: false,
          visited: false,
        });
      }
      cursor = page.response_metadata?.next_cursor || undefined;
    } while (cursor);
  }

  /** Reads what is new in one conversation and hands each new message to the bird. */
  async function check(conversation: Conversation): Promise<void> {
    // The first visit looks at the latest messages to learn whether the conversation is busy.
    const response = conversation.visited
      ? await web.conversations.history({ channel: conversation.id, oldest: conversation.cursor, limit: 15 })
      : await web.conversations.history({ channel: conversation.id, limit: 5 });
    conversation.visited = true;
    const messages = [...(response.messages ?? [])].reverse();
    const newest = messages.at(-1)?.ts;
    if (newest && Number(newest) > Date.now() / 1000 - HOT_WINDOW_S) conversation.hot = true;

    for (const raw of messages) {
      if (!raw.ts || Number(raw.ts) <= Number(conversation.cursor)) continue;
      conversation.cursor = raw.ts;
      await handle({
        channel: conversation.id,
        channelType: conversation.type,
        text: raw.text ?? "",
        ts: raw.ts,
        user: raw.user,
        threadTs: raw.thread_ts === raw.ts ? undefined : raw.thread_ts,
        subtype: raw.subtype,
        botId: raw.bot_id,
      });
    }
  }

  async function poll(): Promise<void> {
    let lastRefresh = 0;
    let coldIndex = 0;
    while (running) {
      const passStart = Date.now();
      try {
        if (passStart - lastRefresh > LIST_REFRESH_MS) {
          await refreshConversations();
          lastRefresh = passStart;
        }
        const all = [...conversations.values()];
        const hot = all.filter((conversation) => conversation.hot);
        const cold = all.filter((conversation) => !conversation.hot);
        const coldTurns = Math.min(cold.length, Math.max(5, CALLS_PER_PASS - hot.length));
        const batch = [...hot];
        for (let turn = 0; turn < coldTurns; turn++) batch.push(cold[(coldIndex + turn) % cold.length]!);
        coldIndex = cold.length ? (coldIndex + coldTurns) % cold.length : 0;

        for (const conversation of batch) {
          if (!running) return;
          await check(conversation);
          await sleep(CALL_GAP_MS);
        }
      } catch (error) {
        log.info(`Slack did not answer (${(error as Error).message}). The bird tries again.`);
      }
      await sleep(Math.max(0, MIN_PASS_MS - (Date.now() - passStart)));
    }
  }

  await refreshConversations();
  log.info(`The bird covers for ${auth.user ?? selfId} in ${auth.team ?? "your workspace"}.`);
  log.info(`Watching ${conversations.size} direct and group conversations. Channels are left alone.`);
  log.info(`Brain: ${brain.name}. Shift: ${config.hours}h.${config.dryRun ? " Dry run: nothing is sent." : ""}`);

  function stop(farewell: string): void {
    running = false;
    for (const timer of pending.values()) clearTimeout(timer);
    log.info(farewell);
    process.exit(0);
  }

  const shiftEnd = setTimeout(() => stop("Shift over. The bird stopped drinking."), config.hours * HOUR_MS);
  shiftEnd.unref();
  process.on("SIGINT", () => stop("The bird stopped drinking. Welcome back."));

  await poll();
}
