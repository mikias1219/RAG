import { loadEnv } from "@/config/env";

describe("env readiness validation", () => {
  const base = {
    NODE_ENV: "test",
    PORT: "8080",
    JWT_SECRET: "1234567890123456",
    DATABASE_URL: "postgresql://x:y@localhost:5432/z?schema=public",
    STORAGE_PROVIDER: "azure",
    AZURE_STORAGE_CONNECTION_STRING: "UseDevelopmentStorage=true",
    SEARCH_PROVIDER: "azure",
    AZURE_AI_SEARCH_ENDPOINT: "https://example.search.windows.net",
    AZURE_AI_SEARCH_API_KEY: "dummy",
    AI_PROVIDER: "azure-openai",
    AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
    AZURE_OPENAI_API_KEY: "dummy",
    DOCUMENT_INTELLIGENCE_PROVIDER: "none"
  } as Record<string, string>;

  it("throws when document intelligence is azure without required vars", () => {
    const raw = { ...base, DOCUMENT_INTELLIGENCE_PROVIDER: "azure" };
    expect(() => loadEnv(raw as any)).toThrow("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT");
  });
});
