/**
 * ai-assistant.js — Chat de IA integrado no Training Lab
 * Drawer lateral com conversa estilo chat, sugestões de exercícios e botão de adicionar à sessão.
 * Suporta Google Gemini API (remota via Vercel ou direta via chave local) + Motor Tático Inteligente Integrado.
 */
'use strict';

import { PRESET_EXERCISES } from './exercises.js';

// ─── State ──────────────────────────────────────────────────────────────────

const STORAGE_KEY_GEMINI = 'tlab_gemini_key';
let messages = []; // { role: 'user'|'assistant', content: string }
let isOpen = false;
let isLoading = false;
let isConfigOpen = false;
let getCurrentSession = null; // injected by app.js

// Quick-start prompts shown when chat is empty
const QUICK_PROMPTS = [
  { label: '🏋️ Criar treino completo', text: 'Cria um treino completo de 70 minutos para trabalhar a transição ofensiva e defensiva com 16 jogadores.' },
  { label: '🔥 Aquecimento criativo', text: 'Sugere 3 exercícios de aquecimento originais e dinâmicos para 12 jogadores.' },
  { label: '⚽ Trabalho de posse', text: 'Quais os melhores exercícios de posse de bola para trabalhar a saída de pressão?' },
  { label: '🎯 Sessão de finalização', text: 'Cria uma sessão de 45 minutos focada exclusivamente em finalização e remates.' },
  { label: '🧠 Pressing e Bloco Alto', text: 'Cria exercícios táticos para trabalhar pressão alta e recuperação rápida da bola.' },
  { label: '📊 Analisar sessão atual', text: 'Analisa a sessão de treino atual e diz-me se está equilibrada. Sugere melhorias.' },
];

// ─── Helper: Get / Set local Gemini API Key ──────────────────────────────────

export function getLocalApiKey() {
  return localStorage.getItem(STORAGE_KEY_GEMINI) || '';
}

export function setLocalApiKey(key) {
  if (key && key.trim()) {
    localStorage.setItem(STORAGE_KEY_GEMINI, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_GEMINI);
  }
}

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
  const cleanText = raw.replace(exerciseRegex, '').replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, exercises };
}

// ─── Built-in Intelligent Football Tactical Engine (Fallback / Offline) ─────

