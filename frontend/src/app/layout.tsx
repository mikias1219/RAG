import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AI102 RAG SaaS",
  description: "Azure-native, cloud-portable RAG-powered SaaS"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <div className="container topbar-inner">
              <div className="brand">
                <div className="brand-mark" />
                <div>
                  <p className="brand-title">AI102 RAG Platform</p>
                  <p className="brand-subtitle">Enterprise Knowledge Assistant</p>
                </div>
              </div>
              <div className="topbar-meta">
                <span className="status-dot" />
                <span>Azure-native and portable architecture</span>
              </div>
            </div>
          </header>
          <main className="content">
            <div className="container">{children}</div>
          </main>
          <footer className="footer">
            <div className="container footer-inner">
              <span>Secure RAG workspace</span>
              <span>Ready for scale</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

