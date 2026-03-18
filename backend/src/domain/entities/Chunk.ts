export type Chunk = {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  tokenCountApprox: number;
  createdAt: Date;
};

