import type { AiService } from "@/domain/ports/aiService";
import type { SearchService } from "@/domain/ports/searchService";
import type { CacheService } from "@/domain/ports/cacheService";
import { withRetry } from "@/shared/utils/retry";

export class RagService {
  constructor(
    private readonly deps: {
      ai: AiService;
      search: SearchService;
      cache: CacheService;
      topK: number;
    }
  ) {}

  async answerQuestion(input: { tenantId: string; question: string }) {
    const { tenantId, question } = input;

    if (!question || question.trim().length === 0) {
      throw new Error("Question cannot be empty");
    }

    const embedding = await withRetry(
      () => this.deps.ai.embedText({ text: question }),
      { maxAttempts: 3, delayMs: 1000 }
    );

    const cacheKey = `rag:${tenantId}:${hashShort(question)}`;
    const cached = await this.deps.cache.get<{ chunks: any[] }>(cacheKey).catch(() => null);
    
    const chunks =
      cached?.chunks ??
      (await withRetry(
        () =>
          this.deps.search.querySimilar({
            tenantId,
            embedding: embedding.vector,
            topK: this.deps.topK
          }),
        { maxAttempts: 2, delayMs: 500 }
      ));

    if (!cached) {
      await this.deps.cache.set(cacheKey, { chunks }, { ttlSeconds: 300 }).catch(() => {
        // Non-critical; cache failure shouldn't block RAG
      });
    }

    if (chunks.length === 0) {
      return {
        answer:
          "I could not find matching indexed chunks for this question. Upload documents or re-ingest content, then ask again with keywords from the document.",
        sources: []
      };
    }

    const system = [
      "You are a strict RAG assistant.",
      "Use only the provided sources as ground truth.",
      "Do not use external knowledge unless explicitly asked.",
      "If evidence is insufficient, state what exact info is missing.",
      "When possible, reference source numbers like [SOURCE 1]."
    ].join(" ");

    const context =
      chunks
        .map(
          (c, i) =>
            `SOURCE ${i + 1}\nfilename: ${c.source.filename}\nurl: ${c.source.blobUrl}\ntext:\n${c.text}\n`
        )
        .join("\n");

    const completion = await withRetry(
      () =>
        this.deps.ai.chatComplete({
          messages: [
            { role: "system", content: system },
            { role: "system", content: `Context:\n${context}` },
            { role: "user", content: question }
          ]
        }),
      { maxAttempts: 2, delayMs: 1000 }
    );

    return {
      answer: completion.text,
      sources: chunks.map((c) => ({
        documentId: c.documentId,
        chunkId: c.chunkId,
        score: c.score,
        filename: c.source.filename,
        url: c.source.blobUrl
      }))
    };
  }
}

function hashShort(s: string) {
  // Non-cryptographic; fine for cache key diversity.
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

