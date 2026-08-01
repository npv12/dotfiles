const VALID_TARGETS = ["memory", "identity", "user", "daily", "project"];
const VALID_ACTIONS = [
  "read",
  "write",
  "edit",
  "delete",
  "search",
  "list",
  "reindex",
];
const MAX_CONTENT_SIZE = 100 * 1024;
const MAX_MEMORY_LINES = 1000;

export function validateTarget(target: string): void {
  if (!VALID_TARGETS.includes(target)) {
    throw new Error(
      `Invalid target: ${target}. Must be one of: ${VALID_TARGETS.join(", ")}`
    );
  }
}

export function validateAction(action: string): void {
  if (!VALID_ACTIONS.includes(action)) {
    throw new Error(
      `Invalid action: ${action}. Must be one of: ${VALID_ACTIONS.join(", ")}`
    );
  }
}

export function validateContent(content: string): void {
  if (!content || typeof content !== "string") {
    throw new Error("Content must be a non-empty string");
  }
  if (content.length > MAX_CONTENT_SIZE) {
    throw new Error(
      `Content exceeds ${MAX_CONTENT_SIZE} bytes (current: ${content.length})`
    );
  }
}

const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?$/;

export function validateTimestamp(timestamp: string): void {
  if (!TIMESTAMP_REGEX.test(timestamp)) {
    throw new Error(
      `Invalid timestamp format: ${timestamp}. Must be YYYY-MM-DD or YYYY-MM-DD HH:MM:SS`
    );
  }
}

export function checkLineLimit(filePath: string, content: string): void {
  const fileName = filePath.split("/").pop();
  if (fileName === "MEMORY.md") {
    const lines = content.split("\n").length;
    if (lines > MAX_MEMORY_LINES) {
      throw new Error(
        `MEMORY.md exceeds ${MAX_MEMORY_LINES} line limit (current: ${lines} lines). Use memory_delete to remove entries by timestamp.`
      );
    }
  }
}
