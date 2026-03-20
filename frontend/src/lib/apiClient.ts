import type {
  ChatResponse,
  IngestionJob,
  PaginatedDocuments,
  UserSummary,
  WorkspaceProfileDetail,
  WorkspaceSummary
} from "./types";
import { getAuthToken } from "./auth";

const baseUrl = "/backend-api";

/** Parse JSON or tolerate empty body (e.g. 204 No Content from PATCH). */
async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Invalid response from server (${res.status})`);
  }
}

async function handle<T = Record<string, unknown>>(res: Response): Promise<T> {
  const raw = await parseResponseBody(res);
  const obj: Record<string, unknown> =
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  if (!res.ok) {
    let message = `Request failed with ${res.status}`;
    const err = obj.error as Record<string, unknown> | undefined;
    if (typeof err?.message === "string") message = err.message;
    else if (typeof obj.message === "string") message = obj.message;
    throw new Error(message);
  }
  return obj as T;
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
  return handle<ChatResponse>(res);
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
  return handle<PaginatedDocuments>(res);
}

export async function listIngestionJobs(limit = 50): Promise<{ items: IngestionJob[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${baseUrl}/documents/jobs?${params.toString()}`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle<{ items: IngestionJob[] }>(res);
}

export async function retryIngestionJob(jobId: string): Promise<{ jobId: string; status: string }> {
  const res = await fetch(`${baseUrl}/documents/jobs/${jobId}/retry`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" })
  });
  return handle<{ jobId: string; status: string }>(res);
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
  return handle<{ token: string }>(res);
}

export async function register(input: { email: string; password: string; displayName?: string }) {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return handle<{ token: string }>(res);
}

export async function loginWithGoogle(idToken: string) {
  const res = await fetch(`${baseUrl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  return handle<{ token: string }>(res);
}

export async function getMe() {
  const res = await fetch(`${baseUrl}/auth/me`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle<{
    user: UserSummary;
    workspaces: WorkspaceSummary[];
  }>(res);
}

export async function listWorkspaces(): Promise<{ items: WorkspaceSummary[] }> {
  const res = await fetch(`${baseUrl}/auth/workspaces`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle<{ items: WorkspaceSummary[] }>(res);
}

export async function switchWorkspace(workspaceId: string) {
  const res = await fetch(`${baseUrl}/auth/switch-workspace`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ workspaceId })
  });
  return handle<{ token?: string }>(res);
}

export async function getWorkspaceProfile() {
  const res = await fetch(`${baseUrl}/auth/workspace-profile`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle<{ workspace: WorkspaceProfileDetail }>(res);
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
  return handle<{ workspace: WorkspaceProfileDetail }>(res);
}

export async function updateMe(input: { displayName: string }) {
  const res = await fetch(`${baseUrl}/auth/me`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });
  return handle<Record<string, unknown>>(res);
}

export async function listUsers() {
  const res = await fetch(`${baseUrl}/auth/users`, {
    method: "GET",
    headers: authHeaders()
  });
  return handle<{ items: UserSummary[] }>(res);
}

export async function updateUserStatus(userId: string, status: "approved" | "rejected") {
  const res = await fetch(`${baseUrl}/auth/users/${userId}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status })
  });
  return handle<Record<string, never>>(res);
}

export async function updateUserRole(userId: string, role: "user" | "admin") {
  const res = await fetch(`${baseUrl}/auth/users/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ role })
  });
  return handle<Record<string, never>>(res);
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
  return handle<{ items: WorkflowDto[] }>(res);
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
  return handle<{ workflow: WorkflowDto }>(res);
}

export async function listAgents(): Promise<{ agents: unknown[] }> {
  const res = await fetch(`${baseUrl}/agents`, { method: "GET", headers: authHeaders() });
  return handle<{ agents: unknown[] }>(res);
}

export async function runAgent(agentId: string, context: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}/agents/${agentId}/run`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ context })
  });
  return handle<Record<string, unknown>>(res);
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
  return handle<{ items: AuditLogRow[] }>(res);
}

export type WorkflowEvaluateResult = { matched: boolean; workflowId: string };

export type WorkflowExecuteResult = {
  workflowId: string;
  runId: string;
  matched: boolean;
  matchedRuleIndexes: number[];
  status: "completed" | "failed";
  steps: Array<{ type: string; status: "completed" | "failed" }>;
};

export async function executeWorkflow(
  workflowId: string,
  context: Record<string, unknown>
): Promise<WorkflowExecuteResult> {
  const res = await fetch(`${baseUrl}/workflows/${workflowId}/execute`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ context })
  });
  return handle<WorkflowExecuteResult>(res);
}

