export interface MemoryConfig {
  memoryDir: string;
  projectDir?: string;
  currentProjectName?: string | null;
}

export type MemoryTarget = "memory" | "identity" | "user" | "daily" | "project";

export interface TimestampEntry {
  timestamp: string;
  content: string;
}

export interface SemanticSearchResult {
  score: number;
  filePath: string;
  heading: string;
  text: string;
  timestamp?: string;
}

export interface MonthGroup {
  month: string;
  fileCount: number;
  entryCount: number;
  files: Array<{ name: string; timestamps: string[] }>;
}

export interface ContextFile {
  name: string;
  content: string;
}

// File entry with timestamps - used for listing files
export interface FileEntry {
  name: string;
  timestamps: string[];
}

// Return type for listFilesGroupedByMonth
export interface GroupedFiles {
  root: FileEntry[];
  project: FileEntry[];
  monthly: MonthGroup[];
}
