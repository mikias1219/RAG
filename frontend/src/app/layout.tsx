import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "OKDE — Operational Knowledge & Decision Engine",
  description: "Multi-tenant B2B SaaS: RAG, workflows, agents, Azure-native"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <main className="content content-fullbleed">
            <div className="content-container-full">{children}</div>
          </main>
          <footer className="footer footer-minimal">
            <div className="container footer-inner">
              <span>OKDE · Secure multi-tenant workspace</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

