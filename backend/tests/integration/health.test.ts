import request from "supertest";
import { buildApp } from "@/app";
import { loadEnv } from "@/config/env";
import { createLogger } from "@/config/logger";

describe("GET /api/health", () => {
  it("returns ok", async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://x:y@localhost:5432/z?schema=public";
    process.env.AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "UseDevelopmentStorage=true";
    process.env.AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT ?? "https://example.openai.azure.com";
    process.env.AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY ?? "dummy";
    process.env.AZURE_AI_SEARCH_ENDPOINT = process.env.AZURE_AI_SEARCH_ENDPOINT ?? "https://example.search.windows.net";
    process.env.AZURE_AI_SEARCH_API_KEY = process.env.AZURE_AI_SEARCH_API_KEY ?? "dummy";

    const env = loadEnv(process.env);
    const logger = createLogger(env);
    const app = buildApp({ env, logger });

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

