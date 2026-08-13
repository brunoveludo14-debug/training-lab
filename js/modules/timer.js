/**
 * timer.js — Cronómetro de execução de treino
 */
'use strict';

let _overlay = null;
let _interval = null;
let _state = {
  running: false,
  paused: false,
  session: null,
  exerciseIndex: 0,
  secondsLeft: 0,
  totalSessionTime: 0,
  elapsedSessionTime: 0,
  inRest: false,
  currentSet: 1,
};

let _onComplete = null;
let _audioCtx = null;

// ─── Audio ─────────────────────────────────────────────────────────────────────

function beep(freq = 800, dur = 200) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain);
    gain.connect(_audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(_audioCtx.currentTime + dur / 1000);
  } catch {}
}

function beepTransition() {
  beep(600, 150);
  setTimeout(() => beep(800, 150), 200);
  setTimeout(() => beep(1000, 200), 400);
}

// ─── Timer UI ──────────────────────────────────────────────────────────────────

function ensureOverlay() {
  if (_overlay) return _overlay;

  _overlay = document.createElement('div');
  _overlay.className = 'timer-overlay';
  _overlay.id = 'timer-overlay';
  _overlay.innerHTML = `
    <div class="timer-container">
      <div class="timer-exercise-name" id="timer-ex-name">Exercício</div>
      <div class="timer-exercise-desc" id="timer-ex-desc"></div>

      <div class="timer-progress-ring">
        <svg viewBox="0 0 200 200">
          <circle class="timer-track" cx="100" cy="100" r="90"/>
          <circle class="timer-fill" id="timer-ring" cx="100" cy="100" r="90"
                  stroke-dasharray="565.48" stroke-dashoffset="0"/>
        </svg>
        <div class="timer-center">
          <div class="timer-time" id="timer-time">00:00</div>
          <div class="timer-label" id="timer-label">TRABALHO</div>
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:8px;width:100%;">
        <span class="timer-label" id="timer-set-info" style="letter-spacing:.05em;">Série 1/1</span>
      </div>

      <div class="timer-global-progress" id="timer-timeline">
      </div>
      <div class="timer-global-info">
        <span id="timer-ex-counter">Exercício 1/1</span>
        <span id="timer-elapsed">0 min</span>
      </div>

      <div class="timer-controls">
        <button class="timer-btn timer-btn-secondary" id="timer-prev" title="Exercício anterior">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button class="timer-btn timer-btn-play" id="timer-play" title="Play/Pause">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <button class="timer-btn timer-btn-secondary" id="timer-next" title="Próximo exercício">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="timer-btn timer-btn-stop" id="timer-stop" title="Parar treino">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(_overlay);

  // Bind controls
  document.getElementById('timer-play').addEventListener('click', togglePlayPause);
  document.getElementById('timer-stop').addEventListener('click', stopTimer);
  document.getElementById('timer-next').addEventListener('click', nextExercise);
  document.getElementById('timer-prev').addEventListener('click', prevExercise);

  return _overlay;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateDisplay() {
  const ex = _state.session?.exercises[_state.exerciseIndex];
  if (!ex) return;

  document.getElementById('timer-ex-name').textContent = _state.inRest ? '⏸ Pausa' : ex.name;
  document.getElementById('timer-ex-desc').textContent = _state.inRest ? 'Descansa e prepara o próximo exercício' : (ex.desc || '');
  document.getElementById('timer-time').textContent = formatTime(_state.secondsLeft);
  document.getElementById('timer-label').textContent = _state.inRest ? 'PAUSA' : 'TRABALHO';
  document.getElementById('timer-label').style.color = _state.inRest ? 'var(--yel)' : 'var(--acc)';

  // Ring progress
  const totalSecs = _state.inRest ? (ex.rest || 1) * 60 : (ex.duration || 1) * 60;
  const progress = 1 - (_state.secondsLeft / totalSecs);
  const circumference = 2 * Math.PI * 90;
  const ring = document.getElementById('timer-ring');
  ring.style.strokeDashoffset = circumference * (1 - progress);
  ring.style.stroke = _state.inRest ? 'var(--yel)' : 'var(--acc)';

  // Set info
  document.getElementById('timer-set-info').textContent = `Série ${_state.currentSet}/${ex.sets || 1}`;

  // Global progress
  const total = _state.session.exercises.length;
  document.getElementById('timer-ex-counter').textContent = `Exercício ${_state.exerciseIndex + 1}/${total}`;
  document.getElementById('timer-elapsed').textContent = `${Math.floor(_state.elapsedSessionTime / 60)} min`;

  _state.session.exercises.forEach((exItem, idx) => {
    const fill = document.getElementById(`timer-chunk-fill-${idx}`);
    if (!fill) return;
    const parent = fill.parentElement;
    
    if (idx < _state.exerciseIndex) {
      fill.style.width = '100%';
      parent.classList.remove('active');
      parent.classList.add('completed');
    } else if (idx === _state.exerciseIndex) {
      parent.classList.add('active');
      parent.classList.remove('completed');
      
      const totalSecs = ((exItem.duration || 1) + (exItem.rest || 0)) * (exItem.sets || 1) * 60;
      let passedSecs = 0;
      for (let s = 1; s < _state.currentSet; s++) {
        passedSecs += (exItem.duration || 1) * 60;
        passedSecs += (exItem.rest || 0) * 60;
      }
      if (_state.inRest) {
        passedSecs += (exItem.duration || 1) * 60;
        passedSecs += ((exItem.rest || 0) * 60 - _state.secondsLeft);
      } else {
        passedSecs += ((exItem.duration || 1) * 60 - _state.secondsLeft);
      }
      const pct = (passedSecs / totalSecs) * 100;
      fill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    } else {
      fill.style.width = '0%';
      parent.classList.remove('active', 'completed');
    }
  });

  // Play button icon
  const playBtn = document.getElementById('timer-play');
  if (_state.running && !_state.paused) {
    playBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
  } else {
    playBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  }
}

// ─── Timer Logic ───────────────────────────────────────────────────────────────

function tick() {
  if (!_state.running || _state.paused) return;

  _state.secondsLeft--;
  _state.elapsedSessionTime++;

  if (_state.secondsLeft <= 3 && _state.secondsLeft > 0) {
    beep(600, 100);
  }

  if (_state.secondsLeft <= 0) {
    const ex = _state.session.exercises[_state.exerciseIndex];

    if (_state.inRest) {
      // Rest finished → next set or next exercise
      _state.inRest = false;
      _state.currentSet++;

      if (_state.currentSet > (ex.sets || 1)) {
        // Move to next exercise
        beepTransition();
        _state.exerciseIndex++;
        _state.currentSet = 1;

        if (_state.exerciseIndex >= _state.session.exercises.length) {
          // Session complete!
          completeSession();
          return;
        }
      }

      const nextEx = _state.session.exercises[_state.exerciseIndex];
      _state.secondsLeft = (nextEx.duration || 1) * 60;
    } else {
      // Work finished
      if ((ex.rest || 0) > 0 && _state.currentSet < (ex.sets || 1)) {
        // Go to rest
        beep(400, 300);
        _state.inRest = true;
        _state.secondsLeft = (ex.rest || 1) * 60;
      } else {
        // No rest or last set → next set or exercise
        _state.currentSet++;

        if (_state.currentSet > (ex.sets || 1)) {
          beepTransition();
          _state.exerciseIndex++;
          _state.currentSet = 1;

          if (_state.exerciseIndex >= _state.session.exercises.length) {
            completeSession();
            return;
          }
        }

        const nextEx = _state.session.exercises[_state.exerciseIndex];
        _state.secondsLeft = (nextEx.duration || 1) * 60;
      }
    }
  }

  updateDisplay();
}

function completeSession() {
  _state.running = false;
  clearInterval(_interval);
  beep(1200, 500);

  document.getElementById('timer-ex-name').textContent = '🎉 Treino Completo!';
  document.getElementById('timer-ex-desc').textContent = `Duração total: ${Math.floor(_state.elapsedSessionTime / 60)} minutos`;
  document.getElementById('timer-time').textContent = '✓';
  document.getElementById('timer-time').style.fontSize = '64px';
  document.getElementById('timer-label').textContent = 'CONCLUÍDO';
  document.getElementById('timer-label').style.color = 'var(--acc)';
  document.getElementById('timer-label').style.color = 'var(--acc)';
  
  _state.session.exercises.forEach((_, idx) => {
    const fill = document.getElementById(`timer-chunk-fill-${idx}`);
    if (fill) {
      fill.style.width = '100%';
      fill.parentElement.classList.add('completed');
      fill.parentElement.classList.remove('active');
    }
  });

  if (_onComplete) _onComplete();
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function startTimer(session, onComplete) {
  if (!session || !session.exercises.length) return;

  const overlay = ensureOverlay();
  _onComplete = onComplete;

  _state = {
    running: true,
    paused: false,
    session,
    exerciseIndex: 0,
    secondsLeft: (session.exercises[0].duration || 1) * 60,
    totalSessionTime: 0,
    elapsedSessionTime: 0,
    inRest: false,
    currentSet: 1,
  };

  const timeline = document.getElementById('timer-timeline');
  timeline.innerHTML = '';
  const sessionTotal = session.exercises.reduce((acc, ex) => acc + ((ex.duration || 1) + (ex.rest || 0)) * (ex.sets || 1) * 60, 0) || 1;
  
  session.exercises.forEach((ex, idx) => {
    const chunkDur = ((ex.duration || 1) + (ex.rest || 0)) * (ex.sets || 1) * 60;
    const chunkPct = (chunkDur / sessionTotal) * 100;
    
    const chunk = document.createElement('div');
    chunk.className = 'timer-global-chunk';
    chunk.style.flex = chunkPct;
    chunk.title = ex.name;
    chunk.addEventListener('click', () => {
      _state.exerciseIndex = idx;
      _state.currentSet = 1;
      _state.inRest = false;
      _state.secondsLeft = (_state.session.exercises[idx].duration || 1) * 60;
      updateDisplay();
    });
    
    const fill = document.createElement('div');
    fill.className = 'timer-global-chunk-fill';
    fill.id = `timer-chunk-fill-${idx}`;
    chunk.appendChild(fill);
    timeline.appendChild(chunk);
  });

  document.getElementById('timer-time').style.fontSize = '';
  updateDisplay();
  overlay.classList.add('active');

  clearInterval(_interval);
  _interval = setInterval(tick, 1000);
}

function togglePlayPause() {
  if (!_state.running) {
    // Restart after complete
    if (_state.session) {
      startTimer(_state.session, _onComplete);
    }
    return;
  }
  _state.paused = !_state.paused;
  updateDisplay();
}

function stopTimer() {
  _state.running = false;
  _state.paused = false;
  clearInterval(_interval);
  _overlay?.classList.remove('active');
}

function nextExercise() {
  if (_state.exerciseIndex < _state.session.exercises.length - 1) {
    _state.exerciseIndex++;
    _state.currentSet = 1;
    _state.inRest = false;
    _state.secondsLeft = (_state.session.exercises[_state.exerciseIndex].duration || 1) * 60;
    beepTransition();
    updateDisplay();
  }
}

function prevExercise() {
  if (_state.exerciseIndex > 0) {
    _state.exerciseIndex--;
    _state.currentSet = 1;
    _state.inRest = false;
    _state.secondsLeft = (_state.session.exercises[_state.exerciseIndex].duration || 1) * 60;
    updateDisplay();
  }
}

export function isTimerRunning() {
  return _state.running;
}
