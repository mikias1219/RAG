import type { AiService } from "@/domain/ports/aiService";
import type { SearchService } from "@/domain/ports/searchService";
import type { CacheService } from "@/domain/ports/cacheService";
import { badRequest } from "@/domain/errors/AppError";
import { withRetry } from "@/shared/utils/retry";
import { getPrisma } from "@/infrastructure/db/prismaClient";

export class RagService {
  private readonly prisma = getPrisma();
  constructor(
    private readonly deps: {
      ai: AiService;
      search: SearchService;
      cache: CacheService;
      topK: number;
    }
  ) {}

  async answerQuestion(input: { tenantId: string; question: string; documentIds?: string[] }) {
    const { tenantId, question } = input;
    const documentIds = Array.from(new Set((input.documentIds ?? []).filter(Boolean)));

    if (!question || question.trim().length === 0) {
      throw new Error("Question cannot be empty");
    }

    let embedding: { vector: number[] };
    try {
      embedding = await withRetry(
        () => this.deps.ai.embedText({ text: question }),
        { maxAttempts: 3, delayMs: 1000 }
      );
    } catch {
      // If embedding temporarily fails, continue with DB fallback instead of 500.
      embedding = { vector: [] };
    }

    const cacheKey = `rag:${tenantId}:${hashShort(question)}:${documentIds.sort().join(",")}`;
    const cached = await this.deps.cache.get<{ chunks: any[] }>(cacheKey).catch(() => null);
    
    const chunks =
      cached?.chunks ??
      (embedding.vector.length === 0
        ? []
        : await withRetry(
            () =>
              this.deps.search.querySimilar({
                tenantId,
                embedding: embedding.vector,
                topK: this.deps.topK,
                documentIds
              }),
            { maxAttempts: 2, delayMs: 500 }
          ).catch(() => []));

    if (!cached) {
      await this.deps.cache.set(cacheKey, { chunks }, { ttlSeconds: 300 }).catch(() => {
        // Non-critical; cache failure shouldn't block RAG
      });
    }

    const effectiveChunks =
      chunks.length > 0 ? chunks : await this.fallbackFromDb({ tenantId, question, documentIds });

    if (effectiveChunks.length === 0) {
      const scopeMessage =
        documentIds.length > 0
          ? "No matching chunks were found in the selected documents."
          : "I could not find matching indexed chunks for this question.";
      return {
        answer: `${scopeMessage} Upload documents or select different sources, then ask again with keywords from the document.`,
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
      effectiveChunks
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
    ).catch(() => {
      throw badRequest(
        "AI response generation failed. Please retry in a few seconds or upload more source content."
      );
    });

    return {
      answer: completion.text,
      sources: effectiveChunks.map((c) => ({
        documentId: c.documentId,
        chunkId: c.chunkId,
        score: c.score,
        filename: c.source.filename,
        url: c.source.blobUrl
      }))
    };
  }

  private async fallbackFromDb(input: { tenantId: string; question: string; documentIds?: string[] }) {
    const documentIds = Array.from(new Set((input.documentIds ?? []).filter(Boolean)));
    const keywords = tokenize(input.question);
    if (keywords.length === 0) {
      return this.recentChunks(input.tenantId, documentIds);
    }

    const rows = await this.prisma.chunk.findMany({
      where: {
        tenantId: input.tenantId,
        ...(documentIds.length > 0 ? { documentId: { in: documentIds } } : {}),
        OR: keywords.map((k) => ({ text: { contains: k, mode: "insensitive" } }))
      },
      include: { document: true },
      take: this.deps.topK,
      orderBy: { createdAt: "desc" }
    });

    const mapped = rows.map((r) => ({
      chunkId: r.id,
      documentId: r.documentId,
      score: 0.1,
      chunkIndex: r.chunkIndex,
      text: r.text,
      source: { filename: r.document.filename, blobUrl: r.document.blobUrl }
    }));
    if (mapped.length > 0) return mapped;
    return this.recentChunks(input.tenantId, documentIds);
  }

  private async recentChunks(tenantId: string, documentIds: string[] = []) {
    const rows = await this.prisma.chunk.findMany({
      where: {
        tenantId,
        ...(documentIds.length > 0 ? { documentId: { in: documentIds } } : {})
      },
      include: { document: true },
      take: this.deps.topK,
      orderBy: { createdAt: "desc" }
    });
    return rows.map((r) => ({
      chunkId: r.id,
      documentId: r.documentId,
      score: 0.05,
      chunkIndex: r.chunkIndex,
      text: r.text,
      source: { filename: r.document.filename, blobUrl: r.document.blobUrl }
    }));
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

function tokenize(text: string) {
  const parts = text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((w) => w.length >= 4);
  return Array.from(new Set(parts)).slice(0, 8);
}

