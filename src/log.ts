import { execFile } from "node:child_process";

const colour = (code: number) => (text: string) => (process.stdout.isTTY ? `\u001b[${code}m${text}\u001b[0m` : text);
const dim = colour(2);
const red = colour(31);
const green = colour(32);
const yellow = colour(33);

function stamp(): string {
  return dim(new Date().toTimeString().slice(0, 8));
}

export const BANNER = `
        ___
      _( o )>     DRINKING BIRD
     (_  __)      presses Y so you don't have to
       ||
      _||_        to start press any key
     /____\\       (you already did)
`;

export function info(text: string): void {
  console.log(`${stamp()} ${text}`);
}

export function dip(who: string, heard: string, said: string, dryRun: boolean): void {
  console.log(`${stamp()} ${green("dip")}  ${who}: ${dim(heard)}`);
  console.log(`${" ".repeat(9)}${dryRun ? yellow("would say") : green("said")}: ${said}`);
}

export function skip(text: string): void {
  console.log(`${stamp()} ${dim(`skip ${text}`)}`);
}

/**
 * The bird cannot handle this one. It makes noise until a human looks.
 */
export function alarm(who: string, heard: string, reason: string): void {
  console.log(`${stamp()} ${red("ALARM")} ${who}: ${heard}`);
  console.log(`${" ".repeat(9)}${red(`${reason}. The bird did not answer. Put the controller down.`)}`);
  process.stdout.write("\u0007");
  if (process.platform === "darwin") {
    // The text goes in as an argument, never inside the script, so a message cannot inject AppleScript.
    execFile(
      "osascript",
      [
        "-e", "on run argv",
        "-e", 'display notification (item 1 of argv) with title "Drinking Bird" subtitle (item 2 of argv) sound name "Sosumi"',
        "-e", "end run",
        `${who}: ${heard}`.slice(0, 200),
        reason,
      ],
      () => undefined,
    );
  }
}
