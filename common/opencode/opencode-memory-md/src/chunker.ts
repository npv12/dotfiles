import { hashContent } from "./embedding.js";

export interface Chunk {
  text: string;
  heading: string;
  filePath: string;
  hash: string;
}

export function chunkMarkdown(content: string, filePath: string): Chunk[] {
  const chunks: Chunk[] = [];
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const sections = content.split(headingRegex);

  let currentHeading = "";
  for (let i = 0; i < sections.length; i += 3) {
    const heading = sections[i + 1];
    const text = sections[i + 2];

    if (heading) {
      currentHeading = heading.trim();
    }

    if (text && text.trim()) {
      chunks.push({
        text: text.trim(),
        heading: currentHeading,
        filePath,
        hash: hashContent(`${filePath}:${currentHeading}:${text.trim()}`),
      });
    }
  }

  if (chunks.length === 0 && content.trim()) {
    chunks.push({
      text: content.trim(),
      heading: "",
      filePath,
      hash: hashContent(`${filePath}:${content.trim()}`),
    });
  }

  return chunks;
}
