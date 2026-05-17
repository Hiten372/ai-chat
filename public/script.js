document.addEventListener("DOMContentLoaded", () => {
  // Get references to DOM elements
  const chatForm = document.getElementById("chatForm");
  const userInput = document.getElementById("userInput");
  const chatMessages = document.getElementById("chatMessages");
  const sendButton = document.getElementById("sendButton");
  const clearChatButton = document.getElementById("clearChat");

  // chat history
  const savedChats = localStorage.getItem("chatHistory");
  if (savedChats) {
    chatMessages.innerHTML = savedChats;
  }
  clearChatButton.addEventListener("click", () => {
    // Remove saved chats
    localStorage.removeItem("chatHistory");

    // Reset chat UI
    chatMessages.innerHTML = `
    <div class="message">
      <div class="avatar">AI</div>
      <div class="message-content">
        Hello! I'm your AI assistant. How can I help you today?
      </div>
    </div>
  `;
  });

  //user input auto-resize
  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = userInput.scrollHeight + "px";
  });

  //   Modern chat apps: Enter → send and Shift + Enter → new line
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      chatForm.requestSubmit();
    }
  });

  //   Handle form submission
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;
    addMessage(message, true);
    saveChats();
    userInput.value = "";
    userInput.style.height = "auto";
    sendButton.disabled = true;

    const typingIndicator = showTypingIndicator();

    try {
      const response = await generateResponse(message);
      typingIndicator.remove();
      addMessage(response, false);
      saveChats();
    } catch (error) {
      typingIndicator.remove();
      addErrorMessage(error.message);
      saveChats();
    } finally {
      sendButton.disabled = false;
    }
  });
  //generate response from Gemini
  async function generateResponse(userMessage) {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate response");
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error(error);

      throw new Error(error.message);
    }
  }

  //add user message to chat
  function addMessage(text, isUser) {
    const message = document.createElement("div");
    message.classList.add("message");

    if (isUser) {
      message.classList.add("user-message");
    }

    // Avatar
    const avatar = document.createElement("div");
    avatar.className = `avatar ${isUser ? "user-avatar" : ""}`;
    avatar.textContent = isUser ? "U" : "AI";

    // Message content
    const content = document.createElement("div");
    content.className = "message-content";
    content.innerHTML = marked.parse(text);

    // Add elements
    message.appendChild(avatar);
    message.appendChild(content);
    chatMessages.appendChild(message);

    scrollToBottom();
  }

  function showTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = `message`;
    indicator.innerHTML = `<div class="avatar">AI</div>
    <div class="typing-indicator">
      <div class='dot'></div>
      <div class='dot'></div>
      <div class='dot'></div>
    </div>`;
    chatMessages.appendChild(indicator);
    scrollToBottom();
    return indicator;
  }
  //err message function
  function addErrorMessage(text) {
    const message = document.createElement("div");
    message.className = "message";
    message.innerHTML = `<div class="avatar">AI</div>
    <div class="message-content" style="color: red;">Error: ${text}</div>`;
    chatMessages.appendChild(message);
    scrollToBottom();
  }

  // Scroll to bottom of chat
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});
function saveChats() {
  localStorage.setItem("chatHistory", chatMessages.innerHTML);
}
