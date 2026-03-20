import type { ChatResponse, IngestionJob, PaginatedDocuments, WorkspaceSummary } from "./types";
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

export async function askQuestion(input: {
  question: string;
  sessionId?: string;
  documentIds?: string[];
}): Promise<ChatResponse> {
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

export async function listIngestionJobs(limit = 50): Promise<{ items: IngestionJob[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${baseUrl}/documents/jobs?${params.toString()}`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle(res);
}

export async function retryIngestionJob(jobId: string): Promise<{ jobId: string; status: string }> {
  const res = await fetch(`${baseUrl}/documents/jobs/${jobId}/retry`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" })
  });
  return handle(res);
}

export async function login(input: { email: string; password: string }) {
  const email = input.email.trim();
  const password = input.password.trim();
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      username: email,
      password,
      pass: password
    })
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

export async function listWorkspaces(): Promise<{ items: WorkspaceSummary[] }> {
  const res = await fetch(`${baseUrl}/auth/workspaces`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle(res);
}

export async function switchWorkspace(workspaceId: string) {
  const res = await fetch(`${baseUrl}/auth/switch-workspace`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ workspaceId })
  });
  return handle(res);
}

export async function getWorkspaceProfile() {
  const res = await fetch(`${baseUrl}/auth/workspace-profile`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle(res);
}

export async function updateWorkspaceProfile(input: {
  industry: "general" | "banking" | "construction";
  domainFocus?: string;
}) {
  const res = await fetch(`${baseUrl}/auth/workspace-profile`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });
  return handle(res);
}

export async function updateMe(input: { displayName: string }) {
  const res = await fetch(`${baseUrl}/auth/me`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });
  return handle(res);
}

export async function listUsers() {
  const res = await fetch(`${baseUrl}/auth/users`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle(res);
}

export async function updateUserStatus(userId: string, status: "approved" | "rejected") {
  const res = await fetch(`${baseUrl}/auth/users/${userId}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status })
  });
  return handle(res);
}

export async function updateUserRole(userId: string, role: "user" | "admin") {
  const res = await fetch(`${baseUrl}/auth/users/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ role })
  });
  return handle(res);
}

