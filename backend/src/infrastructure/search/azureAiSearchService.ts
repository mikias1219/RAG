import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import type { RetrievedChunk, SearchChunkDoc, SearchService } from "@/domain/ports/searchService";
import { badRequest } from "@/domain/errors/AppError";
import { withRetry } from "@/shared/utils/retry";

export class AzureAiSearchService implements SearchService {
  private readonly client: SearchClient<SearchChunkDoc>;

  constructor(
    private readonly opts: {
      endpoint?: string;
      apiKey?: string;
      indexName: string;
    }
  ) {
    if (!opts.endpoint || !opts.apiKey) {
      throw badRequest(
        "AZURE_AI_SEARCH_ENDPOINT and AZURE_AI_SEARCH_API_KEY are required when SEARCH_PROVIDER=azure"
      );
    }
    this.client = new SearchClient<SearchChunkDoc>(
      opts.endpoint,
      opts.indexName,
      new AzureKeyCredential(opts.apiKey)
    );
  }

  async upsertChunks(input: { chunks: SearchChunkDoc[] }): Promise<void> {
    if (input.chunks.length === 0) return;

    const batchSize = 1000;
    for (let i = 0; i < input.chunks.length; i += batchSize) {
      const batch = input.chunks.slice(i, i + batchSize);
      await withRetry(
        () => this.client.mergeOrUploadDocuments(batch),
        { maxAttempts: 2, delayMs: 1000 }
      );
    }
  }

  async deleteBySearchDocumentIds(input: { searchDocumentIds: string[] }): Promise<void> {
    const ids = Array.from(new Set(input.searchDocumentIds.filter(Boolean)));
    if (ids.length === 0) return;
    const docs = ids.map((id) => ({ id })) as unknown as SearchChunkDoc[];
    await withRetry(() => this.client.deleteDocuments(docs), { maxAttempts: 2, delayMs: 500 });
  }

  async querySimilar(input: {
    tenantId: string;
    embedding: number[];
    topK: number;
    documentIds?: string[];
  }): Promise<RetrievedChunk[]> {
    if (!input.embedding || input.embedding.length === 0) {
      throw new Error("Embedding vector is required");
    }

    if (input.topK <= 0 || input.topK > 100) {
      throw new Error("topK must be between 1 and 100");
    }

    const docIds = (input.documentIds ?? []).filter(Boolean);
    const documentFilter =
      docIds.length > 0
        ? ` and (${docIds.map((id) => `documentId eq '${escapeOData(id)}'`).join(" or ")})`
        : "";

    const results = await withRetry(
      () =>
        this.client.search("*", {
          filter: `tenantId eq '${escapeOData(input.tenantId)}'${documentFilter}`,
          top: input.topK,
          vectorSearchOptions: {
            queries: [
              {
                kind: "vector",
                vector: input.embedding,
                fields: ["embedding"],
                kNearestNeighborsCount: input.topK
              }
            ]
          },
          select: ["id", "tenantId", "documentId", "chunkId", "chunkIndex", "text", "source", "createdAtIso"]
        }),
      { maxAttempts: 2, delayMs: 500 }
    );

    const chunks: RetrievedChunk[] = [];
    for await (const r of results.results) {
      const doc = r.document;
      chunks.push({
        chunkId: doc.chunkId,
        documentId: doc.documentId,
        score: r.score ?? 0,
        chunkIndex: doc.chunkIndex,
        text: doc.text,
        source: { filename: doc.source.filename, blobUrl: doc.source.blobUrl }
      });
    }
    return chunks;
  }
}

function escapeOData(s: string) {
  return s.replace(/'/g, "''");
}

