import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { getMemoryDir } from "./config.js";

// The upstream plugin used Bun's shell (`import { $ } from "bun"`). The v2
// port avoids the bun dependency so the module also typechecks and tests
// under plain Node; child_process is equivalent for these short commands.
function run(cwd: string, command: string): string {
  try {
    return execSync(command, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
    }).trim();
  } catch (error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr;
    throw new Error(stderr ? String(stderr).trim() : (error as Error).message);
  }
}

export async function ensureGitRepo(): Promise<void> {
  const memoryDir = getMemoryDir();
  const gitDir = path.join(memoryDir, ".git");

  if (!fs.existsSync(gitDir)) {
    try {
      run(memoryDir, "git init");
      run(memoryDir, 'git config user.name "OpenCode Memory"');
      run(memoryDir, 'git config user.email "memory@opencode.local"');
    } catch (err) {
      console.error(
        `[git] Failed to initialize repo: ${(err as Error).message}`
      );
    }
  }
}

export async function gitCommit(operation: string): Promise<void> {
  const memoryDir = getMemoryDir();

  await ensureGitRepo();

  try {
    run(memoryDir, "git add .");
    const status = run(memoryDir, "git status --porcelain");

    if (!status.trim()) {
      return;
    }

    run(memoryDir, `git commit -m ${JSON.stringify(operation)}`);
  } catch (err) {
    const errorMessage = (err as Error).message;
    if (!errorMessage.includes("nothing to commit")) {
      console.error(`[git] Commit failed: ${errorMessage}`);
    }
  }
}
