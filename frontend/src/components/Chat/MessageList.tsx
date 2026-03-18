import type { ChatMessage } from "@/lib/types";

type Props = {
  messages: ChatMessage[];
};

export function MessageList({ messages }: Props) {
  return (
    <div className="space-y-2 text-sm">
      {messages.map((m) => (
        <div key={m.id} className="flex">
          <div
            className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-indigo-600 text-slate-50"
                : "mr-auto bg-slate-800 text-slate-50"
            }`}
          >
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
              {m.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

