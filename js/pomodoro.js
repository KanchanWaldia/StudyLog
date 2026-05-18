// ══════════════════════════════════════════════════
// js/pomodoro.js
// Pomodoro timer with ring animation, custom durations,
// session log, task linking, browser notifications
// ══════════════════════════════════════════════════

const CIRCUMFERENCE = 553; // 2πr where r=88

let pomoMode      = 'work';   // 'work' | 'short' | 'long'
let pomoRunning   = false;
let pomoInterval  = null;
let pomoTotalSecs = 25 * 60;
let pomoRemaining = 25 * 60;
let pomoSessions  = 0;        // completed focus sessions today
let pomoLog       = [];       // [{type, task, start, duration}]

// DOM
const pomoTime       = document.getElementById('pomo-time');
const pomoModeLabel  = document.getElementById('pomo-mode-label');
const pomoRingFill   = document.getElementById('pomo-ring-fill');
const pomoStart      = document.getElementById('pomo-start');
const pomoReset      = document.getElementById('pomo-reset');
const pomoSkip       = document.getElementById('pomo-skip');
const pomoTabs       = document.querySelectorAll('.pomo-tab');
const pomoSessionDots= document.getElementById('pomo-session-dots');
const pomoSessionCnt = document.getElementById('pomo-session-count');
const pomoLogList    = document.getElementById('pomo-log-list');
const pomoTaskSel    = document.getElementById('pomo-task-select');
const pomoWorkMin    = document.getElementById('pomo-work-min');
const pomoShortMin   = document.getElementById('pomo-short-min');
const pomoLongMin    = document.getElementById('pomo-long-min');

// Request notification permission
if ('Notification' in window) Notification.requestPermission();

// ── Mode durations ────────────────────────────────
function getDuration(mode) {
  if (mode === 'work')  return parseInt(pomoWorkMin.value  || 25) * 60;
  if (mode === 'short') return parseInt(pomoShortMin.value || 5)  * 60;
  if (mode === 'long')  return parseInt(pomoLongMin.value  || 15) * 60;
  return 25 * 60;
}

// ── Tab switching ─────────────────────────────────
pomoTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    if (pomoRunning) return; // don't switch while running
    pomoTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    pomoMode      = tab.dataset.mode;
    pomoTotalSecs = getDuration(pomoMode);
    pomoRemaining = pomoTotalSecs;
    updateDisplay();
    updateRing(1);
  });
});

// ── Start / Pause ─────────────────────────────────
pomoStart.addEventListener('click', () => {
  if (pomoRunning) {
    // Pause
    clearInterval(pomoInterval);
    pomoRunning         = false;
    pomoStart.textContent = '▶ Resume';
  } else {
    // Start
    pomoRunning           = true;
    pomoStart.textContent = '⏸ Pause';
    const startTime = Date.now();
    const taskName  = pomoTaskSel.options[pomoTaskSel.selectedIndex]?.text || '';
    pomoInterval = setInterval(() => {
      pomoRemaining--;
      updateDisplay();
      updateRing(pomoRemaining / pomoTotalSecs);
      if (pomoRemaining <= 0) {
        clearInterval(pomoInterval);
        pomoRunning           = false;
        pomoStart.textContent = '▶ Start';
        onTimerComplete(taskName, Math.round((Date.now() - startTime) / 60000));
      }
    }, 1000);
  }
});

// ── Reset ─────────────────────────────────────────
pomoReset.addEventListener('click', () => {
  clearInterval(pomoInterval);
  pomoRunning           = false;
  pomoStart.textContent = '▶ Start';
  pomoTotalSecs = getDuration(pomoMode);
  pomoRemaining = pomoTotalSecs;
  updateDisplay();
  updateRing(1);
});

// ── Skip ──────────────────────────────────────────
pomoSkip.addEventListener('click', () => {
  clearInterval(pomoInterval);
  pomoRunning           = false;
  pomoStart.textContent = '▶ Start';
  // Auto-advance mode
  if (pomoMode === 'work') {
    pomoSessions++;
    setMode(pomoSessions % 4 === 0 ? 'long' : 'short');
  } else {
    setMode('work');
  }
  updateSessionDots();
});