function generateLocalTacticalResponse(prompt, sessionContext) {
  const p = prompt.toLowerCase();

  // 1. Full training session request
  if (p.includes('criar treino') || p.includes('cria um treino') || p.includes('treino completo') || p.includes('sessão')) {
    if (p.includes('finaliza') || p.includes('remate')) {
      return `### 🎯 Sessão de Treino: Finalização & Criação Ofensiva
**Objetivo:** Dinâmicas de criação em zona 14, ataque ao espaço e eficácia na finalização.
**Duração Total Estimada:** ~60 min | **Intensidade:** Alta

1. **Aquecimento (12 min):** Rondo dinâmico com progressão de ritmo e ativação neuromuscular.
2. **Parte Principal (35 min):** Circulação com cruzamento e finalização sob pressão.
3. **Retorno à Calma (10 min):** Alongamentos estáticos e regeneração muscular.

<exercise>{"name":"Rondo 5v2 de Ativação Rápida","category":"aquecimento","duration":10,"sets":2,"rest":1,"players":"12-16","desc":"Dois quadrados de 10x10m. 5 atacantes contra 2 defensores. Limite de 2 toques com transição ao erro."}</exercise>

<exercise>{"name":"Combinação em Zona 14 e Remate","category":"finalizacao","duration":12,"sets":3,"rest":2,"players":"8+2GR","desc":"Tabela frontal com o ponta de lança, abertura rápida no ala e cruzamento tenso para ataque ao 1º e 2º poste."}</exercise>

<exercise>{"name":"Jogo Reduzido 4v4 + 2 GR com Balizas Grandes","category":"finalizacao","duration":15,"sets":2,"rest":2,"players":"8+2GR","desc":"Campo de 35x25m. Remate obrigatório no máximo até 4 passes para incentivar a agressividade ofensiva."}</exercise>

<exercise>{"name":"Alongamentos Estáticos e Respiração","category":"retorno","duration":8,"sets":1,"rest":0,"players":"Todos","desc":"Foco em quadríceps, isquiotibiais e gémeos com hidratação orientada."}</exercise>`;
    }

    if (p.includes('posse') || p.includes('pressão') || p.includes('pressing') || p.includes('transição') || p.includes('tático')) {
      return `### 🧠 Sessão Tática: Transição Rápida & Bloco Alto
**Objetivo:** Pressionar a saída de bola adversária e explorar a profundidade em menos de 8 segundos após a recuperação.
**Duração Total Estimada:** ~65 min | **Intensidade:** Alta

Aqui está a estrutura recomendada para a sessão:

<exercise>{"name":"Aquecimento com Mobilidade e Deslocamentos Dinâmicos","category":"aquecimento","duration":10,"sets":1,"rest":0,"players":"Todos","desc":"Exercícios de mobilidade articular, skippings e mudanças de direção em estações de cones."}</exercise>

<exercise>{"name":"Rondo 6v3 com Transição Ofensiva","category":"posse","duration":12,"sets":3,"rest":2,"players":"12","desc":"Espaço 15x15m. Ao recuperar a bola, os 3 defensores devem ligar imediatamente passe com o joker exterior."}</exercise>

<exercise>{"name":"Jogo de Setores: Saída de Bola vs Pressão Alta (GR+6 vs 6)","category":"tatico","duration":20,"sets":2,"rest":3,"players":"13+GR","desc":"Construção desde o guarda-redes. A equipa que defende pontua se recuperar a bola e finalizar em 6 segundos."}</exercise>

<exercise>{"name":"Alongamento Coletivo e Feedback Tático","category":"retorno","duration":8,"sets":1,"rest":0,"players":"Todos","desc":"Roda de análise com feedback do treinador e retorno calmo à frequência cardíaca basal."}</exercise>`;
    }

    // Generic full session
    return `### 📋 Plano de Treino Completo
**Objetivo Principal:** Desenvolvimento técnico-tático integrado com foco em circulação de bola e intensidade coletiva.
**Duração Total Estimada:** ~60 min

<exercise>{"name":"Aquecimento Técnico em Quadrado","category":"aquecimento","duration":10,"sets":2,"rest":1,"players":"12-16","desc":"Passe e desmarcação em diagonal. Progressão de 2 toques para 1 toque no interior do quadrado."}</exercise>

<exercise>{"name":"Posse 6v6 + 2 Jokers Neutros","category":"posse","duration":15,"sets":2,"rest":2,"players":"14","desc":"Espaço 30x25m. 8 passes consecutivos equivalem a 1 ponto. Jokers jogam sempre a 1 toque."}</exercise>

<exercise>{"name":"Finalização Rápida após Transição","category":"finalizacao","duration":15,"sets":2,"rest":2,"players":"10+2GR","desc":"3 atacantes contra 2 defesas em velocidade com finalização obrigatória em 10 segundos."}</exercise>

<exercise>{"name":"Corrida Regenerativa e Alongamentos","category":"retorno","duration":8,"sets":1,"rest":0,"players":"Todos","desc":"Trote suave a 50% de intensidade seguido de alongamentos dos grandes grupos musculares."}</exercise>`;
  }

  // 2. Warmup request
  if (p.includes('aquecimento') || p.includes('ativação')) {
    return `Aqui tens excelentes propostas de aquecimento dinâmico focadas no controlo de bola e prontidão neuromuscular:

<exercise>{"name":"Rondo 4v1 com Mudança de Quadrado","category":"aquecimento","duration":8,"sets":2,"rest":1,"players":"10","desc":"Dois quadrados adjacentes de 8x8m. A cada 6 passes, bola é virada para o quadrado seguinte."}</exercise>

<exercise>{"name":"Circuito Técnico de Passe e Agilidade","category":"aquecimento","duration":10,"sets":2,"rest":1,"players":"12","desc":"Ziguezague entre estacas, passe rápido na parede e aceleração curta de 10m."}</exercise>

<exercise>{"name":"Jogo do Espelho com Bola em Pares","category":"aquecimento","duration":7,"sets":1,"rest":0,"players":"Todos","desc":"Trabalho coordenativo e reativo em pares com condução de bola e paragens bruscas."}</exercise>`;
  }

  // 3. Possession request
  if (p.includes('posse') || p.includes('rondo') || p.includes('meínho') || p.includes('meinho')) {
    return `Exercícios recomendados para posse de bola e conservação sob pressão:

<exercise>{"name":"Rondo 4v4 + 3 Neutros (Posse Posicional)","category":"posse","duration":14,"sets":3,"rest":2,"players":"11","desc":"Estrutura inspirada no jogo posicional. 3 neutros jogam pelo eixo e alas para manter superioridade numérica."}</exercise>

<exercise>{"name":"Posse 5v5 com 4 Mini-Balizas","category":"posse","duration":12,"sets":3,"rest":2,"players":"10","desc":"Golo apenas válido após inversão do centro de jogo de uma mini-baliza para a outra."}</exercise>`;
  }

  // 4. Session Analysis
  if (p.includes('analisa') || p.includes('analisar') || p.includes('equilibrada')) {
    if (sessionContext && sessionContext.exercises && sessionContext.exercises.length > 0) {
      return `### 📊 Análise da Sessão: "${sessionContext.sessionName || 'Treino Atual'}"
- **Exercícios Registados:** ${sessionContext.exercises.length}
- **Tempo Total:** ${sessionContext.totalDuration || 0} minutos

**Parecer do Treinador IA:**
A sessão apresenta uma boa progressão. Recomendo garantir que os primeiros 10-15 minutos sejam dedicados a ativação/aquecimento e que reserves pelo menos 5-8 minutos finais para retorno à calma.

Podes usar o botão **+ Exercício** ou pedir-me uma fase específica para completar o treino!`;
    }
    return `Para analisar a tua sessão, abre primeiro um treino na vista de **Treinos** ou diz-me que tipo de sessão estás a preparar!`;
  }

  // General coaching advice
  return `### ⚽ Dica do Assistente de Treino
Como treinador, a estrutura ideal para uma sessão de futebol inclui:
1. **Ativação / Aquecimento (15% do tempo)**: Rondos e coordenação.
2. **Parte Principal (70% do tempo)**: Trabalho de posse, tático coletivo ou finalização.
3. **Retorno à Calma (15% do tempo)**: Alongamentos e reflexão tática.

*Pede-me, por exemplo:*
- *"Cria um treino de 60 min para trabalhar transição ofensiva"*
- *"Sugere 3 exercícios de finalização com guarda-redes"*
- *"Como melhorar a saída de bola sob pressão?"*`;
}

