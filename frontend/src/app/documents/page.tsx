import { DocumentsPanel } from "@/components/Documents/DocumentsPanel";

export default function DocumentsPage() {
  return (
    <div className="workspace" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <section className="panel chat-panel">
        <DocumentsPanel />
      </section>
    </div>
  );
}

