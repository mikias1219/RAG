import { badRequest } from "@/domain/errors/AppError";
import type { DocumentIntelligenceService } from "@/domain/ports/documentIntelligenceService";

export class AzureDocumentIntelligenceService implements DocumentIntelligenceService {
  constructor(
    private readonly opts: {
      endpoint?: string;
      apiKey?: string;
      modelId: string;
    }
  ) {}

  async extractText(input: { bytes: Buffer; contentType: string; filename: string }) {
    if (!this.opts.endpoint || !this.opts.apiKey) {
      throw badRequest(
        "Document Intelligence is not configured. Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_API_KEY."
      );
    }

    const endpoint = this.opts.endpoint.replace(/\/+$/, "");
    const url = `${endpoint}/documentintelligence/documentModels/${encodeURIComponent(this.opts.modelId)}:analyze?api-version=2024-02-29-preview`;
    const start = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": input.contentType || "application/octet-stream",
        "Ocp-Apim-Subscription-Key": this.opts.apiKey
      },
      body: new Uint8Array(input.bytes)
    });
    if (!start.ok) {
      const body = await start.text().catch(() => "");
      throw badRequest(`Document analysis start failed (${start.status}): ${body || start.statusText}`);
    }

    const operationLocation = start.headers.get("operation-location");
    if (!operationLocation) {
      throw badRequest("Document analysis failed: missing operation-location header");
    }

    let tries = 0;
    while (tries < 20) {
      tries += 1;
      await sleep(1500);
      const poll = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": this.opts.apiKey }
      });
      if (!poll.ok) {
        const body = await poll.text().catch(() => "");
        throw badRequest(`Document analysis polling failed (${poll.status}): ${body || poll.statusText}`);
      }
      const body = (await poll.json()) as any;
      if (body.status === "succeeded") {
        const text = Array.isArray(body.analyzeResult?.content)
          ? body.analyzeResult.content.join("\n")
          : String(body.analyzeResult?.content ?? "");
        return text.trim();
      }
      if (body.status === "failed") {
        throw badRequest(`Document analysis failed for ${input.filename}`);
      }
    }

    throw badRequest("Document analysis timed out. Please retry.");
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

