import * as fs from "node:fs";
import * as path from "node:path";

import { atomicWrite } from "./atomicWrite.js";
import { chunkMarkdown } from "./chunker.js";
import { ensureDir, getMemoryDir } from "./config.js";
import { embedText } from "./embedding.js";
import { gitCommit } from "./git.js";
import {
  extractTimestamps,
  parseContentByTimestamp,
} from "./timestampParser.js";
import type {
  ContextFile,
  FileEntry,
  GroupedFiles,
  MemoryConfig,
  MonthGroup,
  SemanticSearchResult,
} from "./types.js";
import { checkLineLimit } from "./validation.js";
import { upsertFile } from "./vector-store.js";

interface FileList {
  root: string[];
  daily: string[];
  project: string[];
}

// Queue for serializing embedding operations to avoid Bun NAPI concurrency issues
class EmbeddingQueue {
  private queue: Array<{
    filePath: string;
    content: string;
  }> = [];
  private isProcessing = false;
  private isExiting = false;

  constructor() {
    // Clear queue on process exit to avoid NAPI cleanup crashes
    process.once("beforeExit", () => {
      this.isExiting = true;
      this.queue.length = 0; // Clear pending jobs
      console.log("[embedding] Process exiting, cleared embedding queue");
    });
  }

  // Fire-and-forget: add to queue without blocking caller
  add(filePath: string, content: string): void {
    if (this.isExiting) {
      console.log(`[embedding] Skipping ${filePath}: process is exiting`);
      return;
    }

    this.queue.push({ filePath, content });
    // Fire-and-forget: don't await, just trigger processing
    this.processNext().catch((err) => {
      console.error("[embedding] Queue processing error:", err);
    });
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || this.isExiting) {
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift();

    if (item) {
      try {
        const chunks = chunkMarkdown(item.content, item.filePath);
        await upsertFile(item.filePath, chunks);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        // Gracefully catch errors - don't let them propagate and crash
        const errMsg = (_err as Error).message || String(_err);
        if (errMsg.includes("not initialized")) {
          // Vector store not initialized, silently ignore
        } else {
          console.error(
            `[embedding] Failed to embed ${item.filePath}: ${errMsg}`
          );
        }
      }
    }

    this.isProcessing = false;

    // Continue processing remaining items
    if (this.queue.length > 0 && !this.isExiting) {
      // Use setImmediate to allow event loop to process other events
      setImmediate(() => {
        this.processNext().catch((err) => {
          console.error("[embedding] Queue processing error:", err);
        });
      });
    }
  }
}

export class MemoryManager {
  private config: MemoryConfig;
  private dailyDir: string;
  private projectDir: string;
  private embeddingQueue: EmbeddingQueue;

  constructor(config: MemoryConfig) {
    this.config = config;
    this.dailyDir = path.join(config.memoryDir, "daily");
    this.projectDir =
      config.projectDir || path.join(config.memoryDir, "project");
    this.embeddingQueue = new EmbeddingQueue();
  }

  ensureDirectories(): void {
    ensureDir(this.config.memoryDir);
    ensureDir(this.dailyDir);
    ensureDir(this.projectDir);
  }

  getCurrentProjectName(): string | null {
    return this.config.currentProjectName || null;
  }

  getProjectPath(projectName: string): string {
    return path.join(this.projectDir, `${projectName}.md`);
  }

  getMemoryPath(): string {
    return path.join(this.config.memoryDir, "MEMORY.md");
  }

  getIdentityPath(): string {
    return path.join(this.config.memoryDir, "IDENTITY.md");
  }

  getUserPath(): string {
    return path.join(this.config.memoryDir, "USER.md");
  }

  getBootstrapPath(): string {
    return path.join(this.config.memoryDir, "BOOTSTRAP.md");
  }

  getDailyPath(date: string): string {
    return path.join(this.dailyDir, `${date}.md`);
  }

