import type { ChatRepository } from "@/domain/ports/chatRepository";
import type { RagService } from "@/application/services/rag/ragService";

export class ChatService {
  constructor(
    private readonly deps: {
      chatRepo: ChatRepository;
      ragService: RagService;
    }
  ) {}

  async ask(input: {
    tenantId: string;
    workspaceId?: string | null;
    userId: string;
    sessionId?: string;
    question: string;
    documentIds?: string[];
  }) {
    const session =
      input.sessionId ??
      (await this.deps.chatRepo.createSession({
        tenantId: input.tenantId,
        workspaceId: input.workspaceId ?? null,
        userId: input.userId
      })).id;

    await this.deps.chatRepo.appendMessage({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId ?? null,
      sessionId: session,
      role: "user",
      content: input.question
    });

    const result = await this.deps.ragService.answerQuestion({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId ?? null,
      question: input.question,
      documentIds: input.documentIds
    });

    await this.deps.chatRepo.appendMessage({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId ?? null,
      sessionId: session,
      role: "assistant",
      content: result.answer
    });

    return { sessionId: session, ...result };
  }
}

