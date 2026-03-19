import type { ChatMessage } from "@/lib/types";

type Props = {
  messages: ChatMessage[];
};

export function MessageList({ messages }: Props) {
  return (
    <div className="message-list">
      {messages.map((m) => (
        <div key={m.id} className={`message-row ${m.role === "user" ? "is-user" : "is-assistant"}`}>
          <div className={`message-bubble ${m.role === "user" ? "bubble-user" : "bubble-assistant"}`}>
            <div className="message-role">
              {m.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="message-content">{m.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

