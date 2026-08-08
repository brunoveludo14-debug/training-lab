/**
 * storage.js — Persistência com localStorage
 * Todas as chaves usam prefixo "tlab_" para não conflitar com "tl_" da TaticalLab.
 */
'use strict';

const KEYS = {
  sessions:  'tlab_sessions',
  exercises: 'tlab_custom_exercises',
  players:   'tlab_players',
  attendance:'tlab_attendance',
  calendar:  'tlab_calendar',
  settings:  'tlab_settings',
};

// ─── Generic helpers ───────────────────────────────────────────────────────────

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch { return null; }
}

function write(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (e) { console.warn('Storage write failed:', e); }
}

// ─── Sessions ──────────────────────────────────────────────────────────────────

export function getSessions() {
  return read(KEYS.sessions) || [];
}

export function saveSession(session) {
  const list = getSessions();
  const idx = list.findIndex(s => s.id === session.id);
  if (idx >= 0) list[idx] = session;
  else list.unshift(session);
  write(KEYS.sessions, list);
}

export function deleteSession(sessionId) {
  const list = getSessions().filter(s => s.id !== sessionId);
  write(KEYS.sessions, list);
}

export function getSession(sessionId) {
  return getSessions().find(s => s.id === sessionId) || null;
}

// ─── Custom Exercises ──────────────────────────────────────────────────────────

export function getCustomExercises() {
  return read(KEYS.exercises) || [];
}

export function saveCustomExercise(exercise) {
  const list = getCustomExercises();
  const idx = list.findIndex(e => e.id === exercise.id);
  if (idx >= 0) list[idx] = exercise;
  else list.push(exercise);
  write(KEYS.exercises, list);
}

export function deleteCustomExercise(exerciseId) {
  const list = getCustomExercises().filter(e => e.id !== exerciseId);
  write(KEYS.exercises, list);
}

// ─── Players ───────────────────────────────────────────────────────────────────

export function getPlayers() {
  const players = read(KEYS.players);
  if (players) return players;

  // Try to import from TaticalLab's playerfit data
  try {
    const tl = JSON.parse(localStorage.getItem('tl_playerfit') || '{}');
    const imported = Object.entries(tl).map(([id, data]) => ({
      id,
      name: data.name || id,
      number: data.number || '',
      position: data.position || '',
    }));
    if (imported.length > 0) {
      write(KEYS.players, imported);
      return imported;
    }
  } catch {}

  return [];
}

export function savePlayers(players) {
  write(KEYS.players, players);
}

export function addPlayer(player) {
  const list = getPlayers();
  list.push(player);
  write(KEYS.players, list);
}

export function removePlayer(playerId) {
  const list = getPlayers().filter(p => p.id !== playerId);
  write(KEYS.players, list);
}

// ─── Attendance ────────────────────────────────────────────────────────────────

export function getAttendance() {
  return read(KEYS.attendance) || {};
}

/**
 * Set attendance for a session.
 * @param {string} sessionId
 * @param {Object} data - { playerId: { present: boolean, load: 'low'|'med'|'high' } }
 */
export function saveAttendance(sessionId, data) {
  const all = getAttendance();
  all[sessionId] = data;
  write(KEYS.attendance, all);
}

export function getSessionAttendance(sessionId) {
  return getAttendance()[sessionId] || {};
}

// ─── Calendar Assignments ──────────────────────────────────────────────────────

export function getCalendar() {
  return read(KEYS.calendar) || {};
}

/**
 * Assign a session to a date.
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} sessionId
 */
export function assignToDate(dateStr, sessionId) {
  const cal = getCalendar();
  if (!cal[dateStr]) cal[dateStr] = [];
  if (!cal[dateStr].includes(sessionId)) cal[dateStr].push(sessionId);
  write(KEYS.calendar, cal);
}

export function removeFromDate(dateStr, sessionId) {
  const cal = getCalendar();
  if (cal[dateStr]) {
    cal[dateStr] = cal[dateStr].filter(id => id !== sessionId);
    if (cal[dateStr].length === 0) delete cal[dateStr];
  }
  write(KEYS.calendar, cal);
}

export function moveSession(fromDate, toDate, sessionId) {
  removeFromDate(fromDate, sessionId);
  assignToDate(toDate, sessionId);
}

// ─── Export / Import ───────────────────────────────────────────────────────────

export function exportAll() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions: getSessions(),
    customExercises: getCustomExercises(),
    players: getPlayers(),
    attendance: getAttendance(),
    calendar: getCalendar(),
  };
}

export function importAll(data) {
  if (data.sessions) write(KEYS.sessions, data.sessions);
  if (data.customExercises) write(KEYS.exercises, data.customExercises);
  if (data.players) write(KEYS.players, data.players);
  if (data.attendance) write(KEYS.attendance, data.attendance);
  if (data.calendar) write(KEYS.calendar, data.calendar);
}

// ─── Utility ───────────────────────────────────────────────────────────────────

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
