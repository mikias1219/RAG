"use client";

import { useState } from "react";
import { ChatShell } from "@/components/Chat/ChatShell";
import { DocumentsPanel } from "@/components/Documents/DocumentsPanel";

export default function HomePage() {
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] md:gap-6">
      <section className="flex min-h-[480px] flex-col rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-slate-950/50">
        <ChatShell
          onSourcesChange={(ids) => setSelectedSourceIds(ids)}
        />
      </section>
      <section className="flex min-h-[320px] flex-col rounded-xl border border-slate-800 bg-slate-900/40">
        <DocumentsPanel
          highlightedDocumentIds={selectedSourceIds}
        />
      </section>
    </div>
  );
}

