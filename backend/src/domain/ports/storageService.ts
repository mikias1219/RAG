export type UploadedObject = {
  url: string;
  key: string;
};

export interface StorageService {
  putObject(input: {
    tenantId: string;
    key: string;
    contentType: string;
    data: Buffer;
  }): Promise<UploadedObject>;
  /** Fetch object by full blob key returned from putObject (container-relative path). */
  getObject(input: { blobKey: string }): Promise<Buffer>;
}

