import type { ChatMessage } from "@/lib/types";

type Props = {
  messages: ChatMessage[];
};

/** Backend may send cosine-style 0–1 or already-scaled scores */
function formatRelevance(score: number): string {
  const n = Number(score);
  if (!Number.isFinite(n)) return "";
  if (n >= 0 && n <= 1) return `${(n * 100).toFixed(0)}%`;
  if (n > 1 && n <= 100) return `${n.toFixed(0)}%`;
  return n.toFixed(3);
}

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
            {m.role === "assistant" && m.sources && m.sources.length > 0 ? (
              <div className="message-sources">
                <div className="message-sources-title">Sources</div>
                <ul>
                  {m.sources.map((s, i) => (
                    <li key={`${s.chunkId}-${i}`}>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.filename}
                      </a>
                      <span className="message-source-meta">relevance {formatRelevance(s.score)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