// ── Settings change resets timer ──────────────────
[pomoWorkMin, pomoShortMin, pomoLongMin].forEach(inp => {
  inp.addEventListener('change', () => {
    if (!pomoRunning) {
      pomoTotalSecs = getDuration(pomoMode);
      pomoRemaining = pomoTotalSecs;
      updateDisplay();
      updateRing(1);
    }
  });
});

// ── Complete ──────────────────────────────────────
function onTimerComplete(taskName, duration) {
  if (pomoMode === 'work') {
    pomoSessions++;
    playBeep();
    notify('🎯 Focus session complete!', taskName ? `Great work on "${taskName}"!` : 'Take a break!');
    // Log it
    pomoLog.unshift({ type: 'focus', task: taskName, time: new Date(), duration });
    renderPomoLog();
    updateSessionDots();
    // Auto switch to break
    setMode(pomoSessions % 4 === 0 ? 'long' : 'short');
    // Mark task as checked for today if linked
    if (pomoTaskSel.value) {
      autoCheckTodayTask(pomoTaskSel.value);
    }
  } else {
    playBeep();
    notify('☕ Break over!', 'Time to focus again.');
    pomoLog.unshift({ type: 'break', task: '', time: new Date(), duration });
    renderPomoLog();
    setMode('work');
  }
}

function setMode(mode) {
  pomoMode      = mode;
  pomoTotalSecs = getDuration(mode);
  pomoRemaining = pomoTotalSecs;
  updateDisplay();
  updateRing(1);
  // Update tab UI
  pomoTabs.forEach(t => { t.classList.toggle('active', t.dataset.mode === mode); });
  // Ring color for break
  pomoRingFill.classList.toggle('break-mode', mode !== 'work');
}

// ── Auto-check today's task ───────────────────────
function autoCheckTodayTask(taskId) {
  const today   = new Date();
  const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  // Find the checkbox in the table and trigger it
  const cb = document.querySelector(`.task-checkbox[data-date="${dateKey}"][data-task="${taskId}"]`);
  if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
}

// ── Display ───────────────────────────────────────
function updateDisplay() {
  const mins = Math.floor(pomoRemaining / 60);
  const secs = pomoRemaining % 60;
  pomoTime.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  document.title = pomoRunning ? `${pomoTime.textContent} — StudyLog` : 'StudyLog';
  const labels = { work: 'Focus', short: 'Short Break', long: 'Long Break' };
  pomoModeLabel.textContent = labels[pomoMode] || 'Focus';
}

function updateRing(fraction) {
  const offset = CIRCUMFERENCE * (1 - fraction);
  pomoRingFill.style.strokeDashoffset = offset;
}

function updateSessionDots() {
  const shown = Math.min(pomoSessions, 8);
  pomoSessionDots.innerHTML = Array.from({ length: shown }, () => '<span class="session-dot"></span>').join('') +
    Array.from({ length: Math.max(0, 4 - shown % 4) % 4 }, () => '<span class="session-dot empty"></span>').join('');
  pomoSessionCnt.textContent = `${pomoSessions} session${pomoSessions !== 1 ? 's' : ''} today`;
}

function renderPomoLog() {
  if (pomoLog.length === 0) {
    pomoLogList.innerHTML = '<p style="color:var(--ink-light);font-style:italic;font-size:0.85rem;">No sessions yet. Start focusing!</p>';
    return;
  }
  pomoLogList.innerHTML = pomoLog.map(entry => {
    const time = entry.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const label = entry.type === 'focus' ? '🎯 Focus' : '☕ Break';
    return `<div class="pomo-log-item">
      <span class="pomo-log-dot ${entry.type !== 'focus' ? 'break' : ''}"></span>
      <span class="pomo-log-task">${label}${entry.task ? ` — ${entry.task}` : ''}</span>
      <span class="pomo-log-time">${time}</span>
      <span class="pomo-log-dur">${entry.duration}min</span>
    </div>`;
  }).join('');
}

// ── Audio beep using Web Audio API ───────────────
function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {}
}

// ── Browser notification ──────────────────────────
function notify(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '✦' });
  }
}

// ── Init display ──────────────────────────────────
updateDisplay();
updateRing(1);
updateSessionDots();
