import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hello! I'm the NYSC FAQ Assistant. Ask me about registration, call-up letters, camp requirements, and more. For critical decisions, always verify with the official NYSC portal.",
      fallback: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.answer,
          fallback: data.fallback,
          confidence: data.confidence,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Something went wrong. Please try again or visit nysc.gov.ng",
          fallback: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>🟢</div>
          <div>
            <h1 style={styles.title}>NYSC FAQ Assistant</h1>
            <p style={styles.subtitle}>Demo Prototype — Not an official NYSC channel</p>
          </div>
        </div>
        <a
          href="https://www.nysc.gov.ng"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.officialBtn}
        >
          Official NYSC Portal ↗
        </a>
      </div>

      {/* Disclaimer */}
      <div style={styles.disclaimer}>
        ⚠️ This is an educational demo. Always verify important information on the{" "}
        <a href="https://www.nysc.gov.ng" target="_blank" rel="noopener noreferrer" style={styles.link}>
          official NYSC portal
        </a>{" "}
        before taking action.
      </div>

      {/* Chat Window */}
      <div style={styles.chatWindow}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.messageRow,
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "bot" && <div style={styles.avatar}>🤖</div>}
            <div
              style={{
                ...styles.bubble,
                ...(msg.role === "user" ? styles.userBubble : styles.botBubble),
                ...(msg.fallback ? styles.fallbackBubble : {}),
              }}
            >
              {msg.text}
              {msg.confidence !== undefined && !msg.fallback && (
                <div style={styles.confidence}>
                  Confidence: {Math.round(msg.confidence * 100)}%
                </div>
              )}
            </div>
            {msg.role === "user" && <div style={styles.avatar}>👤</div>}
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
            <div style={styles.avatar}>🤖</div>
            <div style={{ ...styles.bubble, ...styles.botBubble }}>
              <span style={styles.typing}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          type="text"
          placeholder="Ask about NYSC registration, call-up letters, camp..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: loading || !input.trim() ? 0.5 : 1,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
          }}
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>

      {/* Suggested questions */}
      <div style={styles.suggestions}>
        {[
          "How do I register for NYSC?",
          "How can I print my call-up letter?",
          "What documents do I need for camp?",
          "I made a mistake in my details, what do I do?",
        ].map((q, i) => (
          <button
            key={i}
            style={styles.chip}
            onClick={() => {
              setInput(q);
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "'Segoe UI', sans-serif",
    maxWidth: 720,
    margin: "0 auto",
    padding: "0 0 40px 0",
    minHeight: "100vh",
    background: "#f5f5f5",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "#006400",
    color: "white",
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  headerInner: { display: "flex", alignItems: "center", gap: 12 },
  logo: { fontSize: 28 },
  title: { margin: 0, fontSize: 18, fontWeight: 700 },
  subtitle: { margin: 0, fontSize: 11, opacity: 0.8 },
  officialBtn: {
    background: "white",
    color: "#006400",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  disclaimer: {
    background: "#fff8e1",
    borderLeft: "4px solid #f59e0b",
    padding: "10px 16px",
    fontSize: 13,
    color: "#555",
  },
  link: { color: "#006400", fontWeight: 600 },
  chatWindow: {
    flex: 1,
    padding: "20px 16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minHeight: 400,
    maxHeight: 500,
    background: "#fff",
    margin: "12px 16px",
    borderRadius: 10,
    border: "1px solid #e0e0e0",
  },
  messageRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
  },
  avatar: { fontSize: 20, flexShrink: 0 },
  bubble: {
    padding: "10px 14px",
    borderRadius: 12,
    maxWidth: "78%",
    fontSize: 14,
    lineHeight: 1.5,
  },
  userBubble: {
    background: "#006400",
    color: "white",
    borderBottomRightRadius: 2,
  },
  botBubble: {
    background: "#f1f1f1",
    color: "#222",
    borderBottomLeftRadius: 2,
  },
  fallbackBubble: {
    background: "#fff3e0",
    border: "1px solid #ffb74d",
  },
  confidence: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.6,
  },
  typing: { fontStyle: "italic", color: "#888" },
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "0 16px",
    margin: "4px 0",
  },
  input: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 14,
    outline: "none",
  },
  sendBtn: {
    background: "#006400",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 600,
  },
  suggestions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "10px 16px 0",
  },
  chip: {
    background: "white",
    border: "1px solid #006400",
    color: "#006400",
    borderRadius: 20,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
};
            
