import type { ChatRepository } from "@/domain/ports/chatRepository";
import type { ChatMessage, ChatSession } from "@/domain/entities/ChatSession";
import { getPrisma } from "@/infrastructure/db/prismaClient";

export class PrismaChatRepository implements ChatRepository {
  private readonly prisma = getPrisma();

  async createSession(input: { tenantId: string; userId: string }): Promise<ChatSession> {
    const created = await this.prisma.chatSession.create({
      data: { tenantId: input.tenantId, userId: input.userId }
    });
    return created as unknown as ChatSession;
  }

  async appendMessage(input: {
    tenantId: string;
    sessionId: string;
    role: ChatMessage["role"];
    content: string;
  }): Promise<ChatMessage> {
    const created = await this.prisma.chatMessage.create({
      data: {
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        role: input.role,
        content: input.content
      }
    });
    return created as unknown as ChatMessage;
  }

  async listMessages(input: { tenantId: string; sessionId: string; limit: number }): Promise<ChatMessage[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { tenantId: input.tenantId, sessionId: input.sessionId },
      orderBy: { createdAt: "asc" },
      take: Math.min(500, Math.max(1, input.limit))
    });
    return messages as unknown as ChatMessage[];
  }
}

