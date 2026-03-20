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
            <div className="message-content">
              <FormattedMessage text={m.content} />
            </div>
            {m.role === "assistant" && m.sources && m.sources.length > 0 ? (
              <div className="message-sources">
                <div className="message-sources-title">Sources</div>
                <ul>
                  {groupSources(m.sources).map((s, i) => (
                    <li key={`${s.chunkId}-${i}`}>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.filename}
                      </a>
                      <span className="message-source-meta">
                        relevance {formatRelevance(s.score)}
                        {s.repeatCount > 1 ? ` • ${s.repeatCount} excerpts` : ""}
                      </span>
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

function groupSources(sources: ChatMessage["sources"]) {
  const rows = sources ?? [];
  const map = new Map<string, (typeof rows)[number] & { repeatCount: number }>();
  for (const s of rows) {
    const key = `${s.documentId}::${s.filename}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...s, repeatCount: 1 });
      continue;
    }
    if (s.score > prev.score) {
      map.set(key, { ...s, repeatCount: prev.repeatCount + 1 });
    } else {
      prev.repeatCount += 1;
      map.set(key, prev);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.score - a.score).slice(0, 5);
}

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={`sp-${i}`} style={{ height: 6 }} />;
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={`h3-${i}`} className="message-h3">
              {trimmed.slice(4)}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={`h2-${i}`} className="message-h2">
              {trimmed.slice(3)}
            </h3>
          );
        }
        if (trimmed.startsWith("- ")) {
          return (
            <div key={`li-${i}`} className="message-li">
              • {trimmed.slice(2)}
            </div>
          );
        }
        return (
          <p key={`p-${i}`} className="message-p">
            {trimmed}
          </p>
        );
      })}
    </>
  );
}

