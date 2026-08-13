/**
 * share.js — Exportação e partilha
 */
'use strict';

import { exportAll, importAll } from './storage.js';

// ─── JSON Export / Import ──────────────────────────────────────────────────────

export function exportJSON() {
  const data = exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `training-lab-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importJSON() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return reject('No file');
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        importAll(data);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}

// ─── Share via URL ─────────────────────────────────────────────────────────────

export function buildShareURL(session) {
  const data = {
    n: session.name,
    i: session.intensity,
    e: session.exercises.map(ex => ({
      n: ex.name,
      c: ex.category,
      d: ex.duration,
      s: ex.sets,
      r: ex.rest,
    })),
  };
  const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
  return `${window.location.origin}${window.location.pathname}?share=${encoded}`;
}

export function parseShareURL() {
  const params = new URLSearchParams(window.location.search);
  const share = params.get('share');
  if (!share) return null;
  try {
    const decoded = JSON.parse(decodeURIComponent(atob(share)));
    return {
      name: decoded.n,
      intensity: decoded.i,
      exercises: (decoded.e || []).map(ex => ({
        name: ex.n,
        category: ex.c,
        duration: ex.d,
        sets: ex.s,
        rest: ex.r,
        desc: '',
        players: '',
        instanceId: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      })),
    };
  } catch {
    return null;
  }
}

// ─── Print / PDF-like export ───────────────────────────────────────────────────

export function printSession(session) {
  // A impressão agora é gerida 100% por CSS @media print
  // que transforma a vista atual do detalhe do treino numa página A4 elegante.
  window.print();
}
