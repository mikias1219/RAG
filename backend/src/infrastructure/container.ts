import type { Logger } from "pino";
import type { AppEnv } from "@/config/env";
import type { AiService } from "@/domain/ports/aiService";
import type { SearchService } from "@/domain/ports/searchService";
import type { StorageService } from "@/domain/ports/storageService";
import type { CacheService } from "@/domain/ports/cacheService";
import type { DocumentRepository } from "@/domain/ports/documentRepository";
import type { ChatRepository } from "@/domain/ports/chatRepository";
import { AzureOpenAiService } from "@/infrastructure/ai/azureOpenAiService";
import { AzureAiSearchService } from "@/infrastructure/search/azureAiSearchService";
import { AzureBlobStorageService } from "@/infrastructure/storage/azureBlobStorageService";
import { InMemoryCacheService } from "@/infrastructure/cache/inMemoryCacheService";
import { PrismaDocumentRepository } from "@/infrastructure/db/repositories/documentRepository.prisma";
import { PrismaChatRepository } from "@/infrastructure/db/repositories/chatRepository.prisma";
import { RagService } from "@/application/services/rag/ragService";
import { IngestDocumentService } from "@/application/services/documents/ingestDocument";
import { ChatService } from "@/application/services/chat/chatService";

export type Container = {
  logger: Logger;
  env: AppEnv;
  ai: AiService;
  search: SearchService;
  storage: StorageService;
  cache: CacheService;
  documentsRepo: DocumentRepository;
  chatRepo: ChatRepository;
  ragService: RagService;
  ingestDocumentService: IngestDocumentService;
  chatService: ChatService;
};

export function buildContainer(opts: { env: AppEnv; logger: Logger }): Container {
  const { env, logger } = opts;

  const cache: CacheService = new InMemoryCacheService();
  const documentsRepo: DocumentRepository = new PrismaDocumentRepository();
  const chatRepo: ChatRepository = new PrismaChatRepository();

  const storage: StorageService =
    env.STORAGE_PROVIDER === "azure"
      ? new AzureBlobStorageService({
          connectionString: env.AZURE_STORAGE_CONNECTION_STRING,
          containerName: env.AZURE_STORAGE_CONTAINER
        })
      : new AzureBlobStorageService({
          // For Step 2 we keep a single impl; Step 6 adds local provider.
          connectionString: env.AZURE_STORAGE_CONNECTION_STRING,
          containerName: env.AZURE_STORAGE_CONTAINER
        });

  const ai: AiService =
    env.AI_PROVIDER === "azure-openai"
      ? new AzureOpenAiService({
          endpoint: env.AZURE_OPENAI_ENDPOINT,
          apiKey: env.AZURE_OPENAI_API_KEY,
          apiVersion: env.AZURE_OPENAI_API_VERSION,
          chatDeployment: env.AZURE_OPENAI_CHAT_DEPLOYMENT,
          embeddingDeployment: env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
        })
      : new AzureOpenAiService({
          endpoint: env.AZURE_OPENAI_ENDPOINT,
          apiKey: env.AZURE_OPENAI_API_KEY,
          apiVersion: env.AZURE_OPENAI_API_VERSION,
          chatDeployment: env.AZURE_OPENAI_CHAT_DEPLOYMENT,
          embeddingDeployment: env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
        });

  const search: SearchService =
    env.SEARCH_PROVIDER === "azure"
      ? new AzureAiSearchService({
          endpoint: env.AZURE_AI_SEARCH_ENDPOINT,
          apiKey: env.AZURE_AI_SEARCH_API_KEY,
          indexName: env.AZURE_AI_SEARCH_INDEX
        })
      : new AzureAiSearchService({
          endpoint: env.AZURE_AI_SEARCH_ENDPOINT,
          apiKey: env.AZURE_AI_SEARCH_API_KEY,
          indexName: env.AZURE_AI_SEARCH_INDEX
        });

  const ragService = new RagService({ ai, search, cache, topK: env.RAG_TOP_K });
  const ingestDocumentService = new IngestDocumentService({
    env,
    logger,
    ai,
    search,
    storage,
    documentsRepo
  });
  const chatService = new ChatService({ chatRepo, ragService });

  return {
    logger,
    env,
    ai,
    search,
    storage,
    cache,
    documentsRepo,
    chatRepo,
    ragService,
    ingestDocumentService,
    chatService
  };
}

