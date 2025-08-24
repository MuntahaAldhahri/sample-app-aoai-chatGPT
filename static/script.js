// --- helpers ---
const $ = (sel) => document.querySelector(sel);
const chats = $('#chats');
const form = $('#prompt-form');
const input = $('#prompt-input');
const stopBtn = $('#stop-response-btn');
const clearBtn = $('#delete-chats-btn');
const themeBtn = $('#theme-toggle-btn');

let abortController = null;

// Add a chat bubble to the list
function append(role, text) {
  const wrap = document.createElement('div');
  wrap.className = `chat ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  wrap.appendChild(bubble);
  chats.appendChild(wrap);
  chats.scrollTop = chats.scrollHeight;
  return bubble;
}

function appendRefs(refs) {
  if (!refs || !refs.length) return;
  const ul = document.createElement('ul');
  ul.className = 'refs';

  refs.forEach((r, i) => {
    const li = document.createElement('li');
    const title = r.title || r.filename || r.name || `Citation ${i + 1}`;
    const url = r.url || r.source || r.href || '#';
    li.innerHTML = url === '#'
      ? `${title}`
      : `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;
    ul.appendChild(li);
  });

  chats.appendChild(ul);
  chats.scrollTop = chats.scrollHeight;
}

// Try to normalize a few common response shapes
function parseAnswer(json) {
  // message.content (common)
  const answer =
    json?.message?.content ||
    json?.output_text ||
    json?.choices?.[0]?.message?.content ||
    json?.content ||
    '';

  // citations / documents / references (common)
  const refs =
    json?.citations ||
    json?.documents ||
    json?.references ||
    json?.sourceAttributions ||
    [];

  return { answer, refs };
}

// Call the backend. Most samples expose POST /api/chat { messages: [...] }
async function askBackend(prompt) {
  abortController = new AbortController();

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }]
      // If your backend expects more, add here (e.g., "conversation_id")
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${text}`);
  }

  // Non-streaming
  const json = await res.json();
  return parseAnswer(json);
}

function clearChats() {
  chats.innerHTML = '';
}

function toggleTheme() {
  document.documentElement.classList.toggle('light');
}

// --- events ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = input.value.trim();
  if (!prompt) return;

  // user bubble
  append('user', prompt);
  input.value = '';

  // assistant bubble (placeholder)
  const thinking = append('assistant', '…');

  try {
    const { answer, refs } = await askBackend(prompt);
    thinking.textContent = answer || '(no content)';
    appendRefs(refs);
  } catch (err) {
    thinking.textContent = `⚠️ ${err.message}`;
  } finally {
    abortController = null;
  }
});

stopBtn.addEventListener('click', () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
});

clearBtn.addEventListener('click', clearChats);
themeBtn.addEventListener('click', toggleTheme);
