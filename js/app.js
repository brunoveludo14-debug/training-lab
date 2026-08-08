/**
 * app.js — Training Lab main controller
 */
'use strict';

import { CATEGORIES, getCategoryInfo, getAllExercises, filterByCategory, searchExercises, createExercise, getExerciseTotalDuration, cloneExercise } from './modules/exercises.js';
import { createSession, updateSession, removeSession, loadSessionById, listSessions, addExerciseToSession, removeExerciseFromSession, reorderExercises, getSessionDuration, getSessionExerciseCount, duplicateSession } from './modules/sessions.js';
import { renderCalendar, assignSessionToDate } from './modules/calendar.js';
import { startTimer } from './modules/timer.js';
import { getAllPlayers, createPlayer, deletePlayer, togglePresence, setPlayerLoad, renderPlayersTable, getTeamStats, getAttendanceForSession } from './modules/players.js';
import { exportJSON, importJSON, printSession, buildShareURL, parseShareURL } from './modules/share.js';
import { generateId, assignToDate } from './modules/storage.js';
import { openFieldEditor, getDiagramThumbnailSVG } from './modules/field-editor.js';

// ─── State ─────────────────────────────────────────────────────────────────────

let currentView = 'treinos';
let currentSession = null;
let showingSessionDetail = false;
let libFilter = 'all';
let libSearch = '';
let _tempNewExerciseDiagram = null;
let _lastFocusedEl = null; // element to restore focus to when a modal closes

// ─── Init ──────────────────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindNavigation();
  bindSessionsView();
  bindLibraryView();
  bindCalendarView();
  bindPlayersView();
  bindModals();
  bindGlobalActions();

  // Check for shared session in URL
  const shared = parseShareURL();
  if (shared) {
    const session = createSession({ name: shared.name, intensity: shared.intensity });
    shared.exercises.forEach(ex => {
      session.exercises.push({ ...ex, instanceId: generateId() });
    });
    updateSession(session);
    showToast('Treino importado com sucesso!');
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  }

  switchView('treinos');
});

// ─── Navigation ────────────────────────────────────────────────────────────────

function bindNavigation() {
  document.querySelectorAll('#topbar .top-btn[data-v]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.v);
    });
  });
}

function switchView(view) {
  currentView = view;
  showingSessionDetail = false;
  currentSession = null;

  // Update nav buttons
  document.querySelectorAll('#topbar .top-btn[data-v]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.v === view);
  });

  // Show/hide views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${view}`);
  if (target) {
    target.classList.add('active');
    // Force reflow for animation
    void target.offsetHeight;
  }

  // Render view content
  switch (view) {
    case 'treinos': renderSessionsList(); break;
    case 'biblioteca': renderLibrary(); break;
    case 'calendario': renderCalendarView(); break;
    case 'plantel': renderPlayersView(); break;
  }
}

// ─── TREINOS VIEW ──────────────────────────────────────────────────────────────

