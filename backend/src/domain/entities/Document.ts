export type Document = {
  id: string;
  tenantId: string;
  workspaceId?: string | null;
  filename: string;
  contentType: string;
  blobUrl: string;
  sizeBytes: number;
  createdAt: Date;
};

