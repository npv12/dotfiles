import { pipeline } from "@huggingface/transformers";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

process.env.TRANSFORMERS_VERBOSITY = "error";
process.env.ORT_LOGGING_LEVEL = "error";

let embedder: any = null;
let initPromise: Promise<void> | null = null;

function getModelCachePath(): string {
  const pluginDir = path.dirname(path.dirname(__dirname));
  return path.join(
    pluginDir,
    "node_modules",
    "@huggingface",
    "transformers",
    ".cache"
  );
}

function isModelCacheValid(): boolean {
  const cachePath = getModelCachePath();
  const modelPath = path.join(
    cachePath,
    "nomic-ai",
    "nomic-embed-text-v1.5",
    "onnx",
    "model.onnx"
  );

  if (!fs.existsSync(modelPath)) {
    return false;
  }

  const stat = fs.statSync(modelPath);
  if (stat.size < 1000000) {
    return false;
  }

  return true;
}

function clearModelCache(): void {
  try {
    const cachePath = getModelCachePath();
    const modelPath = path.join(cachePath, "nomic-ai", "nomic-embed-text-v1.5");

    if (fs.existsSync(modelPath)) {
      fs.rmSync(modelPath, { recursive: true, force: true });
    }
  } catch {}
}

async function initEmbedder(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          if (!isModelCacheValid()) {
            clearModelCache();
          }

          embedder = await pipeline(
            "feature-extraction",
            "nomic-ai/nomic-embed-text-v1.5",
            {
              dtype: "fp32",
            }
          );
          return;
        } catch (err) {
          const errMsg = (err as Error).message;
          if (
            errMsg.includes("Protobuf parsing failed") ||
            errMsg.includes("corrupt")
          ) {
            clearModelCache();
            retries++;
            if (retries > maxRetries) {
              throw new Error(
                `Failed to load embedding model after ${maxRetries} retries. ` +
                  `Model cache may be corrupted. Try: rm -rf node_modules/@huggingface/transformers/.cache`
              );
            }
            continue;
          }
          throw err;
        }
      }
    })();
  }
  await initPromise;
}

async function getEmbedder(): Promise<any> {
  if (!embedder) {
    await initEmbedder();
  }
  return embedder;
}

export async function embedText(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data) as number[];
}

export function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}
