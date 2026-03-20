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

    const endpointRoot = normalizeEndpointRoot(this.opts.endpoint);
    const analyzePaths = [
      `/documentintelligence/documentModels/${encodeURIComponent(this.opts.modelId)}:analyze?api-version=2024-02-29-preview`,
      `/documentintelligence/documentModels/${encodeURIComponent(this.opts.modelId)}:analyze?api-version=2023-10-31-preview`,
      `/formrecognizer/documentModels/${encodeURIComponent(this.opts.modelId)}:analyze?api-version=2023-07-31`
    ];
    const start = await startAnalysis({
      endpointRoot,
      analyzePaths,
      apiKey: this.opts.apiKey,
      input
    });

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

function normalizeEndpointRoot(endpoint: string) {
  return endpoint
    .replace(/\/+$/, "")
    .replace(/\/documentintelligence$/i, "")
    .replace(/\/formrecognizer$/i, "");
}

type StartAnalysisInput = {
  endpointRoot: string;
  analyzePaths: string[];
  apiKey: string;
  input: { bytes: Buffer; contentType: string; filename: string };
};

async function startAnalysis(opts: StartAnalysisInput): Promise<Response> {
  let lastErrorMessage = "";
  let lastStatus = 0;
  for (const path of opts.analyzePaths) {
    const start = await fetch(`${opts.endpointRoot}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": opts.input.contentType || "application/octet-stream",
        "Ocp-Apim-Subscription-Key": opts.apiKey
      },
      body: new Uint8Array(opts.input.bytes)
    });
    if (start.ok) return start;
    lastStatus = start.status;
    lastErrorMessage = await start.text().catch(() => start.statusText);
    if (start.status !== 404) break;
  }
  throw badRequest(
    `Document analysis start failed (${lastStatus}): ${lastErrorMessage || "Unable to start analysis"}`
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

