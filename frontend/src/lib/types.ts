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

export type UserSummary = {
  id: string;
  email: string;
  displayName?: string | null;
  role: string;
  status: string;
  createdAt: string;
};

export type WorkspaceSummary = {
  id: string;
  tenantId: string;
  companyId: string;
  slug: string;
  displayName: string;
  membershipRole: string;
  industry?: string;
  domainFocus?: string | null;
};

export type PaginatedDocuments = {
  page: number;
  pageSize: number;
  total: number;
  items: DocumentSummary[];
};

export type IngestionJob = {
  id: string;
  tenantId: string;
  documentId: string;
  filename: string;
  contentType: string;
  status: "queued" | "processing" | "indexed" | "failed" | string;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};

