export interface DocumentIntelligenceService {
  extractText(input: { bytes: Buffer; contentType: string; filename: string }): Promise<string>;
}

