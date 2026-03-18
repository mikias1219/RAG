import { BlobServiceClient } from "@azure/storage-blob";
import type { StorageService, UploadedObject } from "@/domain/ports/storageService";
import { badRequest } from "@/domain/errors/AppError";

export class AzureBlobStorageService implements StorageService {
  private readonly blobService: BlobServiceClient;

  constructor(
    private readonly opts: {
      connectionString?: string;
      containerName: string;
    }
  ) {
    if (!opts.connectionString) {
      throw badRequest("AZURE_STORAGE_CONNECTION_STRING is required when STORAGE_PROVIDER=azure");
    }
    this.blobService = BlobServiceClient.fromConnectionString(opts.connectionString);
  }

  async putObject(input: {
    tenantId: string;
    key: string;
    contentType: string;
    data: Buffer;
  }): Promise<UploadedObject> {
    const container = this.blobService.getContainerClient(this.opts.containerName);
    await container.createIfNotExists();

    const blobKey = `${sanitize(input.tenantId)}/${input.key}`;
    const blob = container.getBlockBlobClient(blobKey);

    await blob.uploadData(input.data, {
      blobHTTPHeaders: { blobContentType: input.contentType }
    });

    return { url: blob.url, key: blobKey };
  }
}

function sanitize(s: string) {
  return s.replace(/[^a-zA-Z0-9-_]/g, "_");
}

