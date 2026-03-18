"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatResponse } from "@/lib/types";
import { askQuestion } from "@/lib/apiClient";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";

type Props = {
  onSourcesChange?: (documentIds: string[]) => void;
};

export function ChatShell({ onSourcesChange }: Props) {
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
      const res: ChatResponse = await askQuestion({ question: text, sessionId });
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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-100">Chat</span>
          <span className="text-xs text-slate-400">RAG over your uploaded documents</span>
        </div>
        {pending && <span className="text-xs text-amber-300">Thinking…</span>}
      </div>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <MessageList messages={messages} />
        {error && (
          <div className="rounded border border-red-700 bg-red-950/60 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        )}
        {messages.length === 0 && !pending && (
          <div className="mt-10 text-center text-xs text-slate-500">
            Upload a document and then ask a question about it.
          </div>
        )}
      </div>
      <div className="border-t border-slate-800 bg-slate-900/80 px-3 py-2">
        <MessageComposer disabled={pending} onSend={handleSend} />
      </div>
    </div>
  );
}

