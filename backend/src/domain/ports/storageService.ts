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
}

