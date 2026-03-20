import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.string().default("info"),
  JWT_SECRET: z.string().min(16).default("dev-only-change-this-secret"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().optional(),

  DATABASE_URL: z.string().min(1),

  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(104857600),
  CHUNK_SIZE: z.coerce.number().int().positive().default(900),
  CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(150),
  RAG_TOP_K: z.coerce.number().int().positive().default(8),

  STORAGE_PROVIDER: z.enum(["azure", "local"]).default("azure"),
  AZURE_STORAGE_ACCOUNT: z.string().optional(),
  AZURE_STORAGE_CONTAINER: z.string().default("documents"),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),

  SEARCH_PROVIDER: z.enum(["azure", "local"]).default("azure"),
  AZURE_AI_SEARCH_ENDPOINT: z.string().optional(),
  AZURE_AI_SEARCH_API_KEY: z.string().optional(),
  AZURE_AI_SEARCH_INDEX: z.string().default("doc-chunks"),

  DOCUMENT_INTELLIGENCE_PROVIDER: z.enum(["azure", "none"]).default("none"),
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: z.string().optional(),
  AZURE_DOCUMENT_INTELLIGENCE_API_KEY: z.string().optional(),
  AZURE_DOCUMENT_INTELLIGENCE_MODEL: z.string().default("prebuilt-layout"),

  AI_PROVIDER: z.enum(["azure-openai", "local"]).default("azure-openai"),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().default("2024-02-15-preview"),
  AZURE_OPENAI_CHAT_DEPLOYMENT: z.string().default("gpt-4o-mini"),
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: z.string().default("text-embedding-3-small"),

  CACHE_PROVIDER: z.enum(["memory", "redis"]).default("memory"),

  REDIS_URL: z.string().optional(),
  INGESTION_QUEUE_ENABLED: z.coerce.boolean().default(false),
  /** Optional Python AI sidecar for embeddings/RAG (e.g. http://ai-python:8000) */
  PYTHON_AI_BASE_URL: z.string().url().optional(),

  AZURE_AD_B2C_TENANT: z.string().optional(),
  AZURE_AD_B2C_POLICY: z.string().optional(),
  AZURE_AD_B2C_ISSUER: z.string().optional(),
  AZURE_AD_B2C_JWKS_URI: z.string().url().optional()
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const message = JSON.stringify(flattened.fieldErrors, null, 2);
    throw new Error(`Invalid environment variables:\n${message}`);
  }
  const env = parsed.data;
  if (env.INGESTION_QUEUE_ENABLED && !env.REDIS_URL) {
    throw new Error("REDIS_URL is required when INGESTION_QUEUE_ENABLED=true");
  }
  if (env.STORAGE_PROVIDER === "azure" && !env.AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is required when STORAGE_PROVIDER=azure");
  }
  if (env.SEARCH_PROVIDER === "azure" && (!env.AZURE_AI_SEARCH_ENDPOINT || !env.AZURE_AI_SEARCH_API_KEY)) {
    throw new Error("AZURE_AI_SEARCH_ENDPOINT and AZURE_AI_SEARCH_API_KEY are required when SEARCH_PROVIDER=azure");
  }
  if (env.AI_PROVIDER === "azure-openai" && (!env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_API_KEY)) {
    throw new Error("AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are required when AI_PROVIDER=azure-openai");
  }
  if (
    env.DOCUMENT_INTELLIGENCE_PROVIDER === "azure" &&
    (!env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || !env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY)
  ) {
    throw new Error(
      "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_API_KEY are required when DOCUMENT_INTELLIGENCE_PROVIDER=azure"
    );
  }
  return env;
}

