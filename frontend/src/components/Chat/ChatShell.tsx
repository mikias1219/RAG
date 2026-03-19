"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatResponse } from "@/lib/types";
import { askQuestion } from "@/lib/apiClient";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";

type Props = {
  onSourcesChange?: (documentIds: string[]) => void;
  selectedDocumentIds?: string[];
};

export function ChatShell({ onSourcesChange, selectedDocumentIds = [] }: Props) {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function handleSend(text: string) {
    if (!text.trim()) return;
    setError(null);
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setPending(true);
    try {
      const res: ChatResponse = await askQuestion({
        question: text,
        sessionId,
        documentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined
      });
      setSessionId(res.sessionId);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.answer
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
            {selectedDocumentIds.length > 0 ? ` (${selectedDocumentIds.length} selected)` : " (all documents)"}
          </p>
        </div>
        {pending && <span className="pending-badge">Thinking...</span>}
      </div>

      <div ref={scrollRef} className="chat-stream">
        <MessageList messages={messages} />
        {error && (
          <div className="alert-error">{error}</div>
        )}
        {messages.length === 0 && !pending && (
          <div className="empty-state">
            <p>Ready to chat.</p>
            <p>Upload documents on the right, then ask a question.</p>
          </div>
        )}
      </div>

      <div className="chat-composer-wrap">
        <MessageComposer disabled={pending} onSend={handleSend} />
      </div>
    </div>
  );
}

