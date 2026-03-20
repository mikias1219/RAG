import { ChatService } from "@/application/services/chat/chatService";

describe("ChatService selected-document enforcement", () => {
  const baseInput = {
    tenantId: "t1",
    workspaceId: "w1",
    userId: "u1",
    question: "What is in this file?"
  };

  it("rejects when no document is selected", async () => {
    const service = new ChatService({
      chatRepo: {
        createSession: jest.fn(),
        appendMessage: jest.fn(),
        listMessages: jest.fn()
      } as any,
      ragService: { answerQuestion: jest.fn() } as any,
      documentsRepo: { getDocument: jest.fn() } as any
    });

    await expect(service.ask({ ...baseInput, documentIds: [] })).rejects.toThrow(
      "Select at least one document"
    );
  });

  it("rejects inaccessible selected documents", async () => {
    const service = new ChatService({
      chatRepo: {
        createSession: jest.fn(),
        appendMessage: jest.fn(),
        listMessages: jest.fn()
      } as any,
      ragService: { answerQuestion: jest.fn() } as any,
      documentsRepo: { getDocument: jest.fn(async () => null) } as any
    });

    await expect(service.ask({ ...baseInput, documentIds: ["doc-1"] })).rejects.toThrow(
      "not accessible"
    );
  });
});