  getPathForTarget(
    target: string,
    date?: string,
    projectName?: string
  ): { filePath: string; displayName: string } {
    switch (target) {
      case "memory":
        return { filePath: this.getMemoryPath(), displayName: "MEMORY.md" };
      case "identity":
        return { filePath: this.getIdentityPath(), displayName: "IDENTITY.md" };
      case "user":
        return { filePath: this.getUserPath(), displayName: "USER.md" };
      case "daily": {
        const targetDate = date ?? this.todayStr();
        return {
          filePath: this.getDailyPath(targetDate),
          displayName: `daily/${targetDate}.md`,
        };
      }
      case "project": {
        const targetProject = projectName ?? this.getCurrentProjectName();
        if (!targetProject) {
          throw new Error(
            "Project name not available. Set current working directory or provide project name."
          );
        }
        return {
          filePath: this.getProjectPath(targetProject),
          displayName: `project/${targetProject}.md`,
        };
      }
      default:
        throw new Error(`Unknown target: ${target}`);
    }
  }

  todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  readFile(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  writeFile(filePath: string, content: string): void {
    checkLineLimit(filePath, content);
    atomicWrite(filePath, content);
    // Fire-and-forget background embedding
    this.embedAndIndex(filePath, content);
    gitCommit(`Update ${path.basename(filePath)}`);
  }

  editFile(filePath: string, oldString: string, newString: string): void {
    const content = this.readFile(filePath);
    if (!content) {
      throw new Error("File not found or empty");
    }

    if (!content.includes(oldString)) {
      throw new Error("oldString not found in file");
    }

    const matches = content.split(oldString).length - 1;
    if (matches > 1) {
      throw new Error(
        `Found ${matches} occurrences of oldString, expected exactly 1`
      );
    }

    const updatedContent = content.replace(oldString, newString);
    atomicWrite(filePath, updatedContent);
    // Fire-and-forget background embedding with new content
    this.embedAndIndex(filePath, updatedContent);
    gitCommit(`Edit ${path.basename(filePath)}`);
  }

  async deleteByTimestamp(
    target: string,
    timestamp: string,
    date?: string,
    projectName?: string
  ): Promise<string> {
    const { filePath, displayName } = this.getPathForTarget(
      target,
      date,
      projectName
    );
    const content = this.readFile(filePath);

    if (!content) {
      throw new Error(`${displayName} not found or empty`);
    }

    const entries = parseContentByTimestamp(content);
    const filteredEntries = entries.filter(
      (entry) => entry.timestamp !== timestamp
    );

    if (filteredEntries.length === entries.length) {
      throw new Error(`No entries found matching timestamp: ${timestamp}`);
    }

    const newContent = filteredEntries
      .map((e) => `<!-- ${e.timestamp} -->\n${e.content}`)
      .join("\n\n");

    atomicWrite(filePath, newContent);
    // Fire-and-forget background embedding with new content
    this.embedAndIndex(filePath, newContent);
    gitCommit(`Delete entries from ${path.basename(filePath)}`);

    return `Deleted ${entries.length - filteredEntries.length} entries from ${displayName}`;
  }

  appendFile(filePath: string, content: string): void {
    const existing = this.readFile(filePath);
    const separator = existing?.trim() ? "\n\n" : "";
    const timestamp = this.getLocalTimestamp();
    const stamped = `<!-- ${timestamp} -->\n${content}`;
    const newContent = (existing ?? "") + separator + stamped;

    checkLineLimit(filePath, newContent);
    atomicWrite(filePath, newContent);
    // Fire-and-forget background embedding with new content
    this.embedAndIndex(filePath, newContent);
    gitCommit(`Append to ${path.basename(filePath)}`);
  }

  getLocalTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  // Fire-and-forget: add to background embedding queue without blocking
  private embedAndIndex(filePath: string, content: string): void {
    this.embeddingQueue.add(filePath, content);
  }

  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  isInitialized(): boolean {
    return this.fileExists(this.getMemoryPath());
  }

  needsBootstrap(): boolean {
    return this.fileExists(this.getBootstrapPath());
  }

  getContextFiles(): ContextFile[] {
    const files: ContextFile[] = [];
    const paths = [
      { path: this.getMemoryPath(), name: "MEMORY.md" },
      { path: this.getIdentityPath(), name: "IDENTITY.md" },
      { path: this.getUserPath(), name: "USER.md" },
    ];

    for (const { path: filePath, name } of paths) {
      const content = this.readFile(filePath);
      if (content?.trim()) {
        files.push({ name, content: content.trim() });
      }
    }
    return files;
  }

  async semanticSearch(
    query: string,
    maxResults: number = 20,
    period?: string
  ): Promise<SemanticSearchResult[]> {
    const queryVector = await embedText(query);
    const results = await import("./vector-store.js").then((m) =>
      m.semanticSearch(queryVector, maxResults)
    );

    const resultsWithTimestamp: SemanticSearchResult[] = [];
    for (const result of results) {
      const fileContent = this.readFile(result.filePath);
      let timestamp: string | undefined;

      if (fileContent) {
        const timestamps = extractTimestamps(fileContent);
        if (timestamps.length > 0) {
          timestamp = timestamps[0];
        }
      }

      if (period) {
        if (timestamp && !timestamp.startsWith(period.replace("-", "-"))) {
          continue;
        }
      }

      resultsWithTimestamp.push({
        ...result,
        timestamp,
      });
    }

    return resultsWithTimestamp;
  }

  private readDirFiles(dir: string): string[] {
    try {
      return fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    } catch {
      return [];
    }
  }

  listFiles(): FileList {
    return {
      root: this.readDirFiles(this.config.memoryDir).filter(
        (f) => f !== "BOOTSTRAP.md"
      ),
      daily: this.readDirFiles(this.dailyDir),
      project: this.readDirFiles(this.projectDir),
    };
  }

  embedAllExistingFiles(): void {
    // Get all files that exist
    const { root, daily, project } = this.listFiles();
    const filesToEmbed: Array<{ filePath: string; content: string }> = [];

    const collectFiles = (files: string[], dir: string) => {
      for (const file of files) {
        const filePath = path.join(dir, file);
        const content = this.readFile(filePath);
        if (content) {
          filesToEmbed.push({ filePath, content });
        }
      }
    };

    collectFiles(root, this.config.memoryDir);
    collectFiles(daily, this.dailyDir);
    collectFiles(project, this.projectDir);

    // Fire-and-forget: queue all files for background embedding
    for (const { filePath, content } of filesToEmbed) {
      this.embedAndIndex(filePath, content);
    }

    console.log(
      `[embedding] Queued ${filesToEmbed.length} files for background indexing`
    );
  }

  private createFileEntry(
    fileName: string,
    filePath: string,
    prefix: string = ""
  ): FileEntry {
    const content = this.readFile(filePath);
    const timestamps = content ? extractTimestamps(content) : [];
    return { name: prefix ? `${prefix}/${fileName}` : fileName, timestamps };
  }

  listFilesGroupedByMonth(): GroupedFiles {
    const { root, daily, project } = this.listFiles();

    // Create root file entries
    const rootFiles = root.map((file) =>
      this.createFileEntry(file, path.join(this.config.memoryDir, file))
    );

    // Create project file entries
    const projectFiles = project.map((file) =>
      this.createFileEntry(file, path.join(this.projectDir, file))
    );

    // Group daily files by month
    const monthlyMap = new Map<string, FileEntry[]>();

    for (const file of daily) {
      const dateStr = file.replace(".md", "");
      const month = dateStr.slice(0, 7);
      const entry = this.createFileEntry(
        file,
        path.join(this.dailyDir, file),
        "daily"
      );

      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, []);
      }
      monthlyMap.get(month)!.push(entry);
    }

    // Build month groups
    const monthly: MonthGroup[] = [];
    for (const [month, files] of monthlyMap.entries()) {
      const entryCount = files.reduce((sum, f) => sum + f.timestamps.length, 0);
      monthly.push({
        month,
        fileCount: files.length,
        entryCount,
        files,
      });
    }

    monthly.sort((a, b) => b.month.localeCompare(a.month));

    return { root: rootFiles, project: projectFiles, monthly };
  }

  listFilesByPeriod(period: string): FileEntry[] {
    const { daily } = this.listFiles();
    const result: FileEntry[] = [];

    const filteredDaily = daily.filter((file) => {
      const dateStr = file.replace(".md", "");
      return dateStr.startsWith(period);
    });

    for (const file of filteredDaily) {
      result.push(
        this.createFileEntry(file, path.join(this.dailyDir, file), "daily")
      );
    }

    return result;
  }
}
