import OpenAI from "openai";
import type { AiService, ChatMessageInput, ChatCompletionResult, EmbeddingResult } from "@/domain/ports/aiService";
import { badRequest } from "@/domain/errors/AppError";
import { withRetry } from "@/shared/utils/retry";

export class AzureOpenAiService implements AiService {
  private readonly chatClient: OpenAI;
  private readonly embeddingClient: OpenAI;

  constructor(
    private readonly opts: {
      endpoint?: string;
      apiKey?: string;
      apiVersion: string;
      chatDeployment: string;
      embeddingDeployment: string;
    }
  ) {
    if (!opts.endpoint || !opts.apiKey) {
      throw badRequest("AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are required when AI_PROVIDER=azure-openai");
    }

    const endpoint = opts.endpoint.replace(/\/+$/, "");

    // Azure OpenAI deployment-scoped endpoints:
    // /openai/deployments/{deployment}/chat/completions
    // /openai/deployments/{deployment}/embeddings
    this.chatClient = new OpenAI({
      apiKey: opts.apiKey,
      baseURL: `${endpoint}/openai/deployments/${opts.chatDeployment}`,
      defaultQuery: { "api-version": opts.apiVersion },
      defaultHeaders: { "api-key": opts.apiKey }
    });

    this.embeddingClient = new OpenAI({
      apiKey: opts.apiKey,
      baseURL: `${endpoint}/openai/deployments/${opts.embeddingDeployment}`,
      defaultQuery: { "api-version": opts.apiVersion },
      defaultHeaders: { "api-key": opts.apiKey }
    });
  }

  async embedText(input: { text: string }): Promise<EmbeddingResult> {
    const res = await withRetry(
      () =>
        this.embeddingClient.embeddings.create({
          model: this.opts.embeddingDeployment,
          input: input.text
        }),
      { maxAttempts: 3, delayMs: 500 }
    );

    const item = res.data[0];
    if (!item) {
      throw new Error("No embedding returned from Azure OpenAI");
    }

    return { vector: item.embedding, model: this.opts.embeddingDeployment };
  }

  async chatComplete(input: { messages: ChatMessageInput[] }): Promise<ChatCompletionResult> {
    if (input.messages.length === 0) {
      throw new Error("At least one message is required");
    }

    const res = await withRetry(
      () =>
        this.chatClient.chat.completions.create({
          model: this.opts.chatDeployment,
          messages: input.messages,
          temperature: 0.7,
          max_tokens: 2000
        }),
      { maxAttempts: 2, delayMs: 1000 }
    );

    const text = res.choices[0]?.message?.content ?? "";
    if (!text) {
      throw new Error("No response content from Azure OpenAI");
    }

    return {
      text,
      model: this.opts.chatDeployment,
      usage: {
        inputTokens: res.usage?.prompt_tokens,
        outputTokens: res.usage?.completion_tokens
      }
    };
  }
}

