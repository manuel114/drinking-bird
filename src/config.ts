export type Mode = "agent" | "y";

export interface Config {
  mode: Mode;
  agent?: string;
  style?: string;
  delaySeconds: { min: number; max: number };
  maxRepliesPerHour: number;
  hours: number;
  dryRun: boolean;
}

export function loadEnvFile(): void {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file. Plain environment variables work too.
  }
}

export function parseDelay(value: string | undefined): { min: number; max: number } {
  const match = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(value ?? "");
  if (!match) return { min: 25, max: 90 };
  const min = Number(match[1]);
  const max = match[2] === undefined ? min : Number(match[2]);
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readConfig(env: NodeJS.ProcessEnv, flags: { dryRun: boolean; mode?: string; hours?: string }): Config {
  const mode = (flags.mode ?? env.DRINKING_BIRD_MODE ?? "agent").toLowerCase();
  if (mode !== "agent" && mode !== "y") {
    throw new Error(`Unknown mode "${mode}". Use "agent" or "y".`);
  }
  return {
    mode,
    agent: env.DRINKING_BIRD_AGENT,
    style: env.DRINKING_BIRD_STYLE,
    delaySeconds: parseDelay(env.DRINKING_BIRD_DELAY),
    maxRepliesPerHour: positiveNumber(env.DRINKING_BIRD_MAX_REPLIES, 3),
    hours: positiveNumber(flags.hours ?? env.DRINKING_BIRD_HOURS, 8),
    dryRun: flags.dryRun,
  };
}

export function readSlackToken(env: NodeJS.ProcessEnv): string {
  const userToken = (env.SLACK_USER_TOKEN ?? "").trim();
  if (!userToken.startsWith("xoxp-")) {
    throw new Error("SLACK_USER_TOKEN is missing or is not a user token (xoxp-...). See the README.");
  }
  return userToken;
}
