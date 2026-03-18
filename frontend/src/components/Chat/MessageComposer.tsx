"use client";

import { useState } from "react";

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void | Promise<void>;
};

export function MessageComposer({ disabled, onSend }: Props) {
  const [value, setValue] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    setValue("");
    await onSend(text);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <textarea
        className="max-h-24 min-h-[40px] flex-1 resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-indigo-500"
        placeholder="Ask a question about your documents…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || value.trim().length === 0}
        className="inline-flex h-8 items-center rounded-md bg-indigo-600 px-3 text-xs font-medium text-slate-50 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700"
      >
        Send
      </button>
    </form>
  );
}