function renderSessionsList() {
  const container = document.getElementById('sessions-content');
  const detailEl = document.getElementById('session-detail');
  const listEl = document.getElementById('sessions-list');

  if (showingSessionDetail && currentSession) {
    listEl.style.display = 'none';
    detailEl.classList.add('active');
    renderSessionDetail();
    return;
  }

  listEl.style.display = 'flex';
  detailEl.classList.remove('active');

  const sessions = listSessions();

  // Stats
  const statsEl = document.getElementById('sessions-stats');
  const totalSessions = sessions.length;
  const thisWeek = sessions.filter(s => {
    const d = new Date(s.date);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
  }).length;
  const totalMinutes = sessions.reduce((sum, s) => sum + getSessionDuration(s), 0);

  statsEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${totalSessions}</div>
      <div class="stat-label">Treinos</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${thisWeek}</div>
      <div class="stat-label">Esta semana</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalMinutes}</div>
      <div class="stat-label">Min. total</div>
    </div>
  `;

  // Sessions list
  const gridEl = document.getElementById('sessions-grid');

  if (sessions.length === 0) {
    gridEl.innerHTML = `
      <div class="sessions-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="2"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
        <p>Nenhum treino criado.<br>Clica em <strong>"+ Novo Treino"</strong> para começar.</p>
      </div>`;
    return;
  }

  gridEl.innerHTML = sessions.map(s => {
    const dur = getSessionDuration(s);
    const count = getSessionExerciseCount(s);
    const dateStr = s.date ? new Date(s.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : '';

    return `
      <div class="card session-card int-${s.intensity}" data-session-id="${s.id}" tabindex="0" role="button" aria-label="Abrir treino ${s.name}">
        <div class="session-head">
          <div>
            <div class="session-name">${s.name}</div>
            <div class="session-date">${dateStr}</div>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="ex-btn" data-action="duplicate" data-id="${s.id}" title="Duplicar" aria-label="Duplicar treino ${s.name}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="ex-btn del" data-action="delete-session" data-id="${s.id}" title="Eliminar" aria-label="Eliminar treino ${s.name}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
        <div class="session-meta">
          <span class="session-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${dur} min
          </span>
          <span class="session-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/></svg>
            ${count} exercícios
          </span>
          <span class="session-badge badge-${s.intensity === 'low' ? 'green' : s.intensity === 'high' ? 'red' : 'yellow'}">${s.intensity === 'low' ? 'Baixa' : s.intensity === 'high' ? 'Alta' : 'Média'}</span>
        </div>
      </div>`;
  }).join('');

  // Bind clicks
  gridEl.querySelectorAll('.session-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      const sid = card.dataset.sessionId;
      openSessionDetail(sid);
    });
    // Keyboard support (Enter/Space) since these cards act as buttons
    card.addEventListener('keydown', (e) => {
      if (e.target.closest('[data-action]')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openSessionDetail(card.dataset.sessionId);
      }
    });
  });

  gridEl.querySelectorAll('[data-action="delete-session"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Eliminar este treino?')) {
        removeSession(btn.dataset.id);
        renderSessionsList();
        showToast('Treino eliminado');
      }
    });
  });

  gridEl.querySelectorAll('[data-action="duplicate"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      duplicateSession(btn.dataset.id);
      renderSessionsList();
      showToast('Treino duplicado');
    });
  });
}

function openSessionDetail(sessionId) {
  currentSession = loadSessionById(sessionId);
  if (!currentSession) return;
  showingSessionDetail = true;
  renderSessionsList();
}

function renderSessionDetail() {
  if (!currentSession) return;

  const detailEl = document.getElementById('session-detail');
  const dur = getSessionDuration(currentSession);

  document.getElementById('sd-title').textContent = currentSession.name;
  document.getElementById('sd-subtitle').textContent = `${currentSession.date || ''} · ${dur} min · ${currentSession.exercises.length} exercícios`;

  // Render exercises
  const listEl = document.getElementById('sd-exercises');
  if (currentSession.exercises.length === 0) {
    listEl.innerHTML = `
      <div class="sessions-empty" style="padding:24px;">
        <p>Sem exercícios. Arrasta da <strong>Biblioteca</strong> ou clica <strong>"+ Exercício"</strong>.</p>
      </div>`;
  } else {
    listEl.innerHTML = currentSession.exercises.map((ex, idx) => {
      const cat = getCategoryInfo(ex.category);
      const totalMin = getExerciseTotalDuration(ex);
      const diagramSVG = getDiagramThumbnailSVG(ex.diagram);
      return `
        <div class="exercise-item" draggable="true" data-idx="${idx}" data-instance="${ex.instanceId}">
          <div class="ex-drag-handle" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="exercise-item-diagram-container" data-action="draw-exercise" data-instance="${ex.instanceId}" title="Desenhar / Editar Desenho" role="button" tabindex="0" aria-label="Desenhar ou editar diagrama de ${ex.name}" style="cursor:pointer;">
            ${diagramSVG}
          </div>
          <div class="ex-info">
            <div class="ex-name">${ex.name}</div>
            <div class="ex-desc">${ex.desc || ''}</div>
          </div>
          <div class="ex-timing">
            <span class="ex-timing-chip">${ex.duration}min</span>
            <span class="ex-timing-chip">${ex.sets || 1}x</span>
            ${ex.rest ? `<span class="ex-timing-chip">${ex.rest}min ⏸</span>` : ''}
            <span class="ex-timing-chip" style="color:var(--t1);">${totalMin}min</span>
          </div>
          <div class="ex-actions">
            <button class="ex-btn" data-action="draw-exercise" data-instance="${ex.instanceId}" title="Desenhar / Editar Desenho" aria-label="Desenhar ou editar diagrama de ${ex.name}">✏️</button>
            <button class="ex-btn del" data-action="remove-ex" data-instance="${ex.instanceId}" title="Remover" aria-label="Remover ${ex.name} do treino">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>`;
    }).join('');

    // Bind drag & drop reorder
    bindExerciseDragDrop(listEl);
  }

  // Bind remove exercise buttons
  listEl.querySelectorAll('[data-action="remove-ex"]').forEach(btn => {
    btn.addEventListener('click', () => {
      removeExerciseFromSession(currentSession, btn.dataset.instance);
      currentSession = loadSessionById(currentSession.id);
      renderSessionDetail();
    });
  });

  // Bind draw exercise buttons (both icon button and diagram thumbnail)
  listEl.querySelectorAll('[data-action="draw-exercise"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openExerciseDrawing(el.dataset.instance);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openExerciseDrawing(el.dataset.instance);
      }
    });
  });

  // Footer
  document.getElementById('sd-total').textContent = `Total: ${dur} min · ${currentSession.exercises.length} exercícios`;
}

function openExerciseDrawing(instId) {
  const ex = currentSession.exercises.find(x => x.instanceId === instId);
  if (ex) {
    openFieldEditor(ex, (updatedEx) => {
      updateSession(currentSession);
      renderSessionDetail();
      showToast(`Desenho de "${updatedEx.name}" guardado!`);
    });
  }
}

function bindExerciseDragDrop(container) {
  let dragIdx = null;

  container.querySelectorAll('.exercise-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      dragIdx = parseInt(item.dataset.idx);
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      container.querySelectorAll('.exercise-item').forEach(i => i.classList.remove('drag-over'));
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const toIdx = parseInt(item.dataset.idx);
      if (dragIdx !== null && dragIdx !== toIdx) {
        reorderExercises(currentSession, dragIdx, toIdx);
        currentSession = loadSessionById(currentSession.id);
        renderSessionDetail();
      }
    });
  });
}

// ─── BIBLIOTECA VIEW ───────────────────────────────────────────────────────────

function renderLibrary() {
  renderFilterBar();
  renderLibraryGrid();
}

function renderFilterBar() {
  const bar = document.getElementById('lib-filter-bar');
  bar.innerHTML = `
    <button class="filter-btn ${libFilter === 'all' ? 'active' : ''}" data-cat="all">Todos</button>
    ${CATEGORIES.map(c => `<button class="filter-btn ${libFilter === c.key ? 'active' : ''}" data-cat="${c.key}">${c.icon} ${c.label}</button>`).join('')}
  `;

  bar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      libFilter = btn.dataset.cat;
      renderLibrary();
    });
  });
}

function renderLibraryGrid() {
  const grid = document.getElementById('lib-grid');
  let exercises = libSearch ? searchExercises(libSearch) : filterByCategory(libFilter);

  if (exercises.length === 0) {
    grid.innerHTML = `<div class="sessions-empty"><p>Nenhum exercício encontrado.</p></div>`;
    return;
  }

  grid.innerHTML = exercises.map(ex => {
    const cat = getCategoryInfo(ex.category);
    const totalMin = getExerciseTotalDuration(ex);
    const diagramSVG = getDiagramThumbnailSVG(ex.diagram);
    return `
      <div class="lib-card" data-exercise-id="${ex.id}" tabindex="0" role="button" aria-label="Adicionar exercício ${ex.name} a um treino">
        <div class="lib-card-head">
          <div class="lib-card-icon cat-${ex.category}" aria-hidden="true">${cat.icon}</div>
          <div>
            <div class="lib-card-title">${ex.name}</div>
            <div class="lib-card-cat">${cat.label}</div>
          </div>
        </div>
        <div class="lib-card-diagram-container" aria-hidden="true">
          ${diagramSVG}
        </div>
        <div class="lib-card-desc" style="margin-top: 4px;">${ex.desc || ''}</div>
        <div class="lib-card-footer">
          <span class="session-badge badge-blue">${ex.duration}min</span>
          <span class="session-badge badge-purple">${ex.sets || 1}x</span>
          ${ex.rest ? `<span class="session-badge badge-yellow">${ex.rest}min ⏸</span>` : ''}
          ${ex.players ? `<span class="session-badge badge-green">${ex.players}</span>` : ''}
        </div>
      </div>`;
  }).join('');

  // Click to add to current session
  grid.querySelectorAll('.lib-card').forEach(card => {
    card.addEventListener('click', () => handleLibCardActivate(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleLibCardActivate(card);
      }
    });
  });
}

function handleLibCardActivate(card) {
  const exId = card.dataset.exerciseId;
  const exercise = getAllExercises().find(e => e.id === exId);
  if (!exercise) return;

  if (currentSession) {
    addExerciseToSession(currentSession, exercise);
    currentSession = loadSessionById(currentSession.id);
    showToast(`"${exercise.name}" adicionado ao treino`);
    if (showingSessionDetail) {
      switchView('treinos');
      showingSessionDetail = true;
      renderSessionsList();
    }
  } else {
    // Show sessions to pick
    openAddToSessionPicker(exercise);
  }
}

function openAddToSessionPicker(exercise) {
  const sessions = listSessions();
  if (sessions.length === 0) {
    if (confirm(`Não tens sessões de treino. Criar uma nova e adicionar "${exercise.name}"?`)) {
      const session = createSession({ name: 'Novo Treino' });
      addExerciseToSession(session, exercise);
      showToast(`Treino criado com "${exercise.name}"`);
      switchView('treinos');
      openSessionDetail(session.id);
    }
    return;
  }

  // Simple modal with session list
  const modal = document.getElementById('modal-picker');
  const body = document.getElementById('picker-body');

  body.innerHTML = `
    <p style="font-size:12px;color:var(--t2);margin-bottom:8px;">Adicionar <strong>"${exercise.name}"</strong> a qual treino?</p>
    ${sessions.map(s => `
      <div class="card session-card int-${s.intensity}" data-sid="${s.id}" tabindex="0" role="button" aria-label="Adicionar a ${s.name}" style="cursor:pointer;margin-bottom:4px;">
        <div class="session-name">${s.name}</div>
        <div class="session-date">${s.date || ''}</div>
      </div>`).join('')}
  `;

  function pickSession(sid) {
    const session = loadSessionById(sid);
    if (session) {
      addExerciseToSession(session, exercise);
      showToast(`"${exercise.name}" adicionado a "${session.name}"`);
    }
    closeModal('modal-picker');
  }

  body.querySelectorAll('.session-card').forEach(card => {
    card.addEventListener('click', () => pickSession(card.dataset.sid));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pickSession(card.dataset.sid);
      }
    });
  });

  openModal('modal-picker');
}

// ─── CALENDÁRIO VIEW ──────────────────────────────────────────────────────────

function renderCalendarView() {
  const container = document.getElementById('calendar-content');
  renderCalendar(container, (sessionId) => {
    switchView('treinos');
    openSessionDetail(sessionId);
  });
}

// ─── PLANTEL VIEW ──────────────────────────────────────────────────────────────

function renderPlayersView() {
  const container = document.getElementById('players-content');
  const stats = getTeamStats();

  // Stats
  document.getElementById('plantel-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${stats.totalPlayers}</div>
      <div class="stat-label">Jogadores</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.totalSessions}</div>
      <div class="stat-label">Treinos</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.avgAttendance}%</div>
      <div class="stat-label">Assiduidade</div>
    </div>
  `;

  // Session selector for attendance
  const sessions = listSessions();
  const selectorEl = document.getElementById('attendance-session-select');
  selectorEl.innerHTML = `
    <option value="">— Visão geral —</option>
    ${sessions.map(s => `<option value="${s.id}">${s.name} (${s.date || ''})</option>`).join('')}
  `;

  renderPlayersTable(container, selectorEl.value || null);

  // Bind presence and load actions
  bindPlayersActions(container, selectorEl.value);
}

