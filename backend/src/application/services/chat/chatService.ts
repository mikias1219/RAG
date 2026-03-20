import type { ChatRepository } from "@/domain/ports/chatRepository";
import type { RagService } from "@/application/services/rag/ragService";
import type { DocumentRepository } from "@/domain/ports/documentRepository";
import { badRequest, forbidden } from "@/domain/errors/AppError";

export class ChatService {
  constructor(
    private readonly deps: {
      chatRepo: ChatRepository;
      ragService: RagService;
      documentsRepo: DocumentRepository;
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
    const documentIds = Array.from(new Set((input.documentIds ?? []).filter(Boolean)));
    if (documentIds.length === 0) {
      throw badRequest("Select at least one document before asking a question.");
    }

    for (const documentId of documentIds) {
      const doc = await this.deps.documentsRepo.getDocument({
        tenantId: input.tenantId,
        workspaceId: input.workspaceId ?? null,
        documentId
      });
      if (!doc) {
        throw forbidden("One or more selected documents are not accessible in this workspace.");
      }
    }

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
      documentIds
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