// ─── API call ────────────────────────────────────────────────────────────────

async function callAI(userMessage) {
  messages.push({ role: 'user', content: userMessage });

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

  const localKey = getLocalApiKey();

  // Try 1: Call Vercel /api/ai proxy
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localKey ? { 'x-gemini-key': localKey } : {}),
      },
      body: JSON.stringify({ messages, sessionContext, apiKey: localKey }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reply) {
        messages.push({ role: 'assistant', content: data.reply });
        return data.reply;
      }
    }
  } catch {
    // API endpoint offline or local server without Vercel Edge Runtime
  }

  // Try 2: Direct Google Gemini API call if localKey exists
  if (localKey) {
    try {
      const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${localKey}`;
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const sysInstruction = `És um treinador de futebol especialista no Training Lab. Responde em Português de Portugal com conselhos práticos e quando sugerires exercícios inclui <exercise>{"name":"...","category":"aquecimento|posse|finalizacao|fisico|tatico|retorno","duration":10,"sets":2,"rest":1,"players":"...","desc":"..."}</exercise>`;

      const geminiRes = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sysInstruction }] },
          contents,
        }),
      });

      if (geminiRes.ok) {
        const gData = await geminiRes.json();
        const text = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          messages.push({ role: 'assistant', content: text });
          return text;
        }
      }
    } catch {
      // Fall through to local tactical generator
    }
  }

  // Try 3: Built-in Tactical Engine (Instant response with rich soccer exercises)
  const localReply = generateLocalTacticalResponse(userMessage, sessionContext);
  messages.push({ role: 'assistant', content: localReply });
  return localReply;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
          ${ex.players ? `<span class="ex-chip">👥 ${escHtml(ex.players)}</span>` : ''}
        </span>
      </div>
      <div class="ai-ex-name">${escHtml(ex.name)}</div>
      ${ex.desc ? `<div class="ai-ex-desc">${escHtml(ex.desc)}</div>` : ''}
      <button class="ai-ex-add-btn" data-ai-ex-index="${index}" aria-label="Adicionar ${escHtml(ex.name)} à sessão">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        + Adicionar ao Treino
      </button>
    </div>`;
}

function renderMessage(msg, pendingExercises = []) {
  if (msg.role === 'user') {
    return `
      <div class="ai-msg ai-msg-user">
        <div class="ai-bubble ai-bubble-user">${escHtml(msg.content)}</div>
      </div>`;
  }

  const { cleanText, exercises } = parseAIReply(msg.content);

  let html = `
    <div class="ai-msg ai-msg-assistant">
      <div class="ai-avatar">🤖</div>
      <div class="ai-msg-body">
        <div class="ai-bubble ai-bubble-assistant">${renderMarkdown(cleanText)}</div>`;

  if (exercises.length > 0) {
    html += `<div class="ai-exercises-block">`;
    exercises.forEach((ex) => {
      const globalIndex = pendingExercises.length;
      pendingExercises.push(ex);
      html += renderExerciseCard(ex, globalIndex);
    });
    html += `</div>`;

    if (exercises.length > 1) {
      html += `
        <button class="ai-add-all-btn" data-ai-add-all="true" aria-label="Adicionar todos os exercícios à sessão">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Todos ao Treino (${exercises.length} exercícios)
        </button>`;
    }
  }

  html += `</div></div>`;
  return { html, exercises };
}

function renderChat() {
  const body = document.getElementById('ai-chat-body');
  if (!body) return;

  if (isConfigOpen) {
    const currentKey = getLocalApiKey();
    body.innerHTML = `
      <div class="ai-settings-panel">
        <div class="ai-settings-title">⚙️ Configurações da IA</div>
        <p class="ai-settings-desc">
          O assistente inclui um <strong>Motor Tático Integrado</strong> pronto a usar. Se quiseres respostas mais avançadas com Google Gemini, podes adicionar a tua chave gratuita abaixo.
        </p>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" for="ai-api-key-input">Chave Gemini API (Google AI Studio)</label>
          <input type="password" id="ai-api-key-input" class="form-input" placeholder="AIzaSy..." value="${escHtml(currentKey)}" style="font-family:var(--ff-mono);font-size:12px;">
        </div>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <button class="btn-primary" id="ai-save-key-btn" style="flex:1;justify-content:center;">Guardar Chave</button>
          ${currentKey ? `<button class="btn-secondary" id="ai-remove-key-btn" style="color:var(--red);">Remover</button>` : ''}
        </div>
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:var(--acc);text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
          Obter chave gratuita no Google AI Studio ↗
        </a>
      </div>`;
    return;
  }

  if (messages.length === 0) {
    const hasKey = !!getLocalApiKey();
    body.innerHTML = `
      <div class="ai-welcome">
        <div class="ai-welcome-icon">🤖</div>
        <div class="ai-welcome-title">Assistente de Treino IA</div>
        <div class="ai-welcome-sub">Ajudo-te a criar sessões completas, sugerir rondos, dinâmicas de posse e exercícios táticos.</div>
        <div class="ai-badge-status" style="font-size:11px;color:${hasKey ? 'var(--acc)' : 'var(--yel)'};background:rgba(255,255,255,.04);padding:4px 10px;border-radius:20px;border:1px solid var(--b1);margin-top:4px;">
          ${hasKey ? '✨ Gemini AI Conectado' : '⚡ Motor Tático Integrado Ativo'}
        </div>
        <div class="ai-quick-prompts" id="ai-quick-prompts">
          ${QUICK_PROMPTS.map((p, i) => `
            <button class="ai-quick-btn" data-quick-index="${i}" aria-label="${escHtml(p.label)}">
              ${escHtml(p.label)}
            </button>`).join('')}
        </div>
      </div>`;
    return;
  }

  const pendingExercises = [];
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
  window._aiPendingExercises = pendingExercises;
  body.scrollTop = body.scrollHeight;
}

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

export async function sendMessage(text) {
  if (!text.trim() || isLoading) return;
  isLoading = true;
  isConfigOpen = false;

  const input = document.getElementById('ai-chat-input');
  const sendBtn = document.getElementById('ai-send-btn');
  if (input) input.value = '';
  if (sendBtn) sendBtn.disabled = true;

  renderChat();
  renderLoading();

  try {
    await callAI(text.trim());
  } catch (err) {
    messages.push({
      role: 'assistant',
      content: `❌ **Nota:** ${err.message}`,
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

function addExerciseToCurrentSession(ex) {
  const event = new CustomEvent('ai:add-exercise', { detail: ex });
  document.dispatchEvent(event);
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ─── Initialization ──────────────────────────────────────────────────────────

export function initAIAssistant(getSessionFn) {
  getCurrentSession = getSessionFn;

  document.getElementById('ai-fab')?.addEventListener('click', toggleAIDrawer);
  document.getElementById('ai-drawer-close')?.addEventListener('click', toggleAIDrawer);

  // Settings button toggle
  document.getElementById('ai-settings-btn')?.addEventListener('click', () => {
    isConfigOpen = !isConfigOpen;
    renderChat();
  });

  // Send button
  document.getElementById('ai-send-btn')?.addEventListener('click', () => {
    const input = document.getElementById('ai-chat-input');
    sendMessage(input?.value || '');
  });

  // Enter key
  document.getElementById('ai-chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const input = e.target;
      sendMessage(input.value || '');
    }
  });

  document.getElementById('ai-chat-input')?.addEventListener('input', e => {
    autoResize(e.target);
  });

  document.getElementById('ai-clear-btn')?.addEventListener('click', () => {
    messages = [];
    window._aiPendingExercises = [];
    isConfigOpen = false;
    renderChat();
  });

  // Delegated clicks for prompts, add buttons, settings
  document.getElementById('ai-chat-body')?.addEventListener('click', e => {
    // Save API key
    if (e.target.id === 'ai-save-key-btn') {
      const val = document.getElementById('ai-api-key-input')?.value || '';
      setLocalApiKey(val);
      isConfigOpen = false;
      if (window._showAppToast) window._showAppToast('Chave Gemini guardada com sucesso! ✨');
      renderChat();
      return;
    }

    // Remove API key
    if (e.target.id === 'ai-remove-key-btn') {
      setLocalApiKey('');
      isConfigOpen = false;
      if (window._showAppToast) window._showAppToast('Chave removida. A usar Motor Tático Integrado.');
      renderChat();
      return;
    }

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
        addBtn.textContent = '✅ Adicionado ao Treino!';
        addBtn.disabled = true;
      }
      return;
    }

    // Add all exercises
    const addAllBtn = e.target.closest('[data-ai-add-all]');
    if (addAllBtn) {
      const exercises = window._aiPendingExercises || [];
      exercises.forEach(ex => addExerciseToCurrentSession(ex));
      addAllBtn.textContent = `✅ ${exercises.length} exercícios adicionados ao treino!`;
      addAllBtn.disabled = true;
      document.querySelectorAll('.ai-ex-add-btn').forEach(btn => {
        btn.textContent = '✅ Adicionado!';
        btn.disabled = true;
      });
    }
  });

  document.getElementById('ai-drawer-overlay')?.addEventListener('click', () => {
    if (isOpen) toggleAIDrawer();
  });
}
