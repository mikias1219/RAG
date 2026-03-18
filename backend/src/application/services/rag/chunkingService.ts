export type TextChunk = {
  index: number;
  text: string;
  tokenCountApprox: number;
};

function approxTokenCount(text: string) {
  // Fast heuristic: ~4 chars/token for English-ish text.
  return Math.max(1, Math.ceil(text.length / 4));
}

export function chunkText(input: { text: string; chunkSize: number; overlap: number }): TextChunk[] {
  const { text, chunkSize, overlap } = input;
  if (chunkSize <= 0) return [];
  const safeOverlap = Math.min(Math.max(0, overlap), Math.max(0, chunkSize - 1));

  const chunks: TextChunk[] = [];
  let start = 0;
  let idx = 0;

  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    const slice = text.slice(start, end).trim();
    if (slice.length > 0) {
      chunks.push({ index: idx++, text: slice, tokenCountApprox: approxTokenCount(slice) });
    }
    if (end >= text.length) break;
    start = end - safeOverlap;
  }

  return chunks;
}

