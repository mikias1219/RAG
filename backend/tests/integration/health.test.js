"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("@/app");
const env_1 = require("@/config/env");
const logger_1 = require("@/config/logger");
describe("GET /api/health", () => {
    it("returns ok", async () => {
        process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://x:y@localhost:5432/z?schema=public";
        process.env.AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "UseDevelopmentStorage=true";
        process.env.AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT ?? "https://example.openai.azure.com";
        process.env.AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY ?? "dummy";
        process.env.AZURE_AI_SEARCH_ENDPOINT = process.env.AZURE_AI_SEARCH_ENDPOINT ?? "https://example.search.windows.net";
        process.env.AZURE_AI_SEARCH_API_KEY = process.env.AZURE_AI_SEARCH_API_KEY ?? "dummy";
        const env = (0, env_1.loadEnv)(process.env);
        const logger = (0, logger_1.createLogger)(env);
        const app = (0, app_1.buildApp)({ env, logger });
        const res = await (0, supertest_1.default)(app).get("/api/health");
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
});
//# sourceMappingURL=health.test.js.map