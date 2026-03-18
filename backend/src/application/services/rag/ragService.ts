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

    const system = [
      "You are a helpful assistant.",
      "Answer using the provided sources when relevant.",
      "If the sources do not contain enough information, say what is missing."
    ].join(" ");

    const context =
      chunks.length > 0
        ? chunks
            .map(
              (c, i) =>
                `SOURCE ${i + 1}\nfilename: ${c.source.filename}\nurl: ${c.source.blobUrl}\ntext:\n${c.text}\n`
            )
            .join("\n")
        : "No relevant sources found in the knowledge base.";

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

