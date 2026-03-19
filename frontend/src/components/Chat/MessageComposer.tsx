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
    <form onSubmit={handleSubmit} className="composer">
      <textarea
        className="composer-input"
        placeholder="Ask a question about your documents..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || value.trim().length === 0}
        className="composer-send"
      >
        Send
      </button>
    </form>
  );
}

