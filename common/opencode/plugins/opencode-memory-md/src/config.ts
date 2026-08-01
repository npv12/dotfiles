import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { MemoryConfig } from "./types.js";

export function getMemoryDir(): string {
  const home = os.homedir();
  if (os.platform() === "win32") {
    return path.join(home, "AppData", "Roaming", "opencode", "memory");
  }
  return path.join(home, ".config", "opencode", "memory");
}

export function getProjectDir(memoryDir: string): string {
  return path.join(memoryDir, "project");
}

export function getCurrentProjectName(): string | null {
  try {
    const cwd = process.cwd();
    return path.basename(cwd);
  } catch {
    return null;
  }
}

export function resolvePath(filePath: string): string {
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(filePath);
}

export function loadConfig(): MemoryConfig {
  const memoryDir = getMemoryDir();
  const projectDir = getProjectDir(memoryDir);
  const currentProjectName = getCurrentProjectName();
  return { memoryDir, projectDir, currentProjectName };
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