function bindPlayersActions(container, sessionId) {
  container.querySelectorAll('[data-action="presence"]').forEach(dot => {
    dot.addEventListener('click', () => {
      if (!sessionId) return;
      const playerId = dot.dataset.player;
      const isPresent = togglePresence(sessionId, playerId);
      dot.className = `presence-dot ${isPresent ? 'present' : 'absent'}`;
      dot.setAttribute('aria-pressed', String(isPresent));
    });
  });

  container.querySelectorAll('.load-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (!sessionId) return;
      const playerId = chip.dataset.player;
      const load = chip.dataset.load;
      setPlayerLoad(sessionId, playerId, load);
      // Update UI
      chip.parentElement.querySelectorAll('.load-chip').forEach(c => {
        c.className = 'load-chip';
      });
      chip.className = `load-chip active-${load}`;
    });
  });

  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Remover este jogador?')) {
        deletePlayer(btn.dataset.player);
        renderPlayersView();
        showToast('Jogador removido');
      }
    });
  });
}

// ─── SESSION VIEW ACTIONS ──────────────────────────────────────────────────────

function bindSessionsView() {
  // New session
  document.getElementById('btn-new-session').addEventListener('click', () => {
    openModal('modal-new-session');
  });

  // Back from detail
  document.getElementById('sd-back').addEventListener('click', () => {
    showingSessionDetail = false;
    currentSession = null;
    renderSessionsList();
  });

  // Add exercise to session
  document.getElementById('sd-add-exercise').addEventListener('click', () => {
    switchView('biblioteca');
  });

  // Start timer
  document.getElementById('sd-start-timer').addEventListener('click', () => {
    if (currentSession && currentSession.exercises.length > 0) {
      startTimer(currentSession, () => {
        showToast('Treino concluído! 🎉');
      });
    } else {
      showToast('Adiciona exercícios primeiro');
    }
  });

  // Print session
  document.getElementById('sd-print').addEventListener('click', () => {
    if (currentSession) printSession(currentSession);
  });

  // Share session
  document.getElementById('sd-share').addEventListener('click', () => {
    if (currentSession) {
      const url = buildShareURL(currentSession);
      navigator.clipboard?.writeText(url).then(() => {
        showToast('Link copiado!');
      }).catch(() => {
        prompt('Copia o link:', url);
      });
    }
  });

  // Assign to calendar
  document.getElementById('sd-calendar').addEventListener('click', () => {
    if (currentSession) {
      const date = currentSession.date || new Date().toISOString().split('T')[0];
      assignToDate(date, currentSession.id);
      showToast('Treino adicionado ao calendário');
    }
  });
}

