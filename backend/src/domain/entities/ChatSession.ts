export type ChatSession = {
  id: string;
  tenantId: string;
  userId: string;
  createdAt: Date;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
};

