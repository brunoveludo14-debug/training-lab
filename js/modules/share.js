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
  const categories = {
    'aquecimento': '🔥 Aquecimento',
    'posse': '⚽ Posse de Bola',
    'finalizacao': '🎯 Finalização',
    'fisico': '🏃 Físico',
    'tatico': '🧠 Tático',
    'retorno': '🧊 Retorno à Calma',
  };

  const totalMins = session.exercises.reduce((sum, ex) => {
    return sum + (ex.duration || 0) * (ex.sets || 1) + (ex.rest || 0) * Math.max(0, (ex.sets || 1) - 1);
  }, 0);

  let html = `<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8">
<title>${session.name} — Training Lab</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', sans-serif; padding: 24px; color: #1a1a2e; background: #fff; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #f0f0f5; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; border-bottom: 2px solid #ddd; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  tr:hover { background: #f8f8fc; }
  .cat { font-size: 11px; color: #888; }
  .num { font-family: 'Courier New', monospace; font-weight: 600; }
  @media print { body { padding: 12px; } }
</style></head><body>
<h1>📋 ${session.name}</h1>
<div class="meta">${session.date || ''} · ${totalMins} min · Intensidade: ${session.intensity === 'low' ? 'Baixa' : session.intensity === 'high' ? 'Alta' : 'Média'}</div>
<table>
<thead><tr><th>#</th><th>Exercício</th><th>Categoria</th><th>Duração</th><th>Séries</th><th>Pausa</th><th>Descrição</th></tr></thead>
<tbody>`;

  session.exercises.forEach((ex, i) => {
    html += `<tr>
      <td class="num">${i + 1}</td>
      <td><strong>${ex.name}</strong></td>
      <td class="cat">${categories[ex.category] || ex.category}</td>
      <td class="num">${ex.duration} min</td>
      <td class="num">${ex.sets || 1}x</td>
      <td class="num">${ex.rest || 0} min</td>
      <td>${ex.desc || '—'}</td>
    </tr>`;
  });

  html += `</tbody></table>
<div style="margin-top:20px;font-size:11px;color:#999;text-align:center;">Gerado por Training Lab</div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}
