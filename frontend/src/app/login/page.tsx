"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { login, loginWithGoogle, register } from "@/lib/apiClient";
import { setAuthToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    const normalizedDisplayName = displayName.trim();
    if (!normalizedEmail || !normalizedPassword) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? await login({ email: normalizedEmail, password: normalizedPassword })
          : await register({ email: normalizedEmail, password: normalizedPassword, displayName: normalizedDisplayName });
      setAuthToken(res.token);
      router.replace("/chat");
    } catch (e: any) {
      setError(e?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitGoogle(credential: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await loginWithGoogle(credential);
      setAuthToken(res.token);
      router.replace("/chat");
    } catch (e: any) {
      setError(e?.message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo" aria-hidden />
          <div className="login-brand-text">
            <h1>OKDE</h1>
            <p>Operational Knowledge &amp; Decision Engine</p>
          </div>
        </div>
        <div className="panel panel-compact">
          <h2 className="panel-title">Welcome</h2>
          <p className="panel-subtitle">Sign in to your secure workspace</p>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <div className="login-toggle">
            <button className="composer-send" onClick={() => setMode("login")} disabled={mode === "login"}>
              Login
            </button>
            <button
              className="composer-send"
              onClick={() => setMode("register")}
              disabled={mode === "register"}
            >
              Register
            </button>
          </div>

          {mode === "register" && (
            <input
              className="composer-input"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <input
            className="composer-input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="composer-input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="composer-send" onClick={submit} disabled={loading || !email || !password}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </div>

        <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <p className="muted-text">Continue with Google</p>
          <button
            className="composer-send"
            onClick={() => {
              const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
              const google = (window as any).google;
              if (!clientId || !google?.accounts?.id) {
                setError("Google Sign-In not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
                return;
              }
              google.accounts.id.initialize({
                client_id: clientId,
                callback: (resp: { credential?: string }) => {
                  if (!resp?.credential) {
                    setError("Google authentication failed");
                    return;
                  }
                  void submitGoogle(resp.credential);
                }
              });
              google.accounts.id.prompt();
            }}
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            Sign in with Google
          </button>
        </div>

        {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
