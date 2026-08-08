/**
 * players.js — Gestão de plantel, presenças e carga
 */
'use strict';

import { getPlayers, savePlayers, addPlayer as addPlayerStorage, removePlayer as removePlayerStorage, generateId, getSessionAttendance, saveAttendance } from './storage.js';
import { listSessions } from './sessions.js';

// ─── Player CRUD ───────────────────────────────────────────────────────────────

export function getAllPlayers() {
  return getPlayers();
}

export function createPlayer(data) {
  const player = {
    id: 'p_' + generateId(),
    name: data.name || 'Jogador',
    number: data.number || '',
    position: data.position || '',
  };
  addPlayerStorage(player);
  return player;
}

export function deletePlayer(playerId) {
  removePlayerStorage(playerId);
}

export function updatePlayersList(players) {
  savePlayers(players);
}

// ─── Attendance ────────────────────────────────────────────────────────────────

export function getAttendanceForSession(sessionId) {
  return getSessionAttendance(sessionId);
}

export function setPlayerPresence(sessionId, playerId, present) {
  const att = getSessionAttendance(sessionId);
  if (!att[playerId]) att[playerId] = { present: false, load: 'med' };
  att[playerId].present = present;
  saveAttendance(sessionId, att);
}

export function setPlayerLoad(sessionId, playerId, load) {
  const att = getSessionAttendance(sessionId);
  if (!att[playerId]) att[playerId] = { present: true, load: 'med' };
  att[playerId].load = load;
  saveAttendance(sessionId, att);
}

export function togglePresence(sessionId, playerId) {
  const att = getSessionAttendance(sessionId);
  if (!att[playerId]) att[playerId] = { present: false, load: 'med' };
  att[playerId].present = !att[playerId].present;
  saveAttendance(sessionId, att);
  return att[playerId].present;
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export function getPlayerStats(playerId) {
  const sessions = listSessions();
  let totalSessions = 0;
  let attended = 0;
  let loadCounts = { low: 0, med: 0, high: 0 };

  sessions.forEach(s => {
    const att = getSessionAttendance(s.id);
    if (att[playerId]) {
      totalSessions++;
      if (att[playerId].present) {
        attended++;
        const load = att[playerId].load || 'med';
        loadCounts[load]++;
      }
    }
  });

  return {
    totalSessions,
    attended,
    absences: totalSessions - attended,
    attendanceRate: totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0,
    loadCounts,
  };
}

export function getTeamStats() {
  const players = getAllPlayers();
  const sessions = listSessions();

  let totalPresences = 0;
  let totalPossible = 0;

  players.forEach(p => {
    sessions.forEach(s => {
      const att = getSessionAttendance(s.id);
      if (att[p.id]) {
        totalPossible++;
        if (att[p.id].present) totalPresences++;
      }
    });
  });

  return {
    totalPlayers: players.length,
    totalSessions: sessions.length,
    avgAttendance: totalPossible > 0 ? Math.round((totalPresences / totalPossible) * 100) : 0,
  };
}

// ─── Render Players Table for a Session ────────────────────────────────────────

export function renderPlayersTable(container, sessionId) {
  const players = getAllPlayers();
  const att = sessionId ? getSessionAttendance(sessionId) : {};

  if (players.length === 0) {
    container.innerHTML = `
      <div class="sessions-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p>Ainda não adicionaste jogadores.<br>Clica em "+ Jogador" para começar.</p>
      </div>`;
    return;
  }

  let html = `<div class="players-table-wrap"><table class="players-table">
    <thead><tr>
      <th>Jogador</th>
      <th>Nº</th>
      <th>Posição</th>
      ${sessionId ? '<th>Presença</th><th>Carga</th>' : '<th>Presenças</th><th>Taxa</th>'}
      <th></th>
    </tr></thead><tbody>`;

  players.forEach(p => {
    const initials = p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const playerAtt = att[p.id] || { present: false, load: 'med' };

    if (sessionId) {
      // Session attendance mode
      const presClass = playerAtt.present ? 'present' : (att[p.id] ? 'absent' : '');
      html += `<tr>
        <td><div class="player-name-cell">
          <div class="player-avatar">${initials}</div>
          ${p.name}
        </div></td>
        <td>${p.number || '—'}</td>
        <td>${p.position || '—'}</td>
        <td><div class="presence-dot ${presClass}" data-player="${p.id}" data-action="presence"></div></td>
        <td><div class="load-selector">
          <button class="load-chip ${playerAtt.load === 'low' ? 'active-low' : ''}" data-player="${p.id}" data-load="low">Baixa</button>
          <button class="load-chip ${playerAtt.load === 'med' ? 'active-med' : ''}" data-player="${p.id}" data-load="med">Média</button>
          <button class="load-chip ${playerAtt.load === 'high' ? 'active-high' : ''}" data-player="${p.id}" data-load="high">Alta</button>
        </div></td>
        <td><button class="ex-btn del" data-player="${p.id}" data-action="delete" title="Remover jogador">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button></td>
      </tr>`;
    } else {
      // Overview mode with stats
      const stats = getPlayerStats(p.id);
      html += `<tr>
        <td><div class="player-name-cell">
          <div class="player-avatar">${initials}</div>
          ${p.name}
        </div></td>
        <td>${p.number || '—'}</td>
        <td>${p.position || '—'}</td>
        <td>${stats.attended}/${stats.totalSessions}</td>
        <td><span class="session-badge ${stats.attendanceRate >= 80 ? 'badge-green' : stats.attendanceRate >= 50 ? 'badge-yellow' : 'badge-red'}">${stats.attendanceRate}%</span></td>
        <td><button class="ex-btn del" data-player="${p.id}" data-action="delete" title="Remover jogador">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button></td>
      </tr>`;
    }
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}
