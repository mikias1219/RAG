export type Chunk = {
  id: string;
  workspaceId?: string | null;
  documentId: string;
  chunkIndex: number;
  text: string;
  tokenCountApprox: number;
  createdAt: Date;
};

