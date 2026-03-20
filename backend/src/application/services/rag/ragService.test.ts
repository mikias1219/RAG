import { RagService } from "./ragService";
import type { AiService } from "@/domain/ports/aiService";
import type { SearchService } from "@/domain/ports/searchService";
import type { CacheService } from "@/domain/ports/cacheService";

describe("RagService", () => {
  let aiService: AiService;
  let searchService: SearchService;
  let cacheService: CacheService;
  let ragService: RagService;

  beforeEach(() => {
    aiService = {
      embedText: jest.fn(async () => ({ vector: [0.1, 0.2, 0.3], model: "text-embedding-3-small" })),
      chatComplete: jest.fn(async () => ({ text: "Sample answer", model: "gpt-4o-mini" }))
    };

    searchService = {
      upsertChunks: jest.fn(async () => {}),
      deleteBySearchDocumentIds: jest.fn(async () => {}),
      querySimilar: jest.fn(async () => [
        {
          chunkId: "chunk1",
          documentId: "doc1",
          score: 0.95,
          chunkIndex: 0,
          text: "Sample chunk text",
          source: { filename: "test.txt", blobUrl: "https://example.blob.core.windows.net/test.txt" }
        }
      ])
    };

    cacheService = {
      get: jest.fn(async () => null),
      set: jest.fn(async () => {}),
      del: jest.fn(async () => {})
    };

    ragService = new RagService({
      ai: aiService,
      search: searchService,
      cache: cacheService,
      topK: 8
    });
  });

  it("answers question using RAG", async () => {
    const result = await ragService.answerQuestion({
      tenantId: "t_test",
      question: "What is Azure?"
    });

    expect(result.answer).toBeDefined();
    expect(result.sources.length).toBeGreaterThan(0);
    expect(aiService.embedText).toHaveBeenCalled();
    expect(searchService.querySimilar).toHaveBeenCalled();
  });

  it("caches question results", async () => {
    const question = "Cached question";
    
    await ragService.answerQuestion({
      tenantId: "t_test",
      question
    });

    expect(cacheService.set).toHaveBeenCalled();

    // Second call should use cache
    (cacheService.get as jest.Mock).mockResolvedValueOnce({ chunks: [] });
    
    await ragService.answerQuestion({
      tenantId: "t_test",
      question
    });

    expect(cacheService.get).toHaveBeenCalled();
  });
});
