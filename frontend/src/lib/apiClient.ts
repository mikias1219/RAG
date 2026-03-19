import type { ChatResponse, PaginatedDocuments } from "./types";
import { getAuthToken } from "./auth";

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

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAuthToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function askQuestion(input: { question: string; sessionId?: string }): Promise<ChatResponse> {
  const res = await fetch(`${baseUrl}/chat/ask`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
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
    method: "GET",
    headers: authHeaders()
  });
  return handle(res);
}

export async function login(input: { email: string; password: string }) {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return handle(res);
}

export async function register(input: { email: string; password: string; displayName?: string }) {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return handle(res);
}

export async function loginWithGoogle(idToken: string) {
  const res = await fetch(`${baseUrl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  return handle(res);
}

export async function getMe() {
  const res = await fetch(`${baseUrl}/auth/me`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle(res);
}

