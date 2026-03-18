import type { ChatMessage, ChatSession } from "@/domain/entities/ChatSession";

export interface ChatRepository {
  createSession(input: { tenantId: string; userId: string }): Promise<ChatSession>;
  appendMessage(input: { tenantId: string; sessionId: string; role: ChatMessage["role"]; content: string }): Promise<ChatMessage>;
  listMessages(input: { tenantId: string; sessionId: string; limit: number }): Promise<ChatMessage[]>;
}

