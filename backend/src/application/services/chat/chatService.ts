import type { ChatRepository } from "@/domain/ports/chatRepository";
import type { RagService } from "@/application/services/rag/ragService";

export class ChatService {
  constructor(
    private readonly deps: {
      chatRepo: ChatRepository;
      ragService: RagService;
    }
  ) {}

  async ask(input: { tenantId: string; userId: string; sessionId?: string; question: string }) {
    const session =
      input.sessionId ??
      (await this.deps.chatRepo.createSession({ tenantId: input.tenantId, userId: input.userId })).id;

    await this.deps.chatRepo.appendMessage({
      tenantId: input.tenantId,
      sessionId: session,
      role: "user",
      content: input.question
    });

    const result = await this.deps.ragService.answerQuestion({
      tenantId: input.tenantId,
      question: input.question
    });

    await this.deps.chatRepo.appendMessage({
      tenantId: input.tenantId,
      sessionId: session,
      role: "assistant",
      content: result.answer
    });

    return { sessionId: session, ...result };
  }
}

