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

  async answerQuestion(input: {
    tenantId: string;
    workspaceId?: string | null;
    question: string;
    documentIds?: string[];
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  }) {
    const { tenantId, question } = input;
    const workspaceProfile = input.workspaceId
      ? await this.prisma.workspace
          .findFirst({
            where: { id: input.workspaceId, tenantId },
            select: { industry: true, domainFocus: true }
          })
          .catch(() => null)
      : null;
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

    const cacheKey = `rag:${tenantId}:${input.workspaceId ?? "none"}:${hashShort(question)}:${documentIds.sort().join(",")}`;
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
      chunks.length > 0
        ? chunks
        : await this.fallbackFromDb({
            tenantId,
            workspaceId: input.workspaceId ?? null,
            question,
            documentIds
          });

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
      "Never answer with facts not present in the provided sources.",
      "If evidence is insufficient or unrelated, explicitly say you cannot answer from selected documents.",
      "Prefer precise, concise answers with short sections and bullet points when useful.",
      "For each major claim, include source references like [SOURCE 1].",
      industryGuidance(workspaceProfile?.industry, workspaceProfile?.domainFocus)
    ].join(" ");

    const context =
      effectiveChunks
        .map(
          (c, i) =>
            `SOURCE ${i + 1}\nfilename: ${c.source.filename}\nurl: ${c.source.blobUrl}\ntext:\n${c.text}\n`
        )
        .join("\n");

    const historyText = (input.conversationHistory ?? [])
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const completion = await withRetry(
      () =>
        this.deps.ai.chatComplete({
          messages: [
            { role: "system", content: system },
            ...(historyText ? [{ role: "system" as const, content: `Conversation history:\n${historyText}` }] : []),
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

    const verifiedAnswer = await withRetry(
      () =>
        this.deps.ai.chatComplete({
          messages: [
            {
              role: "system",
              content:
                "You are a strict grounding verifier. Rewrite the draft answer using ONLY provided context. " +
                "If any claim is not grounded in context, remove it. If insufficient evidence remains, reply exactly: " +
                "\"I cannot answer your question from the selected documents.\""
            },
            { role: "system", content: `Question:\n${question}` },
            { role: "system", content: `Context:\n${context}` },
            { role: "system", content: `Draft answer:\n${completion.text}` }
          ]
        }),
      { maxAttempts: 2, delayMs: 600 }
    ).catch(() => completion);

    return {
      answer: verifiedAnswer.text,
      sources: dedupeSources(
        effectiveChunks.map((c) => ({
        documentId: c.documentId,
        chunkId: c.chunkId,
        score: c.score,
        filename: c.source.filename,
        url: c.source.blobUrl
      }))
      )
    };
  }

  private async fallbackFromDb(input: {
    tenantId: string;
    workspaceId?: string | null;
    question: string;
    documentIds?: string[];
  }) {
    const documentIds = Array.from(new Set((input.documentIds ?? []).filter(Boolean)));
    const keywords = tokenize(input.question);
    if (keywords.length === 0) {
      return this.recentChunks(input.tenantId, input.workspaceId ?? null, documentIds);
    }

    const rows = await this.prisma.chunk.findMany({
      where: {
        ...workspaceCompatibleWhere(input.tenantId, input.workspaceId),
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
    return this.recentChunks(input.tenantId, input.workspaceId ?? null, documentIds);
  }

  private async recentChunks(tenantId: string, workspaceId: string | null = null, documentIds: string[] = []) {
    const rows = await this.prisma.chunk.findMany({
      where: {
        ...workspaceCompatibleWhere(tenantId, workspaceId),
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

function dedupeSources(
  sources: Array<{ documentId: string; chunkId: string; score: number; filename: string; url: string }>
) {
  const byChunk = new Map<string, (typeof sources)[number]>();
  for (const s of sources) {
    if (!byChunk.has(s.chunkId) || byChunk.get(s.chunkId)!.score < s.score) {
      byChunk.set(s.chunkId, s);
    }
  }
  return Array.from(byChunk.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
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

function industryGuidance(industry?: string | null, domainFocus?: string | null) {
  if (industry === "banking") {
    return `Prioritize financial risk, compliance, auditability, and customer-impact framing. ${domainFocus ? `Workspace focus: ${domainFocus}.` : ""}`;
  }
  if (industry === "construction") {
    return `Prioritize project delivery, safety, contract scope, procurement, and schedule risk framing. ${domainFocus ? `Workspace focus: ${domainFocus}.` : ""}`;
  }
  return domainFocus ? `Workspace focus: ${domainFocus}.` : "Keep responses practical for enterprise document workflows.";
}

function workspaceCompatibleWhere(tenantId: string, workspaceId?: string | null) {
  if (!workspaceId) return { tenantId };
  return {
    OR: [{ workspaceId }, { tenantId, workspaceId: null }]
  };
}

