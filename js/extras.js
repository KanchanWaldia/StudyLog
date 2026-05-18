// ══════════════════════════════════════════════════
// js/extras.js
// Dark mode, motivational quotes, keyboard shortcuts
// ══════════════════════════════════════════════════

// ── MOTIVATIONAL QUOTES ───────────────────────────
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "The mind is not a vessel to be filled but a fire to be kindled.", author: "Plutarch" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
];

function loadDailyQuote() {
  const quoteTextEl   = document.getElementById('quote-text');
  const quoteAuthorEl = document.getElementById('quote-author');
  if (!quoteTextEl) return;
  // Use day-of-year to pick a consistent quote per day
  const now       = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const quote     = QUOTES[dayOfYear % QUOTES.length];
  quoteTextEl.textContent   = `"${quote.text}"`;
  if (quoteAuthorEl) quoteAuthorEl.textContent = `— ${quote.author}`;
}

// ── DARK MODE ─────────────────────────────────────
const html          = document.documentElement;
const darkToggle    = document.getElementById('dark-toggle');
const darkToggleMob = document.getElementById('dark-toggle-mobile');

function setTheme(dark) {
  html.setAttribute('data-theme', dark ? 'dark' : 'light');
  const icon = dark ? '☀️' : '🌙';
  if (darkToggle)    darkToggle.textContent    = icon;
  if (darkToggleMob) darkToggleMob.textContent = icon;
  localStorage.setItem('studylog-theme', dark ? 'dark' : 'light');
}

function toggleDark() {
  setTheme(html.getAttribute('data-theme') !== 'dark');
}

if (darkToggle)    darkToggle.addEventListener('click',    toggleDark);
if (darkToggleMob) darkToggleMob.addEventListener('click', toggleDark);

// Load saved theme on startup
const savedTheme = localStorage.getItem('studylog-theme');
if (savedTheme) setTheme(savedTheme === 'dark');

// ── KEYBOARD SHORTCUTS ────────────────────────────
document.addEventListener('keydown', e => {
  // Don't fire if user is typing in an input/textarea
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  switch (e.key.toLowerCase()) {
    case 't':
      // Jump to today in tracker
      if (typeof jumpToToday === 'function') {
        jumpToToday();
        // Switch to tracker view
        activateView('tracker');
        showToast('Jumped to today ✦');
      }
      break;

    case 'n':
      // Focus the new task input
      activateView('tracker');
      setTimeout(() => {
        const inp = document.getElementById('new-task-input');
        if (inp) inp.focus();
      }, 100);
      break;

    case 'p':
      // Go to Pomodoro
      activateView('pomodoro');
      break;

    case 'd':
      // Toggle dark mode
      toggleDark();
      break;

    case 'escape':
      // Close remarks panel
      const panel = document.getElementById('remarks-panel');
      if (panel && panel.style.display !== 'none') {
        panel.style.display = 'none';
      }
      break;
  }
});

// Helper to programmatically switch views
function activateView(viewName) {
  const navBtns = document.querySelectorAll('.nav-btn');
  const views   = document.querySelectorAll('.view');
  navBtns.forEach(b => { b.classList.toggle('active', b.dataset.view === viewName); });
  views.forEach(v   => { v.classList.toggle('active',   v.id === viewName + '-view'); });
  if (viewName === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
  if (viewName === 'heatmap'   && typeof renderHeatmap   === 'function') renderHeatmap();
}

// Load quote on page load
document.addEventListener('DOMContentLoaded', loadDailyQuote);
// Also call it immediately in case DOM is already ready
loadDailyQuote();
