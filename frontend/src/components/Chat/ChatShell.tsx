"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatResponse, DocumentSummary } from "@/lib/types";
import { askQuestion, listDocuments } from "@/lib/apiClient";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";

type Props = {
  onSourcesChange?: (documentIds: string[]) => void;
  selectedDocumentIds?: string[];
  onSelectionChange?: (documentIds: string[]) => void;
};

export function ChatShell({ onSourcesChange, selectedDocumentIds = [], onSelectionChange }: Props) {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    void listDocuments(1, 200)
      .then((res) => setDocs(res.items ?? []))
      .catch(() => setDocs([]));
  }, []);

  async function handleSend(text: string) {
    if (!text.trim()) return;
    if (selectedDocumentIds.length === 0) {
      setError("Select at least one document to ask a question.");
      return;
    }
    setError(null);
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setPending(true);
    try {
      const res: ChatResponse = await askQuestion({
        question: text,
        sessionId,
        documentIds: selectedDocumentIds
      });
      setSessionId(res.sessionId);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.answer,
        sources: res.sources?.length ? res.sources : undefined
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (onSourcesChange) {
        onSourcesChange(res.sources.map((s) => s.documentId));
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to ask question");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="chat-shell">
      <div className="chat-header">
        <div>
          <h2 className="panel-title">AI Assistant</h2>
          <p className="panel-subtitle">
            Ask questions across your indexed documents
            {` (${selectedDocumentIds.length} selected)`}
          </p>
          <div className="scope-chip">
            {selectedDocumentIds.length > 0
              ? `Answering from ${selectedDocumentIds.length} selected document(s)`
              : "Selection required before sending"}
          </div>
          <div style={{ marginTop: 8, position: "relative" }}>
            <button className="composer-send" onClick={() => setSelectorOpen((v) => !v)} type="button">
              {selectedDocumentIds.length > 0 ? `Selected: ${selectedDocumentIds.length}` : "Select documents"}
            </button>
            {selectorOpen && (
              <div className="dropdown-panel">
                {docs.map((doc) => {
                  const checked = selectedDocumentIds.includes(doc.id);
                  return (
                    <label key={doc.id} className="doc-select-label">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selectedDocumentIds, doc.id]
                            : selectedDocumentIds.filter((id) => id !== doc.id);
                          onSelectionChange?.(Array.from(new Set(next)));
                        }}
                      />
                      <span>{doc.filename}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {pending && <span className="pending-badge">Thinking...</span>}
      </div>

      <div ref={scrollRef} className="chat-stream">
        <MessageList messages={messages} />
        {error && <div className="alert-error">{error}</div>}
        {messages.length === 0 && !pending && (
          <div className="empty-state">
            <p>Ready to chat.</p>
            <p>Upload documents on the right, then ask a question.</p>
          </div>
        )}
      </div>

      <div className="chat-composer-wrap">
        <MessageComposer disabled={pending || selectedDocumentIds.length === 0} onSend={handleSend} />
      </div>
    </div>
  );
}

