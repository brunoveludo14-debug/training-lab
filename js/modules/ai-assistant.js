/**
 * ai-assistant.js — Chat de IA integrado no Training Lab
 * Drawer lateral com conversa estilo chat, sugestões de exercícios e botão de adicionar à sessão.
 */
'use strict';

import { PRESET_EXERCISES } from './exercises.js';

// ─── State ──────────────────────────────────────────────────────────────────

let messages = []; // { role: 'user'|'assistant', content: string }
let isOpen = false;
let isLoading = false;
let getCurrentSession = null; // injected by app.js

// Quick-start prompts shown when chat is empty
const QUICK_PROMPTS = [
  { label: '🏋️ Criar treino completo', text: 'Cria um treino completo de 70 minutos para trabalhar a transição ofensiva e defensiva com 16 jogadores.' },
  { label: '🔥 Aquecimento criativo', text: 'Sugere 3 exercícios de aquecimento originais e dinâmicos para 12 jogadores.' },
  { label: '⚽ Trabalho de posse', text: 'Quais os melhores exercícios de posse de bola para trabalhar a saída de pressão?' },
  { label: '🎯 Sessão de finalização', text: 'Cria uma sessão de 45 minutos focada exclusivamente em finalização e remates.' },
  { label: '📊 Analisar sessão atual', text: 'Analisa a sessão de treino atual e diz-me se está equilibrada. Sugere melhorias.' },
];

// ─── Parsing exercise blocks from AI response ────────────────────────────────

/**
 * Parse <exercise>{...}</exercise> blocks from the AI reply text.
 * Returns { text (cleaned), exercises[] }
 */
function parseAIReply(raw) {
  const exercises = [];
  const exerciseRegex = /<exercise>([\s\S]*?)<\/exercise>/g;
  let match;
  while ((match = exerciseRegex.exec(raw)) !== null) {
    try {
      const ex = JSON.parse(match[1].trim());
      if (ex.name && ex.category) exercises.push(ex);
    } catch { /* ignore malformed */ }
  }
  // Remove the raw <exercise>…</exercise> tags from displayed text
  const cleanText = raw.replace(exerciseRegex, '').replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, exercises };
}

// ─── API call ────────────────────────────────────────────────────────────────

async function callAI(userMessage) {
  // Append user message to history
  messages.push({ role: 'user', content: userMessage });

  // Build session context if a session is open
  let sessionContext = null;
  if (typeof getCurrentSession === 'function') {
    const session = getCurrentSession();
    if (session) {
      sessionContext = {
        sessionName: session.name,
        totalDuration: session.exercises.reduce((s, e) => s + (e.duration || 0) * (e.sets || 1), 0),
        exercises: session.exercises.map(e => ({ name: e.name, category: e.category, duration: e.duration, sets: e.sets })),
      };
    }
  }

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, sessionContext }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `Erro HTTP ${res.status}`);
  }

  const data = await res.json();
  const reply = data.reply || '';
  messages.push({ role: 'assistant', content: reply });
  return reply;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Convert markdown-lite to HTML (bold, code, lists) */
function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h4>$1</h4>')
    .replace(/^# (.+)$/gm, '<h4>$1</h4>')
    .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/\n/g, '<br>');
}

/** Render an exercise card within the assistant's message */
function renderExerciseCard(ex, index) {
  const catColors = {
    aquecimento: 'var(--yel)',
    posse:       'var(--acc)',
    finalizacao: 'var(--red)',
    fisico:      'var(--blu)',
    tatico:      'var(--pur)',
    retorno:     '#64c8dc',
  };
  const catLabels = {
    aquecimento: '🔥 Aquecimento',
    posse:       '⚽ Posse de Bola',
    finalizacao: '🎯 Finalização',
    fisico:      '🏃 Físico',
    tatico:      '🧠 Tático',
    retorno:     '🧊 Retorno',
  };
  const color = catColors[ex.category] || 'var(--acc)';
  const label = catLabels[ex.category] || ex.category;

  return `
    <div class="ai-ex-card" data-ai-ex-index="${index}">
      <div class="ai-ex-head">
        <span class="ai-ex-cat" style="color:${color};">${label}</span>
        <span class="ai-ex-chips">
          ${ex.duration ? `<span class="ex-chip">${ex.duration}min</span>` : ''}
          ${ex.sets > 1 ? `<span class="ex-chip">${ex.sets}×</span>` : ''}
          ${ex.rest ? `<span class="ex-chip">${ex.rest}min ⏸</span>` : ''}
          ${ex.players ? `<span class="ex-chip">👥 ${ex.players}</span>` : ''}
        </span>
      </div>
      <div class="ai-ex-name">${escHtml(ex.name)}</div>
      ${ex.desc ? `<div class="ai-ex-desc">${escHtml(ex.desc)}</div>` : ''}
      <button class="ai-ex-add-btn" data-ai-ex-index="${index}" aria-label="Adicionar ${escHtml(ex.name)} à sessão">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Adicionar à sessão
      </button>
    </div>`;
}

