const chatForm = document.getElementById("chatForm");
const questionInput = document.getElementById("questionInput");
const chatBox = document.getElementById("chatBox");
const clearChatBtn = document.getElementById("clearChat");
const chipRow = document.getElementById("chipRow");
const scrollToChatBtn = document.getElementById("scrollToChat");

const savedChatKey = "nysc-faq-demo-chat";

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function autoGrowTextarea() {
  questionInput.style.height = "auto";
  questionInput.style.height = `${Math.min(questionInput.scrollHeight, 180)}px`;
}

function scrollChatToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function createMessage(role, html) {
  const wrapper = document.createElement("article");
  wrapper.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "YOU" : "AI";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = html;

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatBox.appendChild(wrapper);
  scrollChatToBottom();
  return wrapper;
}

function saveChat() {
  localStorage.setItem(savedChatKey, chatBox.innerHTML);
}

function restoreChat() {
  const saved = localStorage.getItem(savedChatKey);
  if (!saved) return;
  chatBox.innerHTML = saved;
}

function renderAssistantAnswer(payload) {
  const answer = escapeHtml(payload.answer || "No answer returned.");
  const source = payload.source ? escapeHtml(payload.source) : "Official KB";
  const confidence = typeof payload.confidence === "number" ? payload.confidence : null;
  const confidenceText = confidence === null ? "" : `${Math.round(confidence * 100)}% confidence`;
  const confidenceClass = payload.isSafe ? "safe" : "low";
  const spanText = payload.answerSpan ? escapeHtml(payload.answerSpan) : "";

  const html = `
    <p>${answer.replace(/\n/g, "<br />")}</p>
    <div class="meta-row">
      <span class="meta-pill ${confidenceClass}">${confidenceText || "Fallback response"}</span>
      <span class="meta-pill">Source: ${source}</span>
      ${spanText ? `<span class="meta-pill">Key phrase: ${spanText}</span>` : ""}
    </div>
  `;

  createMessage("assistant", html);
  saveChat();
}

function renderError(message) {
  createMessage(
    "assistant",
    `<p>${escapeHtml(message)}</p>
     <div class="meta-row">
       <span class="meta-pill low">Please verify on the official NYSC website</span>
     </div>`
  );
  saveChat();
}

function addUserMessage(question) {
  createMessage("user", `<p>${escapeHtml(question)}</p>`);
  saveChat();
}

function addTypingMessage() {
  return createMessage(
    "assistant",
    `<div class="typing-dots" aria-label="Assistant is typing">
      <span></span><span></span><span></span>
    </div>`
  );
}

async function askQuestion(question) {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "The assistant could not answer right now.");
  }

  return data;
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;

  addUserMessage(question);
  questionInput.value = "";
  autoGrowTextarea();

  const typingMessage = addTypingMessage();
  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  try {
    const result = await askQuestion(question);
    typingMessage.remove();
    renderAssistantAnswer(result);
  } catch (error) {
    typingMessage.remove();
    renderError(
      error.message ||
        "I could not get a reliable answer. Please confirm from the official NYSC portal."
    );
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
    questionInput.focus();
  }
});

questionInput.addEventListener("input", autoGrowTextarea);
questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

clearChatBtn.addEventListener("click", () => {
  localStorage.removeItem(savedChatKey);
  chatBox.innerHTML = `
    <article class="message assistant">
      <div class="avatar">AI</div>
      <div class="bubble">
        <p>
          Hello. I am a demo NYSC FAQ assistant. Ask me a question from the NYSC public
          information you added to your Azure knowledge base.
        </p>
      </div>
    </article>
  `;
});

chipRow.addEventListener("click", (event) => {
  const button = event.target.closest(".chip");
  if (!button) return;
  questionInput.value = button.textContent.trim();
  autoGrowTextarea();
  questionInput.focus();
});

scrollToChatBtn.addEventListener("click", () => {
  document.getElementById("chatSection").scrollIntoView({ behavior: "smooth", block: "start" });
  questionInput.focus();
});

restoreChat();
autoGrowTextarea();
scrollChatToBottom();
