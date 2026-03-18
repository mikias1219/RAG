export type Document = {
  id: string;
  tenantId: string;
  filename: string;
  contentType: string;
  blobUrl: string;
  sizeBytes: number;
  createdAt: Date;
};

