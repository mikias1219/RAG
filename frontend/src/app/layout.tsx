import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AI102 RAG SaaS",
  description: "Azure-native, cloud-portable RAG-powered SaaS"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-indigo-500" />
                <span className="text-sm font-semibold tracking-tight text-slate-50">
                  AI102 RAG SaaS
                </span>
              </div>
              <span className="text-xs text-slate-400">Azure-native • Portable</span>
            </div>
          </header>
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 py-4">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

