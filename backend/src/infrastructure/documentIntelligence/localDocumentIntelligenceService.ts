import { badRequest } from "@/domain/errors/AppError";
import type { DocumentIntelligenceService } from "@/domain/ports/documentIntelligenceService";

export class LocalDocumentIntelligenceService implements DocumentIntelligenceService {
  async extractText(): Promise<string> {
    throw badRequest(
      "Document Intelligence is required for PDF and image analysis in this environment."
    );
  }
}

