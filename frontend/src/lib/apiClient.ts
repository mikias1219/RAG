import type { ChatResponse, PaginatedDocuments } from "./types";

const baseUrl = "/backend-api";

async function handle(res: Response) {
  if (!res.ok) {
    let message = `Request failed with ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
}

export async function askQuestion(input: { question: string; sessionId?: string }): Promise<ChatResponse> {
  const res = await fetch(`${baseUrl}/chat/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return handle(res);
}

export async function listDocuments(page = 1, pageSize = 25): Promise<PaginatedDocuments> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });
  const res = await fetch(`${baseUrl}/documents?${params.toString()}`, {
    method: "GET"
  });
  return handle(res);
}

