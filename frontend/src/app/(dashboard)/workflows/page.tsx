"use client";

import { useEffect, useState } from "react";
import {
  createWorkflow,
  executeWorkflow,
  listWorkflows,
  type WorkflowDto
} from "@/lib/apiClient";
import { useSession } from "@/lib/context/SessionContext";

export default function WorkflowsPage() {
  const { user } = useSession();
  const [items, setItems] = useState<WorkflowDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Compliance notify");
  const [busy, setBusy] = useState(false);
  const [evalBusy, setEvalBusy] = useState<string | null>(null);
  const [evalResults, setEvalResults] = useState<
    Record<string, { matched: boolean; runId: string; status: "completed" | "failed" }>
  >({});

  const canEdit = ["admin", "manager", "superadmin"].includes(user.role);

  async function refresh() {
    setError(null);
    try {
      const res = await listWorkflows();
      setItems(res.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load workflows");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onCreate() {
    setBusy(true);
    setError(null);
    try {
      await createWorkflow({
        name,
        description: "Auto-created IF/THEN rule",
        rules: [
          {
            condition: { event: "document.indexed" },
            action: { type: "run_agent", agentId: "operations" }
          }
        ]
      });
      setName("New workflow");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onExecute(id: string) {
    setEvalBusy(id);
    try {
      const result = await executeWorkflow(id, { event: "document.indexed" });
      setEvalResults((prev) => ({
        ...prev,
        [id]: { matched: result.matched, runId: result.runId, status: result.status }
      }));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Execute failed");
    } finally {
      setEvalBusy(null);
    }
  }

  return (
    <div className="dash-single">
      <div className="dash-hero">
        <h2 className="dash-hero-title">Workflow automation</h2>
        <p className="dash-hero-text">
          Define IF/THEN rules stored per tenant. Rules are evaluated server-side; connect actions to webhooks
          or internal jobs in production.
        </p>
      </div>

      {canEdit ? (
        <div className="dash-card">
          <h3 className="dash-card-title">Create workflow</h3>
          <div className="dash-form-row">
            <label className="dash-label" htmlFor="wf-name">
              Name
            </label>
            <input
              id="wf-name"
              className="dash-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="button" className="dash-btn-primary" disabled={busy} onClick={() => void onCreate()}>
              {busy ? "Saving…" : "Create sample workflow"}
            </button>
          </div>
        </div>
      ) : (
        <p className="muted-text">Your role can view workflows; ask an admin to create or edit rules.</p>
      )}

      {error ? (
        <div className="dash-alert dash-alert-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="dash-card">
        <div className="dash-card-head">
          <h3 className="dash-card-title">Saved workflows</h3>
          <button type="button" className="dash-btn-ghost" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
        {items.length === 0 ? (
          <p className="muted-text">No workflows yet.</p>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Rules</th>
                  <th>Last run</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <strong>{w.name}</strong>
                      {w.description ? <div className="muted-text">{w.description}</div> : null}
                    </td>
                    <td>
                      <span className={`dash-badge ${w.enabled ? "dash-badge-ok" : ""}`}>
                        {w.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="muted-text">{new Date(w.updatedAt).toLocaleString()}</td>
                    <td className="muted-text">{Array.isArray(w.rules) ? w.rules.length : 0} rule(s)</td>
                    <td>
                      {evalResults[w.id] ? (
                        <span
                          className={`dash-badge ${evalResults[w.id].matched ? "dash-badge-ok" : ""}`}
                          title='Last run with event "document.indexed"'
                        >
                          {evalResults[w.id].matched ? "Matched" : "No match"} ({evalResults[w.id].status})
                        </span>
                      ) : (
                        <span className="muted-text">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dash-btn-sm"
                        disabled={evalBusy === w.id}
                        onClick={() => void onExecute(w.id)}
                      >
                        {evalBusy === w.id ? "…" : "Execute"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
