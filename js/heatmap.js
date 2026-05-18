// ══════════════════════════════════════════════════
// js/heatmap.js
// GitHub-style heatmap with per-task filter
// ══════════════════════════════════════════════════

let hmYear  = new Date().getFullYear();
let hmMonth = new Date().getMonth();
let hmFilterTask = 'all'; // 'all' or task id

const hmMonthLabel = document.getElementById('hm-month-label');
const hmPrevBtn    = document.getElementById('hm-prev-month');
const hmNextBtn    = document.getElementById('hm-next-month');
const hmContainer  = document.getElementById('heatmap-container');
const hmTaskFilter = document.getElementById('heatmap-task-filter');

hmPrevBtn.addEventListener('click', () => {
  hmMonth--; if (hmMonth < 0) { hmMonth = 11; hmYear--; }
  renderHeatmap();
});
hmNextBtn.addEventListener('click', () => {
  hmMonth++; if (hmMonth > 11) { hmMonth = 0; hmYear++; }
  renderHeatmap();
});

function renderHeatmap() {
  const state = getTrackerState();
  // Sync to tracker month if first load
  if (hmYear === new Date().getFullYear() && hmMonth === new Date().getMonth()) {
    hmYear  = state.currentYear;
    hmMonth = state.currentMonth;
  }

  const mk = state.monthKey(hmYear, hmMonth);
  const md = state.monthData[mk] || { cells: {}, remarks: {} };
  const cells = md.cells || {};
  const tasks = state.tasks;
  const daysInMonth = new Date(hmYear, hmMonth + 1, 0).getDate();
  const today = new Date();

  // Update label
  const d = new Date(hmYear, hmMonth, 1);
  hmMonthLabel.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── Task filter buttons ─────────────────────────
  let filterHTML = `<button class="hm-filter-btn ${hmFilterTask === 'all' ? 'active' : ''}" data-task="all">All Tasks</button>`;
  tasks.forEach(t => {
    filterHTML += `<button class="hm-filter-btn ${hmFilterTask === t.id ? 'active' : ''}" data-task="${t.id}">${t.name}</button>`;
  });
  hmTaskFilter.innerHTML = filterHTML;
  hmTaskFilter.querySelectorAll('.hm-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      hmFilterTask = btn.dataset.task;
      renderHeatmap();
    });
  });

  // ── Compute per-day completion levels ───────────
  // level: 0=none, 1=1-25%, 2=26-50%, 3=51-75%, 4=76-100%
  const dayLevels = {};
  const dayPcts   = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey  = `${hmYear}-${String(hmMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayCell  = cells[dateKey] || {};

    let pct = 0;
    if (hmFilterTask === 'all') {
      const checked = tasks.filter(t => dayCell[t.id]).length;
      pct = tasks.length > 0 ? (checked / tasks.length) * 100 : 0;
    } else {
      pct = dayCell[hmFilterTask] ? 100 : 0;
    }

    dayPcts[day]   = Math.round(pct);
    dayLevels[day] = pct === 0 ? 0 : pct <= 25 ? 1 : pct <= 50 ? 2 : pct <= 75 ? 3 : 4;
  }

  // ── Build calendar grid (7 columns = days of week) ─
  const firstDay   = new Date(hmYear, hmMonth, 1).getDay(); // 0=Sun
  const dayNames   = ['S','M','T','W','T','F','S'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Day-of-week header
  let html = `<div style="margin-bottom:8px;">`;
  html += `<div style="display:flex;gap:5px;margin-left:0;">`;
  dayNames.forEach(dn => {
    html += `<div style="width:30px;text-align:center;font-size:0.68rem;color:var(--ink-light);font-weight:600;">${dn}</div>`;
  });
  html += '</div></div>';

  // Grid: fill leading empties, then days
  html += `<div style="display:flex;flex-wrap:wrap;gap:5px;max-width:${7*35}px;">`;
  // Leading empty cells
  for (let e = 0; e < firstDay; e++) {
    html += `<div class="hm-cell empty" style="width:30px;height:30px;"></div>`;
  }
  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj  = new Date(hmYear, hmMonth, day);
    const isToday  = dateObj.toDateString() === today.toDateString();
    const level    = dayLevels[day];
    const pct      = dayPcts[day];
    const tooltip  = `${monthNames[hmMonth]} ${day}: ${pct}%`;
    const taskName = hmFilterTask !== 'all' ? (tasks.find(t => t.id === hmFilterTask)?.name || '') : '';
    const tooltipFull = hmFilterTask !== 'all' ? `${monthNames[hmMonth]} ${day} — ${taskName}: ${pct === 100 ? 'Done ✓' : 'Not done'}` : `${monthNames[hmMonth]} ${day}: ${pct}%`;
    html += `<div class="hm-cell ${isToday ? 'today-cell' : ''}" data-level="${level}" data-tooltip="${tooltipFull}" data-day="${day}"></div>`;
  }
  html += '</div>';

  // Monthly summary below grid
  const totalDone = Object.values(dayLevels).filter(l => l > 0).length;
  const perfect   = Object.values(dayLevels).filter(l => l === 4).length;
  html += `<div style="margin-top:18px;display:flex;gap:16px;flex-wrap:wrap;">
    <div style="font-size:0.83rem;color:var(--ink-mid);"><strong style="color:var(--ink)">${totalDone}</strong> active days</div>
    <div style="font-size:0.83rem;color:var(--ink-mid);"><strong style="color:var(--green)">${perfect}</strong> perfect days (100%)</div>
    <div style="font-size:0.83rem;color:var(--ink-mid);">
      <strong style="color:var(--ink)">${computeStreakHeatmap(dayLevels, daysInMonth, today, hmYear, hmMonth)}</strong> day streak 🔥
    </div>
  </div>`;

  hmContainer.innerHTML = html;
}

function computeStreakHeatmap(dayLevels, daysInMonth, today, year, month) {
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;
  const lastDay     = isThisMonth ? today.getDate() : daysInMonth;
  let streak = 0;
  for (let d = lastDay; d >= 1; d--) {
    if (dayLevels[d] > 0) streak++;
    else break;
  }
  return streak;
}
