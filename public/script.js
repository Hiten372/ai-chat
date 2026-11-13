
document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const chatForm = document.getElementById("chatForm");
  const userInput = document.getElementById("userInput");
  const chatMessages = document.getElementById("chatMessages");
  const sendButton = document.getElementById("sendButton");
  const clearChatButton = document.getElementById("clearChat");

  // Configuration
  const CONFIG = {
    storageKey: "chatHistory",
    maxMessages: 100,
    requestTimeout: 30000,
  };

  let isLoading = false;
  let messages = [];

  // Initial welcome message
  const welcomeMessage = {
    role: "assistant",
    content: "Hello! I'm your AI assistant. How can I help you today?",
    timestamp: Date.now(),
  };


  // LOAD CHAT HISTORY


  function loadChats() {
    try {
      const savedChats = localStorage.getItem(CONFIG.storageKey);

      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);

        if (Array.isArray(parsedChats)) {
          messages = parsedChats.filter(
            (msg) =>
              msg &&
              ["user", "assistant", "error"].includes(msg.role) &&
              typeof msg.content === "string"
          );
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
      localStorage.removeItem(CONFIG.storageKey);
    }

    if (messages.length === 0) {
      messages = [welcomeMessage];
    }

    renderChats();
  }

 
  // SAVE CHAT HISTORY


  function saveChats() {
    try {
      messages = messages.slice(-CONFIG.maxMessages);

      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }

  
  // RENDER CHAT MESSAGES
  

  function renderChats() {
    chatMessages.replaceChildren();

    messages.forEach((msg) => {
      renderMessage(msg);
    });

    scrollToBottom();
  }

  function renderMessage(msg) {
    const message = document.createElement("div");
    message.className = "message";

    if (msg.role === "user") {
      message.classList.add("user-message");
    }

    const avatar = document.createElement("div");
    avatar.className = "avatar";

    if (msg.role === "user") {
      avatar.classList.add("user-avatar");
      avatar.textContent = "U";
    } else {
      avatar.textContent = "AI";
    }

    const content = document.createElement("div");
    content.className = "message-content";

    if (msg.role === "error") {
      content.style.color = "red";
      content.textContent = "Error: " + msg.content;
    } else {
      // Secure Markdown rendering
      const html = marked.parse(msg.content);

      // Requires DOMPurify to be loaded
      content.innerHTML = DOMPurify.sanitize(html);
    }

    message.append(avatar, content);
    chatMessages.appendChild(message);

    return message;
  }


  // ADD MESSAGE


  function addMessage(content, role) {
    const message = {
      role,
      content,
      timestamp: Date.now(),
    };

    messages.push(message);
    messages = messages.slice(-CONFIG.maxMessages);

    renderMessage(message);
    saveChats();
    scrollToBottom();
  }


  // TYPING INDICATOR


  function showTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "message typing-message";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "AI";

    const typing = document.createElement("div");
    typing.className = "typing-indicator";

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("div");
      dot.className = "dot";
      typing.appendChild(dot);
    }

    indicator.append(avatar, typing);
    chatMessages.appendChild(indicator);

    scrollToBottom();

    return indicator;
  }

 
  // ERROR MESSAGE


  function addErrorMessage(error) {
    addMessage(error, "error");
  }

  
  // API REQUEST


  async function generateResponse(userMessage) {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      CONFIG.requestTimeout
    );

    try {
      const response = await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message: userMessage,
        }),

        signal: controller.signal,
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid response from server.");
      }

      if (!response.ok) {
        throw new Error(
          data?.error || `Server error (${response.status})`
        );
      }

      const answer = data?.choices?.[0]?.message?.content;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      return answer;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out. Please try again.");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

 
  // HANDLE FORM SUBMISSION
 

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (isLoading) return;

    const message = userInput.value.trim();

    if (!message) return;

    isLoading = true;
    sendButton.disabled = true;

    addMessage(message, "user");

    userInput.value = "";
    userInput.style.height = "auto";

    const typingIndicator = showTypingIndicator();

    try {
      const response = await generateResponse(message);

      addMessage(response, "assistant");

    } catch (error) {
      console.error("Chat error:", error);

      addErrorMessage(error.message || "Something went wrong.");

    } finally {
      typingIndicator.remove();

      isLoading = false;
      sendButton.disabled = false;

      userInput.focus();
    }
  });

  
  // CLEAR CHAT
  

  clearChatButton.addEventListener("click", () => {
    if (isLoading) return;

    messages = [welcomeMessage];

    saveChats();
    renderChats();
  });


  // AUTO RESIZE TEXTAREA


  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";

    userInput.style.height =
      Math.min(userInput.scrollHeight, 180) + "px";
  });


  // ENTER TO SEND
  // SHIFT + ENTER FOR NEW LINE
  

  userInput.addEventListener("keydown", (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.isComposing
    ) {
      e.preventDefault();

      chatForm.requestSubmit();
    }
  });


  // SCROLL TO BOTTOM


  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }



  loadChats();
});
