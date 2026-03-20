import type { ChatResponse, IngestionJob, PaginatedDocuments, WorkspaceSummary } from "./types";
import { getAuthToken } from "./auth";

const baseUrl = "/backend-api";

async function handle(res: Response) {
  if (!res.ok) {
    let message = `Request failed with ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.error?.message === "string") message = body.error.message;
      else if (typeof body?.message === "string") message = body.message;
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

export type WorkflowDto = {
  id: string;
  tenantId: string;
  workspaceId: string | null;
  name: string;
  description: string | null;
  enabled: boolean;
  rulesJson: string;
  rules: unknown[];
  createdAt: string;
  updatedAt: string;
};

export async function listWorkflows(limit = 50): Promise<{ items: WorkflowDto[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${baseUrl}/workflows?${params.toString()}`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle(res);
}

export async function createWorkflow(input: {
  name: string;
  description?: string;
  rules: Array<{ condition: Record<string, unknown>; action: Record<string, unknown> }>;
}): Promise<{ workflow: WorkflowDto }> {
  const res = await fetch(`${baseUrl}/workflows`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });
  return handle(res);
}

export async function listAgents(): Promise<{ agents: unknown[] }> {
  const res = await fetch(`${baseUrl}/agents`, { method: "GET", headers: authHeaders() });
  return handle(res);
}

export async function runAgent(agentId: string, context: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}/agents/${agentId}/run`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ context })
  });
  return handle(res);
}

export type AuditLogRow = {
  id: string;
  tenantId: string;
  workspaceId: string | null;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadataJson: string;
  metadata: unknown;
  requestId: string | null;
  createdAt: string;
};

export async function listAuditLogs(limit = 100): Promise<{ items: AuditLogRow[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${baseUrl}/audit?${params.toString()}`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle(res);
}

export type WorkflowEvaluateResult = { matched: boolean; workflowId: string };

export async function evaluateWorkflow(
  workflowId: string,
  context: Record<string, unknown>
): Promise<WorkflowEvaluateResult> {
  const res = await fetch(`${baseUrl}/workflows/${workflowId}/evaluate`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ context })
  });
  return handle(res);
}

