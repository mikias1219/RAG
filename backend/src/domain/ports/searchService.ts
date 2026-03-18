export type SearchChunkDoc = {
  id: string;
  tenantId: string;
  documentId: string;
  chunkId: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  source: {
    filename: string;
    blobUrl: string;
    contentType: string;
  };
  createdAtIso: string;
};

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  score: number;
  chunkIndex: number;
  text: string;
  source: {
    filename: string;
    blobUrl: string;
  };
};

export interface SearchService {
  upsertChunks(input: { chunks: SearchChunkDoc[] }): Promise<void>;
  querySimilar(input: { tenantId: string; embedding: number[]; topK: number }): Promise<RetrievedChunk[]>;
}

