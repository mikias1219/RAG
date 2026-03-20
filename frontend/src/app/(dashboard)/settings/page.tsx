"use client";

import { useEffect, useState } from "react";
import { getWorkspaceProfile, updateMe, updateWorkspaceProfile } from "@/lib/apiClient";
import { useSession } from "@/lib/context/SessionContext";

export default function SettingsPage() {
  const { user, refresh } = useSession();
  const [profileNameDraft, setProfileNameDraft] = useState(user.displayName ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [workspaceIndustry, setWorkspaceIndustry] = useState<"general" | "banking" | "construction">("general");
  const [workspaceDomainFocus, setWorkspaceDomainFocus] = useState("");
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceSuccess, setWorkspaceSuccess] = useState<string | null>(null);

  useEffect(() => {
    setProfileNameDraft(user.displayName ?? "");
  }, [user.displayName]);

  useEffect(() => {
    void getWorkspaceProfile()
      .then((profile) => {
        if (profile?.workspace) {
          setWorkspaceIndustry(profile.workspace.industry ?? "general");
          setWorkspaceDomainFocus(profile.workspace.domainFocus ?? "");
        }
      })
      .catch(() => null);
  }, [user.workspaceId]);

  const canEditWorkspace = ["admin", "superadmin"].includes(user.role);

  return (
    <div className="dash-single">
      <div className="dash-hero">
        <h2 className="dash-hero-title">Settings</h2>
        <p className="dash-hero-text">Profile, workspace industry context, and session security.</p>
      </div>

      <div className="dash-page-grid">
        <div className="dash-card">
          <h3 className="dash-card-title">Profile</h3>
          <div className="dash-metrics">
            <div className="metric-card">
              <p className="metric-label">Email</p>
              <p className="metric-value">{user.email}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Role</p>
              <p className="metric-value">{user.role}</p>
            </div>
          </div>
          <label className="dash-label" htmlFor="disp">
            Display name
          </label>
          <input
            id="disp"
            className="dash-input"
            value={profileNameDraft}
            onChange={(e) => setProfileNameDraft(e.target.value)}
          />
          <button
            type="button"
            className="dash-btn-primary"
            style={{ marginTop: 10 }}
            disabled={profileSaving || profileNameDraft.trim().length === 0}
            onClick={async () => {
              setProfileSaving(true);
              setProfileError(null);
              setProfileSuccess(null);
              try {
                await updateMe({ displayName: profileNameDraft.trim() });
                setProfileSuccess("Profile updated");
                await refresh();
              } catch (e: unknown) {
                setProfileError(e instanceof Error ? e.message : "Update failed");
              } finally {
                setProfileSaving(false);
              }
            }}
          >
            {profileSaving ? "Saving…" : "Save profile"}
          </button>
          {profileError ? <p className="error-text">{profileError}</p> : null}
          {profileSuccess ? <p className="info-text">{profileSuccess}</p> : null}
        </div>

        <div className="dash-card">
          <h3 className="dash-card-title">Workspace context</h3>
          <p className="panel-subtitle">Used to tune RAG prompts and UI defaults for your industry.</p>
          <label className="dash-label" htmlFor="ind">
            Industry
          </label>
          <select
            id="ind"
            className="dash-select"
            value={workspaceIndustry}
            disabled={!canEditWorkspace}
            onChange={(e) => setWorkspaceIndustry(e.target.value as typeof workspaceIndustry)}
          >
            <option value="general">General enterprise</option>
            <option value="banking">Banking</option>
            <option value="construction">Construction</option>
          </select>
          <label className="dash-label" htmlFor="dom" style={{ marginTop: 12 }}>
            Domain focus
          </label>
          <input
            id="dom"
            className="dash-input"
            value={workspaceDomainFocus}
            disabled={!canEditWorkspace}
            onChange={(e) => setWorkspaceDomainFocus(e.target.value)}
            placeholder="e.g. Basel compliance, claims, procurement"
          />
          <button
            type="button"
            className="dash-btn-primary"
            style={{ marginTop: 10 }}
            disabled={workspaceSaving || !canEditWorkspace}
            onClick={async () => {
              setWorkspaceSaving(true);
              setWorkspaceError(null);
              setWorkspaceSuccess(null);
              try {
                await updateWorkspaceProfile({
                  industry: workspaceIndustry,
                  domainFocus: workspaceDomainFocus.trim()
                });
                setWorkspaceSuccess("Workspace profile saved");
              } catch (e: unknown) {
                setWorkspaceError(e instanceof Error ? e.message : "Save failed");
              } finally {
                setWorkspaceSaving(false);
              }
            }}
          >
            {workspaceSaving ? "Saving…" : "Save workspace"}
          </button>
          {!canEditWorkspace ? <p className="muted-text">Only admins can edit workspace profile.</p> : null}
          {workspaceError ? <p className="error-text">{workspaceError}</p> : null}
          {workspaceSuccess ? <p className="info-text">{workspaceSuccess}</p> : null}

          <h4 className="dash-section-title" style={{ marginTop: 24 }}>
            Security
          </h4>
          <p className="muted-text">JWT session with optional Google sign-in. Rotate secrets in production.</p>
        </div>
      </div>
    </div>
  );
}
