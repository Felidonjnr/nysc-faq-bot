import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";

const STARTER_PROMPTS = [
  "How do I register for NYSC?",
  "How can I print my call-up letter?",
  "What documents do I need for camp?",
  "I made a mistake in my details, what should I do?",
];

function formatTime(dateString) {
  try {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text: "Hello. Ask me any NYSC question and I’ll answer from the deployed knowledge base. Verify important information on the official NYSC portal before taking action.",
      fallback: false,
      confidence: null,
      followUps: STARTER_PROMPTS,
      answerId: null,
      sourceQuery: null,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [savedMessageIds, setSavedMessageIds] = useState([]);
  const scrollerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("nysc-review-items") || "[]");
      setReviews(saved);
      setSavedMessageIds(saved.map((item) => item.messageId));
    } catch {
      setReviews([]);
      setSavedMessageIds([]);
    }
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  const reviewCount = reviews.length;

  const emptyStatePrompts = useMemo(() => STARTER_PROMPTS.slice(0, 4), []);

  async function sendQuestion(question, context = null) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, context }),
      });

      const data = await response.json();

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.answer || "I couldn’t get an answer right now.",
        fallback: Boolean(data.fallback),
        confidence: typeof data.confidence === "number" ? data.confidence : null,
        followUps: Array.isArray(data.followUpPrompts) ? data.followUpPrompts : [],
        answerId: data.answerId ?? null,
        sourceQuery: trimmed,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Something went wrong. Please try again or confirm from the official NYSC portal.",
          fallback: true,
          confidence: null,
          followUps: STARTER_PROMPTS,
          answerId: null,
          sourceQuery: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    sendQuestion(input);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  }

  function saveForReview(message, index) {
    if (savedMessageIds.includes(message.id)) return;

    const previousUser = [...messages]
      .slice(0, index)
      .reverse()
      .find((item) => item.role === "user");

    const reviewItem = {
      messageId: message.id,
      question: previousUser?.text || message.sourceQuery || "",
      answer: message.text,
      confidence: message.confidence,
      fallback: message.fallback,
      savedAt: new Date().toISOString(),
    };

    const next = [reviewItem, ...reviews];
    setReviews(next);
    setSavedMessageIds((prev) => [message.id, ...prev]);
    localStorage.setItem("nysc-review-items", JSON.stringify(next));
  }

  function clearReviews() {
    setReviews([]);
    setSavedMessageIds([]);
    localStorage.removeItem("nysc-review-items");
  }

  function exportReviews() {
    const blob = new Blob([JSON.stringify(reviews, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nysc-review-items.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Head>
        <title>NYSC FAQ Assistant</title>
        <meta
          name="description"
          content="A clean demo chat interface for testing an NYSC FAQ knowledge base."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">NYSC FAQ Assistant</p>
            <h1 className="title">Clean demo chat for testing your knowledge base</h1>
            <p className="subtle-note">
              Demo only. Confirm sensitive information on the official NYSC portal.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setReviewOpen(true)}
            >
              Review{reviewCount ? ` (${reviewCount})` : ""}
            </button>
            <a
              href="https://www.nysc.gov.ng"
              target="_blank"
              rel="noopener noreferrer"
              className="link-button"
            >
              Official portal
            </a>
          </div>
        </header>

        <main className="chat-stage">
          <section className="chat-card">
            <div className="message-list" ref={scrollerRef}>
              {messages.length === 1 && (
                <div className="empty-state">
                  <p className="empty-state-text">Try one of these to test the bot quickly.</p>
                  <div className="prompt-row compact">
                    {emptyStatePrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="prompt-pill"
                        onClick={() => sendQuestion(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`message-wrap ${message.role === "user" ? "user" : "assistant"}`}
                >
                  <div className={`message-bubble ${message.role === "user" ? "user" : "assistant"} ${message.fallback ? "fallback" : ""}`}>
                    <p>{message.text}</p>
                  </div>

                  <div className={`meta-row ${message.role === "user" ? "user" : "assistant"}`}>
                    <span>{formatTime(message.createdAt)}</span>
                    {message.role === "assistant" && (
                      <>
                        {message.fallback && <span className="warning-text">Needs manual check</span>}
                        <button
                          type="button"
                          className="meta-action"
                          onClick={() => saveForReview(message, index)}
                          disabled={savedMessageIds.includes(message.id)}
                        >
                          {savedMessageIds.includes(message.id) ? "Saved" : "Review"}
                        </button>
                      </>
                    )}
                  </div>

                  {message.role === "assistant" && message.followUps?.length > 0 && (
                    <div className="prompt-row">
                      {message.followUps.map((prompt) => (
                        <button
                          key={`${message.id}-${prompt.displayText || prompt}`}
                          type="button"
                          className="prompt-pill"
                          onClick={() =>
                            sendQuestion(
                              prompt.displayText || prompt,
                              message.answerId
                                ? {
                                    previousQnaId: message.answerId,
                                    previousUserQuery: message.sourceQuery,
                                  }
                                : null
                            )
                          }
                        >
                          {prompt.displayText || prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="message-wrap assistant">
                  <div className="message-bubble assistant loading-bubble">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
            </div>

            <form className="composer" onSubmit={onSubmit}>
              <div className="composer-inner">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Ask a question about NYSC"
                  rows={1}
                  disabled={loading}
                />
                <button type="submit" className="send-button" disabled={loading || !input.trim()}>
                  Send
                </button>
              </div>
            </form>
          </section>
        </main>

        <aside className={`review-drawer ${reviewOpen ? "open" : ""}`}>
          <div className="review-header">
            <div>
              <p className="eyebrow">Saved reviews</p>
              <h2>Answers to inspect later</h2>
            </div>
            <button type="button" className="close-button" onClick={() => setReviewOpen(false)}>
              Close
            </button>
          </div>

          <div className="review-actions">
            <button type="button" className="ghost-button" onClick={exportReviews} disabled={!reviews.length}>
              Export
            </button>
            <button type="button" className="ghost-button danger" onClick={clearReviews} disabled={!reviews.length}>
              Clear all
            </button>
          </div>

          <div className="review-list">
            {reviews.length === 0 ? (
              <div className="review-empty">No saved answers yet.</div>
            ) : (
              reviews.map((item) => (
                <article className="review-item" key={item.messageId}>
                  <p className="review-label">Question</p>
                  <p className="review-question">{item.question}</p>
                  <p className="review-label">Answer</p>
                  <p className="review-answer">{item.answer}</p>
                  <div className="review-foot">
                    <span>{formatTime(item.savedAt)}</span>
                    {typeof item.confidence === "number" && (
                      <span>{Math.round(item.confidence * 100)}% match</span>
                    )}
                    {item.fallback && <span>fallback</span>}
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>

        {reviewOpen && <div className="scrim" onClick={() => setReviewOpen(false)} />}
      </div>
    </>
  );
}
