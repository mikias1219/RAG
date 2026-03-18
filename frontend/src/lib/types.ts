export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type ChatSource = {
  documentId: string;
  chunkId: string;
  score: number;
  filename: string;
  url: string;
};

export type ChatResponse = {
  sessionId: string;
  answer: string;
  sources: ChatSource[];
};

export type DocumentSummary = {
  id: string;
  filename: string;
  contentType: string;
  blobUrl: string;
  sizeBytes: number;
  createdAt: string;
};

export type PaginatedDocuments = {
  page: number;
  pageSize: number;
  total: number;
  items: DocumentSummary[];
};

