// ══════════════════════════════════════════════════
// js/dashboard.js  — v2
// Stats + Chart.js charts, dark-mode aware
// ══════════════════════════════════════════════════

let dailyChartInstance  = null;
let weeklyChartInstance = null;
let taskChartInstance   = null;
let dashYear  = new Date().getFullYear();
let dashMonth = new Date().getMonth();

const dashMonthLabel = document.getElementById('dash-month-label');
const dashPrevBtn    = document.getElementById('dash-prev-month');
const dashNextBtn    = document.getElementById('dash-next-month');

dashPrevBtn.addEventListener('click', () => {
  dashMonth--; if (dashMonth < 0) { dashMonth = 11; dashYear--; }
  renderDashboard();
});
dashNextBtn.addEventListener('click', () => {
  dashMonth++; if (dashMonth > 11) { dashMonth = 0; dashYear++; }
  renderDashboard();
});

// ── Category color map ────────────────────────────
const CAT_COLORS = {
  default:  'rgba(74,140,106,0.8)',
  study:    'rgba(78,122,201,0.8)',
  health:   'rgba(74,140,106,0.8)',
  personal: 'rgba(155,106,201,0.8)',
  creative: 'rgba(201,125,78,0.8)',
  fitness:  'rgba(201,78,106,0.8)',
};

function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
function gridColor()  { return isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; }
function tickColor()  { return isDark() ? 'rgba(255,255,255,0.45)' : '#6b5e52'; }
function legendColor(){ return isDark() ? 'rgba(255,255,255,0.7)'  : '#2b2620'; }

// ── Main render ───────────────────────────────────
function renderDashboard() {
  const state = getTrackerState();
  const mk    = state.monthKey(dashYear, dashMonth);
  const md    = state.monthData[mk] || { cells: {}, remarks: {} };
  const tasks = state.tasks;
  const cells = md.cells || {};

  const d = new Date(dashYear, dashMonth, 1);
  dashMonthLabel.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(dashYear, dashMonth + 1, 0).getDate();
  const today       = new Date();
  const isThisMonth = dashYear === today.getFullYear() && dashMonth === today.getMonth();
  const daysCounted = isThisMonth ? today.getDate() : daysInMonth;

  // ── Per-day stats ─────────────────────────────
  const dayPcts   = [];
  let   totalDone = 0;
  let   bestDay   = null;
  let   bestPct   = -1;

  for (let day = 1; day <= daysInMonth; day++) {
    const dk      = `${dashYear}-${String(dashMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayCell = cells[dk] || {};
    const checked = tasks.filter(t => dayCell[t.id]).length;
    const pct     = tasks.length > 0 ? (checked / tasks.length) * 100 : 0;
    dayPcts.push(pct);
    totalDone += checked;
    if (pct > bestPct && checked > 0) { bestPct = pct; bestDay = day; }
  }

  const pastPcts = dayPcts.slice(0, daysCounted);
  const avgPct   = pastPcts.length > 0 ? Math.round(pastPcts.reduce((a,b)=>a+b,0)/pastPcts.length) : 0;

  // ── Streak ────────────────────────────────────
  let streak = 0;
  const startDay = isThisMonth ? today.getDate() - 1 : daysInMonth - 1;
  for (let i = startDay; i >= 0; i--) { if (dayPcts[i] >= 50) streak++; else break; }

  // ── Stat cards ────────────────────────────────
  document.getElementById('stat-total').textContent    = totalDone;
  document.getElementById('stat-streak').textContent   = streak;
  document.getElementById('stat-best-day').textContent = bestDay ? `Day ${bestDay}` : '—';
  document.getElementById('stat-avg').textContent      = avgPct + '%';

  // ── Chart 1: Daily bar ────────────────────────
  const dayLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const barColors = dayPcts.map(p =>
    p >= 80 ? 'rgba(74,140,106,0.85)' :
    p >= 50 ? 'rgba(201,154,78,0.85)' :
    p >   0 ? 'rgba(201,78,106,0.65)' :
              isDark() ? 'rgba(255,255,255,0.08)' : 'rgba(180,168,154,0.3)'
  );

  if (dailyChartInstance) dailyChartInstance.destroy();
  dailyChartInstance = new Chart(
    document.getElementById('daily-chart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [{
          label: 'Completion %',
          data:  dayPcts.map(p => Math.round(p)),
          backgroundColor: barColors,
          borderRadius: 5,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.raw}%` } }
        },
        scales: {
          y: { min: 0, max: 100,
            ticks: { callback: v => v + '%', font: { size: 11 }, color: tickColor() },
            grid:  { color: gridColor() }
          },
          x: { ticks: { font: { size: 10 }, color: tickColor() }, grid: { display: false } }
        }
      }
    }
  );

  // ── Chart 2: Weekly line ──────────────────────
  const weekTotals = [], weekLabels = [];
  for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
    const slice = dayPcts.slice(w*7, w*7+7);
    weekTotals.push(Math.round(slice.reduce((a,b)=>a+b,0)/slice.length));
    weekLabels.push(`Week ${w+1}`);
  }

  if (weeklyChartInstance) weeklyChartInstance.destroy();
  weeklyChartInstance = new Chart(
    document.getElementById('weekly-chart').getContext('2d'), {
      type: 'line',
      data: {
        labels: weekLabels,
        datasets: [{
          label: 'Avg %',
          data: weekTotals,
          borderColor: 'rgba(78,122,201,0.9)',
          backgroundColor: 'rgba(78,122,201,0.12)',
          fill: true, tension: 0.4,
          pointBackgroundColor: 'rgba(78,122,201,1)', pointRadius: 5,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100,
            ticks: { callback: v => v + '%', font: { size: 11 }, color: tickColor() },
            grid:  { color: gridColor() }
          },
          x: { ticks: { font: { size: 11 }, color: tickColor() }, grid: { display: false } }
        }
      }
    }
  );

  // ── Chart 3: Task-wise doughnut ───────────────
  const taskCompletions = tasks.map(t => {
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dk = `${dashYear}-${String(dashMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      if (cells[dk] && cells[dk][t.id]) count++;
    }
    return count;
  });

  const taskColors = tasks.map(t => CAT_COLORS[t.category] || CAT_COLORS.default);

  if (taskChartInstance) taskChartInstance.destroy();
  if (tasks.length > 0) {
    taskChartInstance = new Chart(
      document.getElementById('task-chart').getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: tasks.map(t => t.name),
          datasets: [{
            data: taskCompletions,
            backgroundColor: taskColors,
            borderWidth: 2,
            borderColor: isDark() ? '#1e1c18' : '#faf7f2',
          }]
        },
        options: {
          responsive: true,
          cutout: '60%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { size: 11, family: "'DM Sans', sans-serif" },
                padding: 10, boxWidth: 12, boxHeight: 12,
                color: legendColor(),
              }
            },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} days` } }
          }
        }
      }
    );
  }
}