// ─── LIBRARY VIEW ACTIONS ──────────────────────────────────────────────────────

function bindLibraryView() {
  // Search
  document.getElementById('lib-search-input').addEventListener('input', (e) => {
    libSearch = e.target.value;
    renderLibraryGrid();
  });

  // New custom exercise
  document.getElementById('btn-new-exercise').addEventListener('click', () => {
    openModal('modal-new-exercise');
  });
}

// ─── CALENDAR VIEW ACTIONS ─────────────────────────────────────────────────────

function bindCalendarView() {
  // Assign session button
  document.getElementById('btn-assign-session')?.addEventListener('click', () => {
    // Open picker modal
  });
}

// ─── PLAYERS VIEW ACTIONS ──────────────────────────────────────────────────────

function bindPlayersView() {
  document.getElementById('btn-add-player').addEventListener('click', () => {
    openModal('modal-add-player');
  });

  document.getElementById('attendance-session-select').addEventListener('change', (e) => {
    const container = document.getElementById('players-content');
    renderPlayersTable(container, e.target.value || null);
    bindPlayersActions(container, e.target.value);
  });
}

// ─── MODALS ────────────────────────────────────────────────────────────────────

function bindModals() {
  // Close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) closeModal(modal.id);
    });
  });

  // Click outside to close
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', (e) => {
      if (e.target === ov) closeModal(ov.id);
    });
  });

  // Escape key closes the currently open modal
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openModalEl = document.querySelector('.modal-overlay.active');
    if (openModalEl) closeModal(openModalEl.id);
  });

  // New Session form
  document.getElementById('form-new-session').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('input-session-name').value.trim() || 'Novo Treino';
    const date = document.getElementById('input-session-date').value || new Date().toISOString().split('T')[0];
    const intensity = document.querySelector('#form-new-session .intensity-btn.active')?.dataset.int || 'med';
    const notes = document.getElementById('input-session-notes').value;

    const session = createSession({ name, date, intensity, notes });
    closeModal('modal-new-session');
    document.getElementById('form-new-session').reset();
    showToast('Treino criado!');
    openSessionDetail(session.id);
  });

  // Intensity buttons in new session modal
  document.querySelectorAll('#form-new-session .intensity-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('#form-new-session .intensity-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
    });
  });

  // Handle drawing for new exercise before creation
  document.getElementById('btn-draw-new-exercise').addEventListener('click', () => {
    const tempEx = {
      name: document.getElementById('input-ex-name').value.trim() || 'Novo Exercício',
      category: document.getElementById('input-ex-category').value,
      diagram: _tempNewExerciseDiagram
    };
    openFieldEditor(tempEx, (updatedEx) => {
      _tempNewExerciseDiagram = updatedEx.diagram;
      showToast('Esboço do desenho guardado!');
      document.getElementById('btn-draw-new-exercise').textContent = '✏️ Desenho Criado (Editar)';
      document.getElementById('btn-draw-new-exercise').style.borderColor = 'var(--acc)';
      document.getElementById('btn-draw-new-exercise').style.color = 'var(--acc)';
    });
  });

  // New Exercise form
  document.getElementById('form-new-exercise').addEventListener('submit', (e) => {
    e.preventDefault();
    const exercise = createExercise({
      name: document.getElementById('input-ex-name').value.trim() || 'Novo Exercício',
      category: document.getElementById('input-ex-category').value,
      desc: document.getElementById('input-ex-desc').value,
      duration: parseInt(document.getElementById('input-ex-duration').value) || 10,
      sets: parseInt(document.getElementById('input-ex-sets').value) || 1,
      rest: parseInt(document.getElementById('input-ex-rest').value) || 0,
      players: document.getElementById('input-ex-players').value,
      diagram: _tempNewExerciseDiagram,
    });

    // Reset temporary states
    _tempNewExerciseDiagram = null;
    const drawBtn = document.getElementById('btn-draw-new-exercise');
    drawBtn.textContent = '✏️ Desenhar Exercício (Opcional)';
    drawBtn.style.borderColor = '';
    drawBtn.style.color = '';

    closeModal('modal-new-exercise');
    document.getElementById('form-new-exercise').reset();
    showToast(`Exercício "${exercise.name}" criado!`);
    renderLibrary();
  });

  // Add Player form
  document.getElementById('form-add-player').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('input-player-name').value.trim();
    const number = document.getElementById('input-player-number').value.trim();
    const position = document.getElementById('input-player-position').value;
    if (!name) return;
    createPlayer({ name, number, position });
    closeModal('modal-add-player');
    document.getElementById('form-add-player').reset();
    showToast(`${name} adicionado ao plantel`);
    renderPlayersView();
  });
}