/** Render a single message bubble */
function renderMessage(msg, pendingExercises = []) {
  if (msg.role === 'user') {
    return `
      <div class="ai-msg ai-msg-user">
        <div class="ai-bubble ai-bubble-user">${escHtml(msg.content)}</div>
      </div>`;
  }

  // Parse exercises from assistant reply
  const { cleanText, exercises } = parseAIReply(msg.content);

  let html = `
    <div class="ai-msg ai-msg-assistant">
      <div class="ai-avatar">🤖</div>
      <div class="ai-msg-body">
        <div class="ai-bubble ai-bubble-assistant">${renderMarkdown(escHtml(cleanText))}</div>`;

  if (exercises.length > 0) {
    html += `<div class="ai-exercises-block">`;
    exercises.forEach((ex, i) => {
      const globalIndex = pendingExercises.length;
      pendingExercises.push(ex);
      html += renderExerciseCard(ex, globalIndex);
    });
    html += `</div>`;

    if (exercises.length > 1) {
      html += `
        <button class="ai-add-all-btn" data-ai-add-all="true" aria-label="Adicionar todos os exercícios à sessão">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar todos (${exercises.length} exercícios)
        </button>`;
    }
  }

  html += `</div></div>`;
  return { html, exercises };
}

/** Render the full chat body */
function renderChat() {
  const body = document.getElementById('ai-chat-body');
  if (!body) return;

  if (messages.length === 0) {
    body.innerHTML = `
      <div class="ai-welcome">
        <div class="ai-welcome-icon">🤖</div>
        <div class="ai-welcome-title">Assistente de Treino IA</div>
        <div class="ai-welcome-sub">Ajudo-te a criar e planear sessões de futebol. O que precisas?</div>
        <div class="ai-quick-prompts" id="ai-quick-prompts">
          ${QUICK_PROMPTS.map((p, i) => `
            <button class="ai-quick-btn" data-quick-index="${i}" aria-label="${escHtml(p.label)}">
              ${escHtml(p.label)}
            </button>`).join('')}
        </div>
      </div>`;
    return;
  }

  const pendingExercises = []; // shared across all messages
  let html = '';
  messages.forEach(msg => {
    if (msg.role === 'assistant') {
      const result = renderMessage(msg, pendingExercises);
      html += result.html;
    } else {
      html += renderMessage(msg);
    }
  });

  body.innerHTML = html;

  // Attach exercise data to window for click handlers
  window._aiPendingExercises = pendingExercises;

  // Scroll to bottom
  body.scrollTop = body.scrollHeight;
}

