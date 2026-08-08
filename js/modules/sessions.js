/**
 * sessions.js — Gestão de sessões de treino
 */
'use strict';

import { getSessions, saveSession, deleteSession as deleteSessionStorage, getSession, generateId } from './storage.js';
import { cloneExercise, getExerciseTotalDuration, getCategoryInfo } from './exercises.js';

// ─── Session CRUD ──────────────────────────────────────────────────────────────

export function createSession(data = {}) {
  const session = {
    id: generateId(),
    name: data.name || 'Novo Treino',
    date: data.date || new Date().toISOString().split('T')[0],
    intensity: data.intensity || 'med', // low, med, high
    notes: data.notes || '',
    exercises: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveSession(session);
  return session;
}

export function updateSession(session) {
  session.updatedAt = new Date().toISOString();
  saveSession(session);
}

export function removeSession(sessionId) {
  deleteSessionStorage(sessionId);
}

export function loadSessionById(sessionId) {
  return getSession(sessionId);
}

export function listSessions() {
  return getSessions();
}

// ─── Exercise management within session ────────────────────────────────────────

export function addExerciseToSession(session, exercise) {
  const clone = cloneExercise(exercise);
  session.exercises.push(clone);
  updateSession(session);
  return clone;
}

export function removeExerciseFromSession(session, instanceId) {
  session.exercises = session.exercises.filter(e => e.instanceId !== instanceId);
  updateSession(session);
}

export function reorderExercises(session, fromIndex, toIndex) {
  const item = session.exercises.splice(fromIndex, 1)[0];
  session.exercises.splice(toIndex, 0, item);
  updateSession(session);
}

export function updateExerciseInSession(session, instanceId, updates) {
  const ex = session.exercises.find(e => e.instanceId === instanceId);
  if (ex) {
    Object.assign(ex, updates);
    updateSession(session);
  }
}

// ─── Session calculations ──────────────────────────────────────────────────────

export function getSessionDuration(session) {
  return session.exercises.reduce((sum, ex) => sum + getExerciseTotalDuration(ex), 0);
}

export function getSessionExerciseCount(session) {
  return session.exercises.length;
}

export function getSessionCategories(session) {
  const cats = new Set(session.exercises.map(e => e.category));
  return [...cats].map(getCategoryInfo);
}

// ─── Duplicate Session ─────────────────────────────────────────────────────────

export function duplicateSession(sessionId) {
  const original = getSession(sessionId);
  if (!original) return null;

  const dup = {
    ...original,
    id: generateId(),
    name: original.name + ' (cópia)',
    date: new Date().toISOString().split('T')[0],
    exercises: original.exercises.map(e => ({ ...e, instanceId: generateId() })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveSession(dup);
  return dup;
}
