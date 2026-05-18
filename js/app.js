// ══════════════════════════════════════════════════
// js/app.js  — v2
// Global navigation, sidebar toggle, toast
// ══════════════════════════════════════════════════

// ── View switching ────────────────────────────────
const navBtns = document.querySelectorAll('.nav-btn');
const views   = document.querySelectorAll('.view');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const viewId = btn.dataset.view + '-view';
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    // Trigger view-specific renders
    if (btn.dataset.view === 'dashboard') {
      const state = getTrackerState();
      dashYear  = state.currentYear;
      dashMonth = state.currentMonth;
      renderDashboard();
    }
    if (btn.dataset.view === 'heatmap') {
      hmYear  = getTrackerState().currentYear;
      hmMonth = getTrackerState().currentMonth;
      renderHeatmap();
    }

    closeSidebar();
  });
});

// ── Mobile sidebar ────────────────────────────────
const sidebar        = document.getElementById('sidebar');
const hamburger      = document.getElementById('hamburger');
const sidebarOverlay = document.getElementById('sidebar-overlay');

hamburger.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

function toggleSidebar() {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('show');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}

// ── Toast ─────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer = null;

function showToast(msg, duration = 2800) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
}
