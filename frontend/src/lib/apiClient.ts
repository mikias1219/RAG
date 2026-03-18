import type { ChatResponse, PaginatedDocuments } from "./types";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL!;

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
  const url = new URL(`${baseUrl}/documents`, "http://dummy");
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));
  const res = await fetch(url.toString().replace("http://dummy", baseUrl), {
    method: "GET"
  });
  return handle(res);
}