/** Render loading dots */
function renderLoading() {
  const body = document.getElementById('ai-chat-body');
  if (!body) return;
  const el = document.createElement('div');
  el.className = 'ai-msg ai-msg-assistant';
  el.id = 'ai-loading-indicator';
  el.innerHTML = `
    <div class="ai-avatar">🤖</div>
    <div class="ai-bubble ai-bubble-assistant ai-loading-bubble">
      <span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>
    </div>`;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

function removeLoading() {
  const el = document.getElementById('ai-loading-indicator');
  if (el) el.remove();
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Open/close the AI drawer */
export function toggleAIDrawer() {
  isOpen = !isOpen;
  const drawer = document.getElementById('ai-drawer');
  const fab    = document.getElementById('ai-fab');
  if (!drawer) return;

  if (isOpen) {
    drawer.classList.add('open');
    fab && fab.classList.add('active');
    document.getElementById('ai-chat-input')?.focus();
    renderChat();
  } else {
    drawer.classList.remove('open');
    fab && fab.classList.remove('active');
  }
}

/** Send a message to the AI */
export async function sendMessage(text) {
  if (!text.trim() || isLoading) return;
  isLoading = true;

  const input = document.getElementById('ai-chat-input');
  const sendBtn = document.getElementById('ai-send-btn');
  if (input) input.value = '';
  if (sendBtn) sendBtn.disabled = true;

  // Re-render with user message immediately
  renderChat();
  renderLoading();

  try {
    await callAI(text.trim());
  } catch (err) {
    messages.push({
      role: 'assistant',
      content: `❌ **Erro:** ${err.message}\n\nVerifica se a variável de ambiente \`GEMINI_API_KEY\` está configurada no Vercel.`,
    });
  } finally {
    removeLoading();
    isLoading = false;
    if (sendBtn) sendBtn.disabled = false;
    renderChat();
    if (input) {
      input.focus();
      autoResize(input);
    }
  }
}

/** Add a suggested exercise to the current session */
function addExerciseToCurrentSession(ex) {
  // Dispatch a custom event — app.js listens and handles the actual addition
  const event = new CustomEvent('ai:add-exercise', { detail: ex });
  document.dispatchEvent(event);
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ─── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialize the AI assistant.
 * @param {function} getSessionFn — function that returns the current session or null
 */
export function initAIAssistant(getSessionFn) {
  getCurrentSession = getSessionFn;

  // FAB click
  document.getElementById('ai-fab')?.addEventListener('click', toggleAIDrawer);

  // Close button in drawer header
  document.getElementById('ai-drawer-close')?.addEventListener('click', toggleAIDrawer);

  // Send button
  document.getElementById('ai-send-btn')?.addEventListener('click', () => {
    const input = document.getElementById('ai-chat-input');
    sendMessage(input?.value || '');
  });

  // Enter key (Shift+Enter = newline)
  document.getElementById('ai-chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const input = e.target;
      sendMessage(input.value || '');
    }
  });

  // Auto-resize textarea
  document.getElementById('ai-chat-input')?.addEventListener('input', e => {
    autoResize(e.target);
  });

  // Clear conversation button
  document.getElementById('ai-clear-btn')?.addEventListener('click', () => {
    messages = [];
    window._aiPendingExercises = [];
    renderChat();
  });

  // Delegated click: quick prompts, exercise add buttons, add-all button
  document.getElementById('ai-chat-body')?.addEventListener('click', e => {
    // Quick prompt
    const quickBtn = e.target.closest('[data-quick-index]');
    if (quickBtn) {
      const idx = parseInt(quickBtn.dataset.quickIndex, 10);
      sendMessage(QUICK_PROMPTS[idx].text);
      return;
    }

    // Add single exercise
    const addBtn = e.target.closest('[data-ai-ex-index]');
    if (addBtn && addBtn.classList.contains('ai-ex-add-btn')) {
      const idx = parseInt(addBtn.dataset.aiExIndex, 10);
      const ex = (window._aiPendingExercises || [])[idx];
      if (ex) {
        addExerciseToCurrentSession(ex);
        addBtn.textContent = '✅ Adicionado!';
        addBtn.disabled = true;
      }
      return;
    }

    // Add all exercises
    const addAllBtn = e.target.closest('[data-ai-add-all]');
    if (addAllBtn) {
      const exercises = window._aiPendingExercises || [];
      exercises.forEach(ex => addExerciseToCurrentSession(ex));
      addAllBtn.textContent = `✅ ${exercises.length} exercícios adicionados!`;
      addAllBtn.disabled = true;
      // Also disable individual buttons
      document.querySelectorAll('.ai-ex-add-btn').forEach(btn => {
        btn.textContent = '✅ Adicionado!';
        btn.disabled = true;
      });
    }
  });

  // Close drawer when clicking overlay (on mobile)
  document.getElementById('ai-drawer-overlay')?.addEventListener('click', () => {
    if (isOpen) toggleAIDrawer();
  });
}
