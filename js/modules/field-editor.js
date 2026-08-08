/**
 * field-editor.js — Editor visual de exercícios de campo
 */
'use strict';

import { getCategoryInfo } from './exercises.js';

let _activeExercise = null;
let _editorOverlay = null;
let _onSaveCallback = null;

// Drawing state
let _drawMode = 'select'; // 'select', 'arrow', 'dashed-arrow', 'curve', 'zone', 'pencil', 'text'
let _drawColor = 'rgba(255,255,255,0.9)';
let _drawThick = 0.7;
let _tempPoints = [];
let _activeDrag = null;

let _diagram = {
  players: [],
  objects: [],
  shapes: []
};

// ─── Setup & Modal UI ──────────────────────────────────────────────────────────

export function ensureEditorOverlay() {
  if (_editorOverlay) return _editorOverlay;

  _editorOverlay = document.createElement('div');
  _editorOverlay.className = 'timer-overlay'; // Reusing modal background style
  _editorOverlay.id = 'field-editor-overlay';
  _editorOverlay.style.padding = '0';
  _editorOverlay.style.zIndex = '9500';

  _editorOverlay.innerHTML = `
    <div class="fe-container" style="display:flex;flex-direction:row;width:100vw;height:100vh;background:var(--bg);">
      
      <!-- Left sidebar: Objects & Tools -->
      <div class="fe-sidebar" style="width:280px;background:var(--s1);border-right:1px solid var(--b1);display:flex;flex-direction:column;padding:12px;gap:12px;overflow-y:auto;flex-shrink:0;">
        <div class="fe-sidebar-header" style="display:flex;justify-content:space-between;align-items:center;">
          <h2 style="font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700;">Editor de Campo</h2>
          <button class="modal-close" id="fe-close" style="width:24px;height:24px;">✕</button>
        </div>

        <!-- Draggable Objects Panel -->
        <div class="fe-group">
          <div class="form-label" style="margin-bottom:6px;">Elementos (Arrastar)</div>
          <div class="fe-objects-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;">
            <div class="fe-drag-source pl-item pl-gk" data-type="player" data-cls="gk" draggable="true" style="display:flex;align-items:center;gap:6px;padding:6px;border-radius:6px;background:var(--s2);border:1px solid var(--b1);cursor:grab;font-size:11px;">
              <span style="width:14px;height:14px;border-radius:50%;background:#4db8ff;display:inline-block;"></span>GR
            </div>
            <div class="fe-drag-source pl-item pl-f" data-type="player" data-cls="f" draggable="true" style="display:flex;align-items:center;gap:6px;padding:6px;border-radius:6px;background:var(--s2);border:1px solid var(--b1);cursor:grab;font-size:11px;">
              <span style="width:14px;height:14px;border-radius:50%;background:#39e07a;display:inline-block;"></span>Atacante
            </div>
            <div class="fe-drag-source pl-item pl-opp" data-type="player" data-cls="opp" draggable="true" style="display:flex;align-items:center;gap:6px;padding:6px;border-radius:6px;background:var(--s2);border:1px solid var(--b1);cursor:grab;font-size:11px;">
              <span style="width:14px;height:14px;border-radius:50%;background:#ff6060;display:inline-block;"></span>Defesa
            </div>
            <div class="fe-drag-source" data-type="cone" draggable="true" style="display:flex;align-items:center;gap:6px;padding:6px;border-radius:6px;background:var(--s2);border:1px solid var(--b1);cursor:grab;font-size:11px;">
              <span style="font-size:14px;">⚠️</span>Cone
            </div>
            <div class="fe-drag-source" data-type="goal" draggable="true" style="display:flex;align-items:center;gap:6px;padding:6px;border-radius:6px;background:var(--s2);border:1px solid var(--b1);cursor:grab;font-size:11px;">
              <span style="font-size:14px;">🥅</span>Baliza
            </div>
            <div class="fe-drag-source" data-type="ladder" draggable="true" style="display:flex;align-items:center;gap:6px;padding:6px;border-radius:6px;background:var(--s2);border:1px solid var(--b1);cursor:grab;font-size:11px;">
              <span style="font-size:14px;">🪜</span>Escada
            </div>
            <div class="fe-drag-source" data-type="ball" draggable="true" style="display:grid;grid-column: span 2;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px;border-radius:6px;background:var(--s2);border:1px solid var(--b1);cursor:grab;font-size:11px;">
              <span style="font-size:14px;">⚽</span>Bola de Futebol
            </div>
          </div>
        </div>

        <!-- Design tools -->
        <div class="fe-group" style="display:flex;flex-direction:column;gap:4px;">
          <div class="form-label" style="margin-bottom:2px;">Ferramentas</div>
          <button class="btn-secondary active" id="fe-t-select" data-mode="select" style="justify-content:flex-start;font-size:11.5px;padding:6px 10px;">🖐️ Mover Elementos</button>
          <button class="btn-secondary" id="fe-t-arrow" data-mode="arrow" style="justify-content:flex-start;font-size:11.5px;padding:6px 10px;">↗️ Seta Movimento</button>
          <button class="btn-secondary" id="fe-t-dashed" data-mode="dashed-arrow" style="justify-content:flex-start;font-size:11.5px;padding:6px 10px;">⇢ Seta Passe</button>
          <button class="btn-secondary" id="fe-t-curve" data-mode="curve" style="justify-content:flex-start;font-size:11.5px;padding:6px 10px;">↺ Corrida Curva</button>
          <button class="btn-secondary" id="fe-t-zone" data-mode="zone" style="justify-content:flex-start;font-size:11.5px;padding:6px 10px;">🟩 Área / Zona</button>
          <button class="btn-secondary" id="fe-t-pencil" data-mode="pencil" style="justify-content:flex-start;font-size:11.5px;padding:6px 10px;">✏️ Desenho Livre</button>
          <button class="btn-secondary" id="fe-t-text" data-mode="text" style="justify-content:flex-start;font-size:11.5px;padding:6px 10px;">T Texto</button>
        </div>

        <!-- Styling panel -->
        <div class="fe-group">
          <div class="form-label" style="margin-bottom:4px;">Estilo Traço</div>
          <div style="display:flex;gap:4px;margin-bottom:6px;">
            <button class="color-btn active" style="background:#fff;width:24px;height:24px;border-radius:4px;border:none;" data-col="rgba(255,255,255,0.9)"></button>
            <button class="color-btn" style="background:#fbbf24;width:24px;height:24px;border-radius:4px;border:none;" data-col="rgba(251,191,36,0.9)"></button>
            <button class="color-btn" style="background:#f87171;width:24px;height:24px;border-radius:4px;border:none;" data-col="rgba(248,113,113,0.9)"></button>
            <button class="color-btn" style="background:#4db8ff;width:24px;height:24px;border-radius:4px;border:none;" data-col="rgba(77,184,255,0.9)"></button>
            <button class="color-btn" style="background:#39e07a;width:24px;height:24px;border-radius:4px;border:none;" data-col="rgba(57,224,122,0.9)"></button>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="thick-btn" data-thick="0.4" style="flex:1;height:24px;border:1px solid var(--b2);border-radius:4px;background:transparent;color:#fff;font-size:10px;">Fina</button>
            <button class="thick-btn active" data-thick="0.8" style="flex:1;height:24px;border:1px solid var(--b2);border-radius:4px;background:var(--s2);color:#fff;font-size:10px;">Média</button>
            <button class="thick-btn" data-thick="1.4" style="flex:1;height:24px;border:1px solid var(--b2);border-radius:4px;background:transparent;color:#fff;font-size:10px;">Grossa</button>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="fe-group" style="margin-top:auto;display:flex;flex-direction:column;gap:6px;">
          <button class="btn-secondary" id="fe-clear" style="justify-content:center;">🧹 Limpar Campo</button>
          <button class="btn-primary" id="fe-save" style="justify-content:center;background:linear-gradient(135deg, rgba(57,224,122,.2), rgba(57,224,122,.08));box-shadow: 0 0 0 1px rgba(57,224,122,.2);">💾 Guardar Desenho</button>
        </div>
      </div>

      <!-- Center: Main Drawing Pitch -->
      <div class="fe-pitch-area" style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;position:relative;">
        <div id="fe-hint-banner" style="position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(8,13,20,0.9);border:1px solid var(--b2);border-radius:20px;padding:4px 14px;font-size:11px;color:var(--t2);pointer-events:none;z-index:10;">
          🖐️ Clica e arrasta elementos para o relvado.
        </div>

        <div id="fe-pitch-wrap" style="position:relative;height:100%;aspect-ratio:68/52.5;max-width:100%;max-height:100%;border-radius:12px;overflow:hidden;background:#0d1e15;box-shadow:0 0 32px rgba(0,0,0,0.5);">
          <!-- Half football pitch background -->
          <svg id="fe-pitch-bg" viewBox="0 0 68 52.5" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;">
            <!-- Outer border -->
            <rect x="2" y="2" width="64" height="48.5" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="0.5"/>
            <!-- Goal -->
            <rect x="30.34" y="0" width="7.32" height="2" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="0.5"/>
            <!-- Small box -->
            <rect x="24.84" y="2" width="18.32" height="5.5" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="0.5"/>
            <!-- Penalty box -->
            <rect x="13.84" y="2" width="40.32" height="16.5" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="0.5"/>
            <!-- Penalty spot -->
            <circle cx="34" cy="13" r="0.5" fill="#fff"/>
            <!-- Penalty arc -->
            <path d="M24.3,18.5 A9.15,9.15 0 0,0 43.7,18.5" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="0.5"/>
            <!-- Center circle arc -->
            <path d="M24.85,50.5 A9.15,9.15 0 0,1 43.15,50.5" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="0.5"/>
            <circle cx="34" cy="50.5" r="0.5" fill="#fff"/>
          </svg>

          <!-- SVG overlays for shapes -->
          <svg id="fe-pitch-shapes" viewBox="0 0 68 52.5" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;"></svg>
          <svg id="fe-pitch-preview" viewBox="0 0 68 52.5" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;"></svg>

          <!-- Div container for draggable DOM items -->
          <div id="fe-pitch-items" style="position:absolute;inset:0;z-index:4;pointer-events:none;"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(_editorOverlay);
  bindEditorEvents();

  return _editorOverlay;
}

// ─── Events Binding ────────────────────────────────────────────────────────────

function bindEditorEvents() {
  const overlay = _editorOverlay;

  // Close & Save
  overlay.querySelector('#fe-close').addEventListener('click', closeEditor);
  overlay.querySelector('#fe-save').addEventListener('click', saveDiagram);
  overlay.querySelector('#fe-clear').addEventListener('click', clearField);

  // Tools Selection
  overlay.querySelectorAll('.fe-sidebar button[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.fe-sidebar button[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setDrawMode(btn.dataset.mode);
    });
  });

  // Color Selection
  overlay.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _drawColor = btn.dataset.col;
    });
  });

  // Thickness Selection
  overlay.querySelectorAll('.thick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.thick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _drawThick = parseFloat(btn.dataset.thick);
    });
  });

  // Draggable sources (sidebar)
  overlay.querySelectorAll('.fe-drag-source').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('fe-object', JSON.stringify({
        type: el.dataset.type,
        cls: el.dataset.cls || ''
      }));
    });
  });

  // Drop target (pitch)
  const pitchWrap = overlay.querySelector('#fe-pitch-wrap');
  pitchWrap.addEventListener('dragover', (e) => e.preventDefault());
  pitchWrap.addEventListener('drop', (e) => {
    e.preventDefault();
    const rect = pitchWrap.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 68;
    const py = ((e.clientY - rect.top) / rect.height) * 52.5;

    try {
      const data = JSON.parse(e.dataTransfer.getData('fe-object'));
      addObject(data.type, data.cls, px, py);
    } catch {}
  });

  // Mouse / Touch drawing on shapes SVG overlay
  const shapesSvg = overlay.querySelector('#fe-pitch-shapes');
  shapesSvg.style.pointerEvents = 'auto';

  shapesSvg.addEventListener('mousedown', onMouseDown);
  shapesSvg.addEventListener('mousemove', onMouseMove);
  shapesSvg.addEventListener('mouseup', onMouseUp);

  // Prevent context menu inside pitch
  shapesSvg.addEventListener('contextmenu', e => e.preventDefault());
}

function setDrawMode(mode) {
  _drawMode = mode;
  _tempPoints = [];
  const banner = _editorOverlay.querySelector('#fe-hint-banner');

  const hints = {
    'select': '🖐️ Arraste os cones, balizas e jogadores para organizar o exercício.',
    'arrow': '↗️ Seta Movimento: Clique nos pontos do campo, duplo-clique para terminar.',
    'dashed-arrow': '⇢ Seta Passe: Clique nos pontos do campo, duplo-clique para terminar.',
    'curve': '↺ Corrida Curva: Clique no início, no ponto de curva, e duplo-clique no fim.',
    'zone': '🟩 Área/Zona: Clique para adicionar vértices, duplo-clique para fechar a zona.',
    'pencil': '✏️ Desenho Livre: Pressione e arraste o rato no campo.',
    'text': 'T Texto: Clique no campo e introduza uma etiqueta de texto.'
  };
  banner.textContent = hints[mode] || '';
}

// ─── Drawing logic ─────────────────────────────────────────────────────────────

function getSvgCoords(e) {
  const pitchWrap = _editorOverlay.querySelector('#fe-pitch-wrap');
  const rect = pitchWrap.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 68;
  const y = ((e.clientY - rect.top) / rect.height) * 52.5;
  return { x: Math.max(0, Math.min(68, x)), y: Math.max(0, Math.min(52.5, y)) };
}

function onMouseDown(e) {
  if (_drawMode === 'select') return;

  const pt = getSvgCoords(e);
  
  if (_drawMode === 'pencil') {
    _activeDrag = { drawing: true, points: [pt] };
    return;
  }

  // Multi-point shapes (arrow, dashed-arrow, curve, zone)
  if (e.detail === 2) {
    // Double click finish
    finishCurrentDrawing();
    return;
  }

  if (_drawMode === 'text') {
    const text = prompt('Introduza o texto da etiqueta:');
    if (text) {
      _diagram.shapes.push({
        id: 'sh-' + Date.now(),
        type: 'text',
        label: text,
        stroke: _drawColor,
        points: [pt]
      });
      renderDiagram();
    }
    return;
  }

  _tempPoints.push(pt);
  renderPreview();
}

function onMouseMove(e) {
  if (!_activeDrag || !_activeDrag.drawing) return;
  const pt = getSvgCoords(e);
  _activeDrag.points.push(pt);
  renderPencilPreview();
}

function onMouseUp() {
  if (_activeDrag && _activeDrag.drawing) {
    if (_activeDrag.points.length >= 2) {
      _diagram.shapes.push({
        id: 'sh-' + Date.now(),
        type: 'pencil',
        stroke: _drawColor,
        thick: _drawThick,
        points: _activeDrag.points
      });
    }
    _activeDrag = null;
    renderDiagram();
    _editorOverlay.querySelector('#fe-pitch-preview').innerHTML = '';
  }
}

function renderPencilPreview() {
  const svg = _editorOverlay.querySelector('#fe-pitch-preview');
  svg.innerHTML = `
    <polyline points="${_activeDrag.points.map(p => `${p.x},${p.y}`).join(' ')}"
              fill="none" stroke="${_drawColor}" stroke-width="${_drawThick}"
              stroke-linecap="round" stroke-linejoin="round" />
  `;
}

function renderPreview() {
  const svg = _editorOverlay.querySelector('#fe-pitch-preview');
  svg.innerHTML = '';
  if (_tempPoints.length === 0) return;

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('opacity', '0.6');

  if (_drawMode === 'arrow' || _drawMode === 'dashed-arrow') {
    const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    pl.setAttribute('points', _tempPoints.map(p => `${p.x},${p.y}`).join(' '));
    pl.setAttribute('fill', 'none');
    pl.setAttribute('stroke', _drawColor);
    pl.setAttribute('stroke-width', _drawThick);
    if (_drawMode === 'dashed-arrow') pl.setAttribute('stroke-dasharray', '1.2 1.2');
    g.appendChild(pl);

    _tempPoints.forEach(pt => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', pt.x);
      c.setAttribute('cy', pt.y);
      c.setAttribute('r', '0.7');
      c.setAttribute('fill', _drawColor);
      g.appendChild(c);
    });
  } else if (_drawMode === 'curve') {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let d = `M${_tempPoints[0].x},${_tempPoints[0].y} `;
    if (_tempPoints.length === 2) d += `L${_tempPoints[1].x},${_tempPoints[1].y}`;
    else if (_tempPoints.length === 3) d += `Q${_tempPoints[1].x},${_tempPoints[1].y} ${_tempPoints[2].x},${_tempPoints[2].y}`;
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', _drawColor);
    p.setAttribute('stroke-width', _drawThick);
    g.appendChild(p);
  } else if (_drawMode === 'zone') {
    const pg = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    pg.setAttribute('points', _tempPoints.map(p => `${p.x},${p.y}`).join(' '));
    pg.setAttribute('fill', _drawColor.replace(/[^,]+(?=\))/, '0.15'));
    pg.setAttribute('stroke', _drawColor);
    pg.setAttribute('stroke-width', _drawThick);
    g.appendChild(pg);
  }

  svg.appendChild(g);
}

function finishCurrentDrawing() {
  if (_tempPoints.length < 2) {
    _tempPoints = [];
    renderPreview();
    return;
  }

  _diagram.shapes.push({
    id: 'sh-' + Date.now(),
    type: _drawMode,
    stroke: _drawColor,
    thick: _drawThick,
    points: [..._tempPoints]
  });

  _tempPoints = [];
  renderPreview();
  renderDiagram();
}

// ─── Object Add & Drag ─────────────────────────────────────────────────────────

function addObject(type, cls, x, y) {
  if (type === 'player') {
    const num = _diagram.players.length + 1;
    _diagram.players.push({
      id: 'p-' + Date.now() + Math.random().toString(36).slice(2, 5),
      cls: cls || 'f',
      x, y,
      label: cls === 'gk' ? '1' : String(num)
    });
  } else {
    _diagram.objects.push({
      id: 'o-' + Date.now() + Math.random().toString(36).slice(2, 5),
      type,
      x, y
    });
  }
  renderDiagram();
}

function renderDiagram() {
  const container = _editorOverlay.querySelector('#fe-pitch-items');
  const svg = _editorOverlay.querySelector('#fe-pitch-shapes');
  container.innerHTML = '';
  svg.innerHTML = '';

  // Render draggable DOM items (players & tools)
  // Players
  _diagram.players.forEach(p => {
    const el = document.createElement('div');
    el.className = `pl pl-${p.cls}`;
    el.style.left = `${(p.x / 68) * 100}%`;
    el.style.top = `${(p.y / 52.5) * 100}%`;
    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'grab';

    el.innerHTML = `
      <div class="pl-tok" style="width:24px;height:24px;font-size:10px;">${p.label}</div>
      <button class="fe-del-btn" style="position:absolute;top:-8px;right:-8px;background:var(--red);color:#fff;border:none;border-radius:50%;width:14px;height:14px;font-size:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity .15s;">✕</button>
    `;

    // Draggable behavior inside field
    el.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('fe-del-btn')) return;
      if (_drawMode !== 'select') return;
      const rect = _editorOverlay.querySelector('#fe-pitch-wrap').getBoundingClientRect();
      
      const onMove = (moveEv) => {
        p.x = Math.max(0, Math.min(68, ((moveEv.clientX - rect.left) / rect.width) * 68));
        p.y = Math.max(0, Math.min(52.5, ((moveEv.clientY - rect.top) / rect.height) * 52.5));
        el.style.left = `${(p.x / 68) * 100}%`;
        el.style.top = `${(p.y / 52.5) * 100}%`;
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        renderDiagram(); // re-render lines anchored to player
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    // Delete button
    el.querySelector('.fe-del-btn').addEventListener('click', () => {
      _diagram.players = _diagram.players.filter(x => x.id !== p.id);
      renderDiagram();
    });

    el.addEventListener('mouseenter', () => el.querySelector('.fe-del-btn').style.opacity = '1');
    el.addEventListener('mouseleave', () => el.querySelector('.fe-del-btn').style.opacity = '0');

    container.appendChild(el);
  });

  // Accessory Objects (Cones, Goals, Agility Ladders, Ball)
  _diagram.objects.forEach(obj => {
    const el = document.createElement('div');
    el.style.left = `${(obj.x / 68) * 100}%`;
    el.style.top = `${(obj.y / 52.5) * 100}%`;
    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'grab';

    if (obj.type === 'cone') {
      el.innerHTML = `<div style="font-size:18px;">⚠️</div>`;
    } else if (obj.type === 'goal') {
      el.innerHTML = `<div style="font-size:20px;">🥅</div>`;
    } else if (obj.type === 'ladder') {
      el.innerHTML = `
        <div style="width:36px;height:70px;border:2px solid #5bbfff;display:flex;flex-direction:column;justify-content:space-between;padding:2px 0;opacity:0.8;">
          <div style="height:2px;background:#5bbfff;"></div>
          <div style="height:2px;background:#5bbfff;"></div>
          <div style="height:2px;background:#5bbfff;"></div>
          <div style="height:2px;background:#5bbfff;"></div>
        </div>`;
    } else if (obj.type === 'ball') {
      el.innerHTML = `<div style="font-size:14px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">⚽</div>`;
    }

    el.innerHTML += `<button class="fe-del-btn" style="position:absolute;top:-8px;right:-8px;background:var(--red);color:#fff;border:none;border-radius:50%;width:14px;height:14px;font-size:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity .15s;">✕</button>`;

    // Drag behavior
    el.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('fe-del-btn')) return;
      if (_drawMode !== 'select') return;
      const rect = _editorOverlay.querySelector('#fe-pitch-wrap').getBoundingClientRect();
      
      const onMove = (moveEv) => {
        obj.x = Math.max(0, Math.min(68, ((moveEv.clientX - rect.left) / rect.width) * 68));
        obj.y = Math.max(0, Math.min(52.5, ((moveEv.clientY - rect.top) / rect.height) * 52.5));
        el.style.left = `${(obj.x / 68) * 100}%`;
        el.style.top = `${(obj.y / 52.5) * 100}%`;
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    el.querySelector('.fe-del-btn').addEventListener('click', () => {
      _diagram.objects = _diagram.objects.filter(x => x.id !== obj.id);
      renderDiagram();
    });

    el.addEventListener('mouseenter', () => el.querySelector('.fe-del-btn').style.opacity = '1');
    el.addEventListener('mouseleave', () => el.querySelector('.fe-del-btn').style.opacity = '0');

    container.appendChild(el);
  });

  // Render drawing Shapes in SVG
  _diagram.shapes.forEach(s => {
    if (s.type === 'arrow' || s.type === 'dashed-arrow') {
      const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      pl.setAttribute('points', s.points.map(p => `${p.x},${p.y}`).join(' '));
      pl.setAttribute('fill', 'none');
      pl.setAttribute('stroke', s.stroke);
      pl.setAttribute('stroke-width', s.thick || '0.7');
      if (s.type === 'dashed-arrow') pl.setAttribute('stroke-dasharray', '1.2 1.2');
      svg.appendChild(pl);

      // Add arrowhead at end of line
      const last = s.points[s.points.length - 1];
      const prev = s.points[s.points.length - 2];
      if (last && prev) {
        const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const L = 2.5;
        head.setAttribute('points', [
          `${last.x},${last.y}`,
          `${last.x - L * Math.cos(ang - 0.42)},${last.y - L * Math.sin(ang - 0.42)}`,
          `${last.x - L * Math.cos(ang + 0.42)},${last.y - L * Math.sin(ang + 0.42)}`
        ].join(' '));
        head.setAttribute('fill', s.stroke);
        svg.appendChild(head);
      }
    } else if (s.type === 'curve') {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      let d = `M${s.points[0].x},${s.points[0].y} `;
      if (s.points.length === 2) d += `L${s.points[1].x},${s.points[1].y}`;
      else d += `Q${s.points[1].x},${s.points[1].y} ${s.points[2].x},${s.points[2].y}`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', s.stroke);
      path.setAttribute('stroke-width', s.thick || '0.7');
      svg.appendChild(path);

      // Arrowhead for curve
      const last = s.points[s.points.length - 1];
      const prev = s.points[s.points.length - 2] || s.points[0];
      if (last && prev) {
        const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const L = 2.5;
        head.setAttribute('points', [
          `${last.x},${last.y}`,
          `${last.x - L * Math.cos(ang - 0.42)},${last.y - L * Math.sin(ang - 0.42)}`,
          `${last.x - L * Math.cos(ang + 0.42)},${last.y - L * Math.sin(ang + 0.42)}`
        ].join(' '));
        head.setAttribute('fill', s.stroke);
        svg.appendChild(head);
      }
    } else if (s.type === 'zone') {
      const pg = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      pg.setAttribute('points', s.points.map(p => `${p.x},${p.y}`).join(' '));
      pg.setAttribute('fill', s.stroke.replace(/[^,]+(?=\))/, '0.15'));
      pg.setAttribute('stroke', s.stroke);
      pg.setAttribute('stroke-width', s.thick || '0.7');
      svg.appendChild(pg);
    } else if (s.type === 'pencil') {
      const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      pl.setAttribute('points', s.points.map(p => `${p.x},${p.y}`).join(' '));
      pl.setAttribute('fill', 'none');
      pl.setAttribute('stroke', s.stroke);
      pl.setAttribute('stroke-width', s.thick || '0.6');
      pl.setAttribute('stroke-linecap', 'round');
      pl.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(pl);
    } else if (s.type === 'text') {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', s.points[0].x);
      text.setAttribute('y', s.points[0].y);
      text.setAttribute('fill', s.stroke);
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-size', '2.2');
      text.setAttribute('font-weight', '600');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = s.label;
      svg.appendChild(text);
    }
  });
}

function clearField() {
  if (confirm('Tens a certeza que queres limpar todo o desenho?')) {
    _diagram = { players: [], objects: [], shapes: [] };
    renderDiagram();
  }
}

// ─── Modal Open / Close ────────────────────────────────────────────────────────

export function openFieldEditor(exercise, onSave) {
  _activeExercise = exercise;
  _onSaveCallback = onSave;

  const overlay = ensureEditorOverlay();
  overlay.classList.add('active');

  // Load existing diagram or default to empty
  if (exercise.diagram) {
    _diagram = JSON.parse(JSON.stringify(exercise.diagram));
  } else {
    _diagram = { players: [], objects: [], shapes: [] };
  }

  setDrawMode('select');
  renderDiagram();
}

export function closeEditor() {
  _editorOverlay?.classList.remove('active');
  _activeExercise = null;
}

function saveDiagram() {
  if (_activeExercise) {
    _activeExercise.diagram = JSON.parse(JSON.stringify(_diagram));
    if (_onSaveCallback) _onSaveCallback(_activeExercise);
    closeEditor();
  }
}

// ─── Static Thumbnail Generator ───────────────────────────────────────────────

/**
 * Generates an inline SVG representing the exercise diagram to be placed inside cards.
 * Returns an HTML string.
 */
export function getDiagramThumbnailSVG(diagram) {
  if (!diagram || (!diagram.players?.length && !diagram.objects?.length && !diagram.shapes?.length)) {
    return `<div class="ex-no-diagram" style="width:100%;height:100%;background:rgba(255,255,255,0.02);border:1px dashed var(--b2);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--t3);font-size:10px;">Sem desenho</div>`;
  }

  let svgElements = '';

  // Render shapes
  (diagram.shapes || []).forEach(s => {
    if (s.type === 'arrow' || s.type === 'dashed-arrow') {
      const strokeDash = s.type === 'dashed-arrow' ? 'stroke-dasharray="1 1"' : '';
      svgElements += `<polyline points="${s.points.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${s.stroke}" stroke-width="0.8" ${strokeDash} />`;
      // Arrowhead
      const last = s.points[s.points.length - 1];
      const prev = s.points[s.points.length - 2];
      if (last && prev) {
        const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
        const L = 2.5;
        const pts = [
          `${last.x},${last.y}`,
          `${last.x - L * Math.cos(ang - 0.42)},${last.y - L * Math.sin(ang - 0.42)}`,
          `${last.x - L * Math.cos(ang + 0.42)},${last.y - L * Math.sin(ang + 0.42)}`
        ].join(' ');
        svgElements += `<polygon points="${pts}" fill="${s.stroke}" />`;
      }
    } else if (s.type === 'curve') {
      let d = `M${s.points[0].x},${s.points[0].y} `;
      if (s.points.length === 2) d += `L${s.points[1].x},${s.points[1].y}`;
      else d += `Q${s.points[1].x},${s.points[1].y} ${s.points[2].x},${s.points[2].y}`;
      svgElements += `<path d="${d}" fill="none" stroke="${s.stroke}" stroke-width="0.8" />`;

      const last = s.points[s.points.length - 1];
      const prev = s.points[s.points.length - 2] || s.points[0];
      if (last && prev) {
        const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
        const L = 2.5;
        const pts = [
          `${last.x},${last.y}`,
          `${last.x - L * Math.cos(ang - 0.42)},${last.y - L * Math.sin(ang - 0.42)}`,
          `${last.x - L * Math.cos(ang + 0.42)},${last.y - L * Math.sin(ang + 0.42)}`
        ].join(' ');
        svgElements += `<polygon points="${pts}" fill="${s.stroke}" />`;
      }
    } else if (s.type === 'zone') {
      svgElements += `<polygon points="${s.points.map(p => `${p.x},${p.y}`).join(' ')}" fill="${s.stroke.replace(/[^,]+(?=\))/, '0.15')}" stroke="${s.stroke}" stroke-width="0.8" />`;
    } else if (s.type === 'pencil') {
      svgElements += `<polyline points="${s.points.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${s.stroke}" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round" />`;
    } else if (s.type === 'text') {
      svgElements += `<text x="${s.points[0].x}" y="${s.points[0].y}" fill="${s.stroke}" font-family="sans-serif" font-size="2" font-weight="bold" text-anchor="middle">${s.label}</text>`;
    }
  });

  // Render objects
  (diagram.objects || []).forEach(o => {
    if (o.type === 'cone') {
      svgElements += `<polygon points="${o.x},${o.y - 1.5} ${o.x - 1.2},${o.y + 1.2} ${o.x + 1.2},${o.y + 1.2}" fill="#fbbf24" stroke="rgba(0,0,0,0.4)" stroke-width="0.2" />`;
    } else if (o.type === 'goal') {
      svgElements += `<rect x="${o.x - 2.5}" y="${o.y - 1.2}" width="5" height="2.4" rx="0.3" fill="none" stroke="#fb923c" stroke-width="0.5" />`;
    } else if (o.type === 'ladder') {
      svgElements += `
        <g opacity="0.8">
          <line x1="${o.x - 2}" y1="${o.y - 4}" x2="${o.x - 2}" y2="${o.y + 4}" stroke="#5bbfff" stroke-width="0.4" />
          <line x1="${o.x + 2}" y1="${o.y - 4}" x2="${o.x + 2}" y2="${o.y + 4}" stroke="#5bbfff" stroke-width="0.4" />
          <line x1="${o.x - 2}" y1="${o.y - 2}" x2="${o.x + 2}" y2="${o.y - 2}" stroke="#5bbfff" stroke-width="0.4" />
          <line x1="${o.x - 2}" y1="${o.y}" x2="${o.x + 2}" y2="${o.y}" stroke="#5bbfff" stroke-width="0.4" />
          <line x1="${o.x - 2}" y1="${o.y + 2}" x2="${o.x + 2}" y2="${o.y + 2}" stroke="#5bbfff" stroke-width="0.4" />
        </g>
      `;
    } else if (o.type === 'ball') {
      svgElements += `<circle cx="${o.x}" cy="${o.y}" r="0.8" fill="#fff" stroke="#000" stroke-width="0.2" />`;
    }
  });

  // Render players
  (diagram.players || []).forEach(p => {
    let color = '#39e07a';
    if (p.cls === 'gk') color = '#4db8ff';
    if (p.cls === 'opp') color = '#ff6060';

    svgElements += `
      <g>
        <circle cx="${p.x}" cy="${p.y}" r="1.4" fill="${color}" stroke="#fff" stroke-width="0.3" />
        <text x="${p.x}" y="${p.y + 0.4}" fill="#000" font-family="monospace" font-size="1.3" font-weight="bold" text-anchor="middle">${p.label || ''}</text>
      </g>
    `;
  });

  return `
    <svg viewBox="0 0 68 52.5" style="width:100%;height:100%;background:#09140f;border-radius:6px;border:1px solid rgba(255,255,255,0.05);overflow:hidden;">
      <!-- Pitch background -->
      <rect x="2" y="2" width="64" height="48.5" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" />
      <rect x="13.84" y="2" width="40.32" height="16.5" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" />
      <circle cx="34" cy="13" r="0.4" fill="rgba(255,255,255,0.3)" />
      <!-- Rendered items -->
      ${svgElements}
    </svg>
  `;
}
