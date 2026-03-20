"use client";

import { useEffect, useState } from "react";
import { listAgents, runAgent } from "@/lib/apiClient";

type AgentRow = {
  id: string;
  name: string;
  description: string;
  role: string;
  tools: Array<{ name: string; description: string }>;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [selected, setSelected] = useState<string>("data-analyst");
  const [contextJson, setContextJson] = useState('{\n  "topic": "quarterly ops review"\n}');
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listAgents()
      .then((res) => setAgents((res.agents ?? []) as AgentRow[]))
      .catch(() => setAgents([]));
  }, []);

  async function onRun() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      let ctx: Record<string, unknown> = {};
      try {
        ctx = JSON.parse(contextJson) as Record<string, unknown>;
      } catch {
        throw new Error("Context must be valid JSON");
      }
      const out = await runAgent(selected, ctx);
      setResult(out);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  const agent = agents.find((a) => a.id === selected);

  return (
    <div className="dash-single">
      <div className="dash-hero">
        <h2 className="dash-hero-title">Multi-agent workspace</h2>
        <p className="dash-hero-text">
          Data Analyst, Risk, and Operations agents expose a tool surface for orchestration. Wire Azure OpenAI
          tool-calling in the backend to go from preview to production execution.
        </p>
      </div>

      <div className="dash-page-grid dash-agents-grid">
        <div className="dash-card">
          <h3 className="dash-card-title">Agents</h3>
          <ul className="dash-agent-list">
            {agents.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={`dash-agent-tile ${selected === a.id ? "is-selected" : ""}`}
                  onClick={() => setSelected(a.id)}
                >
                  <span className="dash-agent-name">{a.name}</span>
                  <span className="muted-text">{a.role}</span>
                </button>
              </li>
            ))}
          </ul>
          {agent ? (
            <div className="dash-agent-detail">
              <p>{agent.description}</p>
              <p className="dash-section-title">Tools</p>
              <ul className="muted-text">
                {agent.tools?.map((t) => (
                  <li key={t.name}>
                    <code>{t.name}</code> — {t.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="dash-card">
          <h3 className="dash-card-title">Run agent</h3>
          <label className="dash-label" htmlFor="ctx-json">
            Context (JSON)
          </label>
          <textarea
            id="ctx-json"
            className="dash-textarea"
            rows={10}
            value={contextJson}
            onChange={(e) => setContextJson(e.target.value)}
          />
          <button type="button" className="dash-btn-primary" disabled={busy} onClick={() => void onRun()}>
            {busy ? "Running…" : "Execute"}
          </button>
          {error ? (
            <div className="dash-alert dash-alert-error" style={{ marginTop: 12 }}>
              {error}
            </div>
          ) : null}
          {result ? (
            <pre className="dash-json-out">{JSON.stringify(result, null, 2)}</pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
