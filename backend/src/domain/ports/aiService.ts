export type EmbeddingResult = {
  vector: number[];
  model: string;
};

export type ChatMessageInput = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionResult = {
  text: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export interface AiService {
  embedText(input: { text: string }): Promise<EmbeddingResult>;
  chatComplete(input: { messages: ChatMessageInput[] }): Promise<ChatCompletionResult>;
}

