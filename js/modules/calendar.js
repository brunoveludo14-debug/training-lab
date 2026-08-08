/**
 * calendar.js — Vista semanal com calendário
 */
'use strict';

import { getCalendar, assignToDate, removeFromDate, moveSession } from './storage.js';
import { loadSessionById } from './sessions.js';

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

let _currentWeekStart = getMonday(new Date());
let _onSessionClick = null;

function getMonday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function isSameDay(d1, d2) {
  return formatDate(d1) === formatDate(d2);
}

// ─── Rendering ─────────────────────────────────────────────────────────────────

export function renderCalendar(container, onSessionClick) {
  _onSessionClick = onSessionClick;
  const cal = getCalendar();
  const today = new Date();

  // Get week range
  const weekEnd = new Date(_currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const monthStr = _currentWeekStart.getMonth() === weekEnd.getMonth()
    ? `${MONTH_NAMES[_currentWeekStart.getMonth()]} ${_currentWeekStart.getFullYear()}`
    : `${MONTH_NAMES[_currentWeekStart.getMonth()]} – ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  let html = `
    <div class="cal-nav">
      <div class="cal-nav-btns">
        <button class="btn-icon" id="cal-prev" title="Semana anterior">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button class="btn-secondary" id="cal-today" style="font-size:11px;padding:5px 10px;">Hoje</button>
        <button class="btn-icon" id="cal-next" title="Semana seguinte">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <span class="cal-nav-title">${monthStr}</span>
    </div>
    <div class="cal-grid">
  `;

  // Day headers
  DAY_NAMES.forEach(d => {
    html += `<div class="cal-day-header">${d}</div>`;
  });

  // Days
  for (let i = 0; i < 7; i++) {
    const day = new Date(_currentWeekStart);
    day.setDate(day.getDate() + i);
    const dateStr = formatDate(day);
    const isToday = isSameDay(day, today);
    const sessionIds = cal[dateStr] || [];

    html += `<div class="cal-day${isToday ? ' today' : ''}" data-date="${dateStr}"
                  ondragover="event.preventDefault(); this.classList.add('drag-over')"
                  ondragleave="this.classList.remove('drag-over')">`;
    html += `<div class="cal-day-num">${day.getDate()}</div>`;

    sessionIds.forEach(sid => {
      const session = loadSessionById(sid);
      if (session) {
        html += `<div class="cal-session-chip int-${session.intensity}" 
                      data-session-id="${sid}" data-date="${dateStr}"
                      draggable="true" title="${session.name}">
                   ${session.name}
                 </div>`;
      }
    });

    html += `</div>`;
  }

  html += `</div>`;

  container.innerHTML = html;

  // ── Bind navigation ──
  container.querySelector('#cal-prev')?.addEventListener('click', () => {
    _currentWeekStart.setDate(_currentWeekStart.getDate() - 7);
    renderCalendar(container, onSessionClick);
  });

  container.querySelector('#cal-next')?.addEventListener('click', () => {
    _currentWeekStart.setDate(_currentWeekStart.getDate() + 7);
    renderCalendar(container, onSessionClick);
  });

  container.querySelector('#cal-today')?.addEventListener('click', () => {
    _currentWeekStart = getMonday(new Date());
    renderCalendar(container, onSessionClick);
  });

  // ── Bind session chip clicks ──
  container.querySelectorAll('.cal-session-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const sid = chip.dataset.sessionId;
      if (onSessionClick) onSessionClick(sid);
    });

    // Drag start
    chip.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        sessionId: chip.dataset.sessionId,
        fromDate: chip.dataset.date,
      }));
      chip.style.opacity = '0.4';
    });

    chip.addEventListener('dragend', () => {
      chip.style.opacity = '1';
    });
  });

  // ── Bind day drop ──
  container.querySelectorAll('.cal-day').forEach(dayEl => {
    dayEl.addEventListener('drop', (e) => {
      e.preventDefault();
      dayEl.classList.remove('drag-over');
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.sessionId && data.fromDate) {
          const toDate = dayEl.dataset.date;
          if (data.fromDate !== toDate) {
            moveSession(data.fromDate, toDate, data.sessionId);
            renderCalendar(container, onSessionClick);
          }
        }
      } catch {}
    });

    // Also allow dropping sessions from session list
    dayEl.addEventListener('click', () => {
      // Could open a picker to assign sessions — we handle this in app.js
    });
  });
}

export function assignSessionToDate(dateStr, sessionId) {
  assignToDate(dateStr, sessionId);
}

export function removeSessionFromDate(dateStr, sessionId) {
  removeFromDate(dateStr, sessionId);
}

export function getCurrentWeekStart() {
  return _currentWeekStart;
}
