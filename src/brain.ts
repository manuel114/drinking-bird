import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ESCALATE, buildSystemPrompt, buildUserPrompt, type PromptInput } from "./prompt.ts";

export type BrainResult =
  | { kind: "reply"; text: string }
  | { kind: "escalate"; reason: string };

export interface Brain {
  name: string;
  reply(input: PromptInput): Promise<BrainResult>;
}

const MAX_REPLY_LENGTH = 280;
const AGENT_TIMEOUT_MS = 90_000;

/** The original. It presses Y. */
export const yBrain: Brain = {
  name: "y",
  async reply() {
    return { kind: "reply", text: "y" };
  },
};

/**
 * Turns raw agent output into a reply, or escalates.
 * When the output looks wrong the bird stays silent. Silence is safer than nonsense.
 */
export function parseAgentOutput(raw: string): BrainResult {
  const text = raw
    .trim()
    .replace(/^["'“”`]+|["'“”`]+$/g, "")
    .trim();
  if (!text) return { kind: "escalate", reason: "the agent returned nothing" };
  if (text.toUpperCase().startsWith(ESCALATE)) {
    return { kind: "escalate", reason: "the agent says this needs you" };
  }
  if (text.includes("\n") || text.length > MAX_REPLY_LENGTH) {
    return { kind: "escalate", reason: "the agent wrote too much" };
  }
  if (/<@|<!|https?:\/\//i.test(text)) {
    return { kind: "escalate", reason: "the agent tried to mention someone or post a link" };
  }
  return { kind: "reply", text };
}

interface AgentCommand {
  name: string;
  command: string;
  args: string[];
  shell: boolean;
}

function isOnPath(binary: string): boolean {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [binary], { stdio: "ignore" }).status === 0;
}

/**
 * Picks the coding agent that writes the replies.
 * Each preset runs the agent with no tools, because Slack messages are untrusted input.
 */
export function resolveAgentCommand(setting: string | undefined, systemPrompt: string): AgentCommand {
  const choice = setting?.trim() || (isOnPath("claude") ? "claude" : isOnPath("codex") ? "codex" : "");
  if (choice === "claude") {
    return {
      name: "claude",
      command: "claude",
      args: ["-p", "--tools", "", "--strict-mcp-config", "--model", "haiku", "--system-prompt", systemPrompt],
      shell: false,
    };
  }
  if (choice === "codex") {
    return {
      name: "codex",
      command: "codex",
      args: ["exec", "--sandbox", "read-only", "--skip-git-repo-check", "-"],
      shell: false,
    };
  }
  if (choice) {
    return { name: choice, command: choice, args: [], shell: true };
  }
  throw new Error(
    "No coding agent found. Install Claude Code or Codex, set DRINKING_BIRD_AGENT to a command, or use DRINKING_BIRD_MODE=y.",
  );
}

function runAgent(agent: AgentCommand, stdin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // An empty working directory, so the agent has nothing of yours to look at.
    const cwd = mkdtempSync(join(tmpdir(), "drinking-bird-"));
    const child = spawn(agent.command, agent.args, {
      cwd,
      shell: agent.shell,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${agent.name} took longer than ${AGENT_TIMEOUT_MS / 1000}s`));
    }, AGENT_TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`${agent.name} exited with code ${code}: ${stderr.trim().slice(0, 300)}`));
    });
    child.stdin.end(stdin);
  });
}

export function createAgentBrain(setting: string | undefined, style: string | undefined): Brain {
  const systemPrompt = buildSystemPrompt(style);
  const agent = resolveAgentCommand(setting, systemPrompt);
  // Claude Code takes the system prompt as a flag. Other agents get it at the top of stdin.
  const preamble = agent.name === "claude" ? "" : `${systemPrompt}\n\n`;
  return {
    name: agent.name,
    async reply(input) {
      try {
        const output = await runAgent(agent, preamble + buildUserPrompt(input));
        return parseAgentOutput(output);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "the agent failed";
        return { kind: "escalate", reason };
      }
    },
  };
}
