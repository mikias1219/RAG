import type { Request, Response } from "express";
import type { AppEnv } from "@/config/env";

export function healthController(env: AppEnv) {
  return async function health(_req: Request, res: Response) {
    const providers = {
      storage: env.STORAGE_PROVIDER,
      search: env.SEARCH_PROVIDER,
      ai: env.AI_PROVIDER,
      documentIntelligence: env.DOCUMENT_INTELLIGENCE_PROVIDER
    };
    const readiness = {
      storageReady:
        env.STORAGE_PROVIDER !== "azure" || Boolean(env.AZURE_STORAGE_CONNECTION_STRING),
      searchReady:
        env.SEARCH_PROVIDER !== "azure" ||
        (Boolean(env.AZURE_AI_SEARCH_ENDPOINT) && Boolean(env.AZURE_AI_SEARCH_API_KEY)),
      aiReady:
        env.AI_PROVIDER !== "azure-openai" ||
        (Boolean(env.AZURE_OPENAI_ENDPOINT) && Boolean(env.AZURE_OPENAI_API_KEY)),
      documentIntelligenceReady:
        env.DOCUMENT_INTELLIGENCE_PROVIDER !== "azure" ||
        (Boolean(env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) &&
          Boolean(env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY))
    };
    res.json({
      ok: true,
      service: "ai102-backend",
      time: new Date().toISOString(),
      providers,
      readiness
    });
  };
}

