const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

let chatHistory = [];

// The system instruction enforcing the medical-only rule
const SYSTEM_INSTRUCTION = "You are Arsh, an advanced medical AI chatbot. You ONLY answer medical-related questions, health inquiries, and provide medical information. If the user asks ANY question that is not related to health, medicine, biology, healthcare, or similar topics (including questions like 'what is AI?', 'who created you?', or general trivia), you MUST reply verbatim: 'Sorry, I can't answer that. I am only programmed to answer medical-related questions.' Do not provide any other preamble or apology for non-medical questions.";

// Initialize app
function init() {
    messageInput.focus();
}

// Utility to escape HTML and do basic markdown rendering
function formatText(text) {
    // Basic escaping to prevent XSS
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    // Bold
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert newlines to breaks
    escaped = escaped.replace(/\n/g, '<br>');
    
    return escaped;
}

function addMessageToUI(text, sender, isError = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender} ${isError ? 'error' : ''}`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble glass-effect';
    bubbleDiv.innerHTML = formatText(text);
    
    msgDiv.appendChild(bubbleDiv);
    chatContainer.appendChild(msgDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return msgDiv; // Return reference in case we want to update it
}

function addTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message model typing';
    msgDiv.id = 'typing-indicator-msg';
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble glass-effect';
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    
    bubbleDiv.appendChild(typingIndicator);
    msgDiv.appendChild(bubbleDiv);
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator-msg');
    if (indicator) {
        indicator.remove();
    }
}

async function handleSend() {
    const text = messageInput.value.trim();
    if (!text || !API_KEY) return;
    
    // Add user message to UI and history
    addMessageToUI(text, 'user');
    messageInput.value = '';
    
    chatHistory.push({
        role: "user",
        parts: [{ text: text }]
    });
    
    addTypingIndicator();
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: SYSTEM_INSTRUCTION }]
                },
                contents: chatHistory
            })
        });
        
        removeTypingIndicator();
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Something went wrong.");
        }
        
        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            const botReply = data.candidates[0].content.parts[0].text;
            
            // Add bot reply to UI and history
            addMessageToUI(botReply, 'model');
            chatHistory.push({
                role: "model",
                parts: [{ text: botReply }]
            });
        } else {
            throw new Error("No response generated.");
        }
        
    } catch (error) {
        removeTypingIndicator();
        console.error('API Error:', error);
        
        if (error.message.includes('API key not valid')) {
            addMessageToUI("Error: Invalid API Key defined in script.", 'model', true);
        } else {
            addMessageToUI("Error: " + error.message, 'model', true);
        }
        
        // Remove the last user input from history if the request failed
        chatHistory.pop();
    }
}

sendBtn.addEventListener('click', handleSend);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSend();
    }
});

// Initialize on load
init();