function getFocusableEls(container) {
  return Array.from(container.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null);
}

function trapFocus(e) {
  const modal = document.querySelector('.modal-overlay.active');
  if (!modal || e.key !== 'Tab') return;

  const focusable = getFocusableEls(modal);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    _lastFocusedEl = document.activeElement;
    el.classList.add('active');
    document.addEventListener('keydown', trapFocus);
    // Focus first input
    setTimeout(() => {
      const input = el.querySelector('input:not([type=hidden])') || getFocusableEls(el)[0];
      if (input) input.focus();
    }, 100);
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('active');
  document.removeEventListener('keydown', trapFocus);
  // Restore focus to whatever triggered the modal, for keyboard users
  if (_lastFocusedEl && typeof _lastFocusedEl.focus === 'function') {
    _lastFocusedEl.focus();
  }
  _lastFocusedEl = null;
}

// ─── GLOBAL ACTIONS ────────────────────────────────────────────────────────────

function bindGlobalActions() {
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);
  document.getElementById('btn-import-json').addEventListener('click', async () => {
    try {
      await importJSON();
      showToast('Dados importados com sucesso!');
      switchView(currentView);
    } catch (e) {
      showToast('Erro ao importar');
    }
  });

  // Set today's date as default in new session modal
  const dateInput = document.getElementById('input-session-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
}

// ─── TOAST ─────────────────────────────────────────────────────────────────────

let _toastTimeout = null;

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.textContent = msg;
  toast.classList.remove('show');
  void toast.offsetHeight;
  toast.classList.add('show');

  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}
