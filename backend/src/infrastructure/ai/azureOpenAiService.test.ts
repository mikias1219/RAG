import { AzureOpenAiService } from "./azureOpenAiService";

describe("AzureOpenAiService", () => {
  it("throws if endpoint or apiKey missing", () => {
    expect(
      () =>
        new AzureOpenAiService({
          endpoint: undefined,
          apiKey: "key",
          apiVersion: "2024-02-15-preview",
          chatDeployment: "gpt-4o-mini",
          embeddingDeployment: "text-embedding-3-small"
        })
    ).toThrow("AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are required");
  });

  it("constructs with valid config", () => {
    const service = new AzureOpenAiService({
      endpoint: "https://example.openai.azure.com",
      apiKey: "test-key",
      apiVersion: "2024-02-15-preview",
      chatDeployment: "gpt-4o-mini",
      embeddingDeployment: "text-embedding-3-small"
    });
    expect(service).toBeDefined();
  });
});
