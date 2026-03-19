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

  CACHE_PROVIDER: z.enum(["memory", "redis"]).default("memory")
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const message = JSON.stringify(flattened.fieldErrors, null, 2);
    throw new Error(`Invalid environment variables:\n${message}`);
  }
  return parsed.data;
}

