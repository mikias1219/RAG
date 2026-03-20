import type { ChatRepository } from "@/domain/ports/chatRepository";
import type { ChatMessage, ChatSession } from "@/domain/entities/ChatSession";
import { getPrisma } from "@/infrastructure/db/prismaClient";

export class PrismaChatRepository implements ChatRepository {
  private readonly prisma = getPrisma();
  private readonly prismaChatSession = (this.prisma as any).chatSession;
  private readonly prismaChatMessage = (this.prisma as any).chatMessage;

  private workspaceCompatibleWhere(input: { tenantId: string; workspaceId?: string | null }) {
    if (!input.workspaceId) return { tenantId: input.tenantId };
    return {
      OR: [{ workspaceId: input.workspaceId }, { tenantId: input.tenantId, workspaceId: null }]
    };
  }

  async createSession(input: { tenantId: string; workspaceId?: string | null; userId: string }): Promise<ChatSession> {
    const created = await this.prismaChatSession.create({
      data: { tenantId: input.tenantId, workspaceId: input.workspaceId ?? null, userId: input.userId }
    });
    return created as unknown as ChatSession;
  }

  async appendMessage(input: {
    tenantId: string;
    workspaceId?: string | null;
    sessionId: string;
    role: ChatMessage["role"];
    content: string;
  }): Promise<ChatMessage> {
    const created = await this.prismaChatMessage.create({
      data: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId ?? null,
        sessionId: input.sessionId,
        role: input.role,
        content: input.content
      }
    });
    return created as unknown as ChatMessage;
  }

  async listMessages(input: {
    tenantId: string;
    workspaceId?: string | null;
    sessionId: string;
    limit: number;
  }): Promise<ChatMessage[]> {
    const messages = await this.prismaChatMessage.findMany({
      where: {
        sessionId: input.sessionId,
        ...this.workspaceCompatibleWhere({ tenantId: input.tenantId, workspaceId: input.workspaceId })
      },
      orderBy: { createdAt: "asc" },
      take: Math.min(500, Math.max(1, input.limit))
    });
    return messages as unknown as ChatMessage[];
  }
}

