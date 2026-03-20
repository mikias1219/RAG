import type { ChatMessage, ChatSession } from "@/domain/entities/ChatSession";

export interface ChatRepository {
  createSession(input: { tenantId: string; workspaceId?: string | null; userId: string }): Promise<ChatSession>;
  appendMessage(input: {
    tenantId: string;
    workspaceId?: string | null;
    sessionId: string;
    role: ChatMessage["role"];
    content: string;
  }): Promise<ChatMessage>;
  listMessages(input: {
    tenantId: string;
    workspaceId?: string | null;
    sessionId: string;
    limit: number;
  }): Promise<ChatMessage[]>;
}

