export type ChatSession = {
  id: string;
  tenantId: string;
  workspaceId?: string | null;
  userId: string;
  createdAt: Date;
};

export type ChatMessage = {
  id: string;
  workspaceId?: string | null;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
};

