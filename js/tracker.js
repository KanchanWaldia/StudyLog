// ══════════════════════════════════════════════════
// js/tracker.js  — v2
// Features: categories, undo delete, sparklines,
//           confetti on 100%, PDF export,
//           jump-to-today, goals
// ══════════════════════════════════════════════════

let currentUser  = null;
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let tasks        = [];      // [{id, name, category}]
let monthData    = {};      // { "2026-05": {cells:{}, remarks:{}} }
let activeRemark = null;
let saveTimer    = null;
let undoTimer    = null;
let undoStack    = null;    // {type, payload} for single-level undo

// ── DOM refs ──────────────────────────────────────
const monthLabel     = document.getElementById('month-label');
const prevMonthBtn   = document.getElementById('prev-month');
const nextMonthBtn   = document.getElementById('next-month');
const tableHead      = document.getElementById('table-head');
const tableBody      = document.getElementById('table-body');
const tableScroll    = document.getElementById('table-scroll');
const trackerLoading = document.getElementById('tracker-loading');
const trackerEmpty   = document.getElementById('tracker-empty');
const newTaskInput   = document.getElementById('new-task-input');
const addTaskBtn     = document.getElementById('add-task-btn');
const taskCategory   = document.getElementById('task-category');
const remarksPanel   = document.getElementById('remarks-panel');
const remarksDLabel  = document.getElementById('remarks-date-label');
const remarksTA      = document.getElementById('remarks-textarea');
const remarksCount   = document.getElementById('remarks-char-count');
const saveRemarkBtn  = document.getElementById('save-remarks-btn');
const remarksClose   = document.getElementById('remarks-close');
const exportPdfBtn   = document.getElementById('export-pdf-btn');
const undoToast      = document.getElementById('undo-toast');
const undoMsg        = document.getElementById('undo-msg');
const undoBtn        = document.getElementById('undo-btn');

// ── Helpers ───────────────────────────────────────
const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;

function updateMonthLabel() {
  const d = new Date(currentYear, currentMonth, 1);
  monthLabel.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function userDocRef()    { return db.collection('users').doc(currentUser.uid); }
function tasksDocRef()   { return userDocRef().collection('config').doc('tasks'); }
function monthDocRef(mk) { return userDocRef().collection('months').doc(mk); }
function getMD()         {
  const mk = monthKey(currentYear, currentMonth);
  if (!monthData[mk]) monthData[mk] = { cells: {}, remarks: {} };
  return monthData[mk];
}
const escapeHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── Month nav ─────────────────────────────────────
prevMonthBtn.addEventListener('click', () => {
  currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  loadMonth();
});
nextMonthBtn.addEventListener('click', () => {
  currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  loadMonth();
});

// ── Init ──────────────────────────────────────────
async function initTracker(user) {
  currentUser  = user;
  currentYear  = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  await loadTasks();
  await loadMonth();
}

async function loadTasks() {
  try {
    const snap = await tasksDocRef().get();
    tasks = snap.exists ? (snap.data().list || []) : [];
    // Migrate old tasks without category
    tasks = tasks.map(t => ({ category: 'default', ...t }));
  } catch (e) { tasks = []; }
}

async function saveTasks() { await tasksDocRef().set({ list: tasks }); }

async function loadMonth() {
  updateMonthLabel();
  showLoading();
  const mk = monthKey(currentYear, currentMonth);
  try {
    const snap = await monthDocRef(mk).get();
    monthData[mk] = snap.exists ? snap.data() : { cells: {}, remarks: {} };
    if (!monthData[mk].cells)   monthData[mk].cells   = {};
    if (!monthData[mk].remarks) monthData[mk].remarks = {};
  } catch (e) { monthData[mk] = { cells: {}, remarks: {} }; }
  renderTable();
  syncPomoTaskList();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderHeatmap   === 'function') renderHeatmap();
}

function scheduleMonthSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveMonthData, 800);
}

async function saveMonthData() {
  const mk = monthKey(currentYear, currentMonth);
  try { await monthDocRef(mk).set(getMD()); }
  catch (e) { showToast('⚠ Save failed. Check connection.'); }
}

// ── Add task ──────────────────────────────────────
addTaskBtn.addEventListener('click', addTask);
newTaskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

async function addTask() {
  const name = newTaskInput.value.trim();
  if (!name) { newTaskInput.focus(); return; }
  if (tasks.length >= 12) { showToast('Max 12 tasks allowed.'); return; }
  const cat = taskCategory.value;
  tasks.push({ id: Date.now().toString(), name, category: cat });
  newTaskInput.value = '';
  taskCategory.value = 'default';
  await saveTasks();
  renderTable();
  syncPomoTaskList();
  showToast('Task added! ✦');
}

// ── Delete task with undo ─────────────────────────
async function deleteTask(taskId) {
  const deleted    = tasks.find(t => t.id === taskId);
  const deletedIdx = tasks.findIndex(t => t.id === taskId);

  // Snapshot cells for this task across all months
  const cellSnapshot = {};
  Object.entries(monthData).forEach(([mk, md]) => {
    cellSnapshot[mk] = {};
    if (md.cells) {
      Object.entries(md.cells).forEach(([dk, dayCell]) => {
        if (dayCell && dayCell[taskId] !== undefined)
          cellSnapshot[mk][dk] = dayCell[taskId];
      });
    }
  });

  // Remove
  tasks = tasks.filter(t => t.id !== taskId);
  Object.values(monthData).forEach(md => {
    if (md.cells) Object.keys(md.cells).forEach(dk => { if (md.cells[dk]) delete md.cells[dk][taskId]; });
  });

  await saveTasks();
  await saveMonthData();
  renderTable();
  syncPomoTaskList();

  // Push undo stack
  undoStack = { type: 'deleteTask', payload: { task: deleted, index: deletedIdx, cellSnapshot } };
  showUndoToast(`Deleted "${deleted.name}"`, async () => {
    tasks.splice(undoStack.payload.index, 0, undoStack.payload.task);
    Object.entries(undoStack.payload.cellSnapshot).forEach(([mk, dayMap]) => {
      if (!monthData[mk]) monthData[mk] = { cells: {}, remarks: {} };
      Object.entries(dayMap).forEach(([dk, val]) => {
        if (!monthData[mk].cells[dk]) monthData[mk].cells[dk] = {};
        monthData[mk].cells[dk][undoStack.payload.task.id] = val;
      });
    });
    await saveTasks();
    await saveMonthData();
    renderTable();
    syncPomoTaskList();
    showToast('Task restored ✦');
  });
}

// ── Undo toast ────────────────────────────────────
function showUndoToast(msg, onUndo) {
  undoMsg.textContent = msg;
  undoToast.style.display = 'flex';
  clearTimeout(undoTimer);
  undoBtn.onclick = async () => {
    clearTimeout(undoTimer);
    undoToast.style.display = 'none';
    await onUndo();
  };
  undoTimer = setTimeout(() => { undoToast.style.display = 'none'; }, 6000);
}

// ── Render table ──────────────────────────────────
function renderTable() {
  if (tasks.length === 0) {
    trackerLoading.style.display = 'none';
    tableScroll.style.display    = 'none';
    trackerEmpty.style.display   = 'flex';
    remarksPanel.style.display   = 'none';
    return;
  }
  trackerLoading.style.display = 'none';
  trackerEmpty.style.display   = 'none';
  tableScroll.style.display    = 'block';

  const md          = getMD();
  const today       = new Date();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // thead
  let headHTML = '<tr><th class="date-col">Date</th>';
  tasks.forEach(t => {
    const catClass = t.category !== 'default' ? `th-${t.category}` : '';
    headHTML += `<th class="${catClass}">
      <div class="task-head">
        <span class="task-head-label" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>
        <button class="delete-task-btn" data-id="${t.id}" title="Delete task">✕</button>
      </div>
    </th>`;
  });
  headHTML += '<th>Daily %</th></tr>';
  tableHead.innerHTML = headHTML;
  tableHead.querySelectorAll('.delete-task-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.id));
  });

  // tbody
  let bodyHTML = '';
  let todayRowIdx = -1;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj  = new Date(currentYear, currentMonth, day);
    const dateKey  = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dayName  = dayNames[dateObj.getDay()];
    const isToday  = dateObj.toDateString() === today.toDateString();
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    if (isToday) todayRowIdx = day - 1;

    const cellsForDay = (md.cells && md.cells[dateKey]) || {};
    const checked     = tasks.filter(t => cellsForDay[t.id]).length;
    const pct         = tasks.length > 0 ? Math.round((checked / tasks.length) * 100) : 0;
    const hasRemark   = md.remarks && md.remarks[dateKey] && md.remarks[dateKey].trim();

    bodyHTML += `<tr class="${isToday ? 'today-row' : ''}" data-date="${dateKey}" data-day="${day}">
      <td class="date-cell ${isToday ? 'date-today' : ''}">
        <span class="date-num">${day}</span>
        <span class="date-day" style="${isWeekend ? 'color:var(--rose)' : ''}">${dayName}</span>
        <button class="remarks-btn ${hasRemark ? 'has-remark' : ''}" data-date="${dateKey}" data-day="${day}" title="Add note">${hasRemark ? '📝' : '✎'}</button>
        <span class="day-progress" title="${pct}% done"><span class="day-progress-fill" style="width:${pct}%"></span></span>
      </td>`;

    tasks.forEach(t => {
      const isChecked = cellsForDay[t.id] === true;
      bodyHTML += `<td><input type="checkbox" class="task-checkbox" data-date="${dateKey}" data-task="${t.id}" data-cat="${t.category}" ${isChecked ? 'checked' : ''} /></td>`;
    });

    bodyHTML += `<td class="pct-cell" data-pct="${pct}">${pct}%</td></tr>`;
  }
  tableBody.innerHTML = bodyHTML;

  // Sparkline footer
  let tfoot = tableBody.closest('table').tFoot;
  if (!tfoot) { tfoot = document.createElement('tfoot'); tableBody.closest('table').appendChild(tfoot); }
  let footHTML = '<tr class="sparkline-row"><td class="date-cell" style="font-size:0.73rem;color:var(--ink-light);padding-left:14px;">Monthly trend ↗</td>';
  tasks.forEach(t => { footHTML += `<td><canvas class="sparkline-canvas" data-task="${t.id}" width="80" height="28"></canvas></td>`; });
  footHTML += '<td><canvas class="sparkline-canvas sparkline-daily" width="80" height="28"></canvas></td></tr>';
  tfoot.innerHTML = footHTML;

  // Listeners
  tableBody.querySelectorAll('.task-checkbox').forEach(cb => cb.addEventListener('change', handleCheckbox));
  tableBody.querySelectorAll('.remarks-btn').forEach(btn => btn.addEventListener('click', () => openRemarks(btn.dataset.date, btn.dataset.day)));

  // Scroll to today
  requestAnimationFrame(() => {
    if (todayRowIdx >= 0) {
      const rows = tableBody.querySelectorAll('tr');
      if (rows[todayRowIdx]) rows[todayRowIdx].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    drawSparklines(md, daysInMonth);
  });
}

// ── Checkbox ──────────────────────────────────────
function handleCheckbox(e) {
  const cb = e.target;
  const dateKey = cb.dataset.date;
  const taskId  = cb.dataset.task;
  const md = getMD();
  if (!md.cells)          md.cells = {};
  if (!md.cells[dateKey]) md.cells[dateKey] = {};
  md.cells[dateKey][taskId] = cb.checked;

  updateRowPercent(cb.closest('tr'), dateKey);
  scheduleMonthSave();

  // Check if today hit 100%
  const today   = new Date().toISOString().slice(0, 10).replace(/-/g, '-');
  const todayKey= `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
  if (dateKey === todayKey) {
    const dayCell = md.cells[dateKey] || {};
    const done    = tasks.filter(t => dayCell[t.id]).length;
    if (done === tasks.length && tasks.length > 0) triggerConfetti();
  }

  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderHeatmap   === 'function') renderHeatmap();
}

function updateRowPercent(row, dateKey) {
  const md = getMD();
  const cellsForDay = (md.cells && md.cells[dateKey]) || {};
  const checked = tasks.filter(t => cellsForDay[t.id]).length;
  const pct = tasks.length > 0 ? Math.round((checked / tasks.length) * 100) : 0;
  const tds = row.querySelectorAll('td');
  const last = tds[tds.length - 1];
  last.textContent  = pct + '%';
  last.dataset.pct  = pct;
  const fill = row.querySelector('.day-progress-fill');
  if (fill) fill.style.width = pct + '%';
  // Redraw sparklines after state change
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  requestAnimationFrame(() => drawSparklines(md, daysInMonth));
}

// ── Remarks ───────────────────────────────────────
function openRemarks(dateKey, day) {
  const md    = getMD();
  const text  = (md.remarks && md.remarks[dateKey]) || '';
  const mons  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  activeRemark = dateKey;
  remarksDLabel.textContent = `Remarks for ${mons[currentMonth]} ${day}`;
  remarksTA.value = text;
  remarksCount.textContent = `${text.length} / 500`;
  remarksPanel.style.display = 'block';
  remarksTA.focus();
  remarksPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

remarksTA.addEventListener('input', () => { remarksCount.textContent = `${remarksTA.value.length} / 500`; });

saveRemarkBtn.addEventListener('click', async () => {
  if (!activeRemark) return;
  const md = getMD();
  if (!md.remarks) md.remarks = {};
  md.remarks[activeRemark] = remarksTA.value.trim();
  const btn = tableBody.querySelector(`.remarks-btn[data-date="${activeRemark}"]`);
  if (btn) { const has = !!md.remarks[activeRemark]; btn.classList.toggle('has-remark', has); btn.textContent = has ? '📝' : '✎'; }
  await saveMonthData();
  showToast('Remarks saved ✦');
});

remarksClose.addEventListener('click', () => { remarksPanel.style.display = 'none'; activeRemark = null; });

// ── Sparklines ────────────────────────────────────
function drawSparklines(md, daysInMonth) {
  const cells = md.cells || {};
  document.querySelectorAll('.sparkline-canvas:not(.sparkline-daily)').forEach(canvas => {
    const taskId = canvas.dataset.task;
    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dk = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      data.push((cells[dk] && cells[dk][taskId]) ? 1 : 0);
    }
    const task  = tasks.find(t => t.id === taskId);
    const color = catColor(task ? task.category : 'default');
    drawSpark(canvas, data, color, color.replace(')', ', 0.15)').replace('rgb', 'rgba'));
  });
  const dc = document.querySelector('.sparkline-daily');
  if (dc) {
    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dk = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const dayCell = cells[dk] || {};
      const checked = tasks.filter(t => dayCell[t.id]).length;
      data.push(tasks.length > 0 ? (checked / tasks.length) * 100 : 0);
    }
    drawSpark(dc, data, 'rgba(201,125,78,0.9)', 'rgba(201,125,78,0.15)');
  }
}

function catColor(cat) {
  const map = { study:'rgba(78,122,201,0.9)', health:'rgba(74,140,106,0.9)', personal:'rgba(155,106,201,0.9)', creative:'rgba(201,125,78,0.9)', fitness:'rgba(201,78,106,0.9)', default:'rgba(74,140,106,0.9)' };
  return map[cat] || map.default;
}

function drawSpark(canvas, data, lineColor, fillColor) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (data.every(v => v === 0)) {
    ctx.strokeStyle = 'rgba(180,168,154,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H - 2); ctx.lineTo(W, H - 2); ctx.stroke();
    return;
  }
  const max   = Math.max(...data, 1);
  const step  = W / (data.length - 1 || 1);
  const pts   = data.map((v, i) => ({ x: i * step, y: H - 3 - ((v / max) * (H - 6)) }));
  ctx.beginPath(); ctx.moveTo(pts[0].x, H);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, H);
  ctx.closePath(); ctx.fillStyle = fillColor; ctx.fill();
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i-1], curr = pts[i], cpx = (prev.x + curr.x) / 2;
    ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
  }
  ctx.strokeStyle = lineColor; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();
  const last = pts[pts.length - 1];
  ctx.beginPath(); ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = lineColor; ctx.fill();
}

// ── Confetti 🎉 ───────────────────────────────────
let confettiAnimFrame = null;
function triggerConfetti() {
  const canvas  = document.getElementById('confetti-canvas');
  const ctx     = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  showToast('🎉 Perfect day! All tasks done!');

  const pieces  = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    r: Math.random() * 6 + 3,
    d: Math.random() * 120,
    color: ['#c97d4e','#4e7ac9','#4a8c6a','#c94e6a','#c99a4e','#9b6ac9'][Math.floor(Math.random()*6)],
    tilt: Math.random() * 10 - 10,
    tiltAngle: 0, tiltIncrement: Math.random() * 0.07 + 0.05
  }));
  let angle = 0, tick = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    angle += 0.01;
    tick++;
    pieces.forEach((p, i) => {
      p.tiltAngle += p.tiltIncrement;
      p.y         += (Math.cos(angle + p.d) + 2.5) * 1.5;
      p.x         += Math.sin(angle) * 1.5;
      p.tilt       = Math.sin(p.tiltAngle) * 12;
      ctx.beginPath();
      ctx.lineWidth   = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();
      if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
    });
    if (tick < 200) confettiAnimFrame = requestAnimationFrame(draw);
    else { canvas.style.display = 'none'; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  cancelAnimationFrame(confettiAnimFrame);
  confettiAnimFrame = requestAnimationFrame(draw);
}

// ── PDF Export ────────────────────────────────────
exportPdfBtn.addEventListener('click', exportToPDF);

async function exportToPDF() {
  if (typeof window.jspdf === 'undefined') { showToast('PDF library loading, try again.'); return; }
  const { jsPDF } = window.jspdf;
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const md   = getMD();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const mons = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthName   = `${mons[currentMonth]} ${currentYear}`;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`StudyLog — ${monthName}`, 14, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`Exported on ${new Date().toLocaleDateString()}`, 14, 22);
  doc.setTextColor(0);

  if (tasks.length === 0) { doc.text('No tasks found for this month.', 14, 35); doc.save(`StudyLog-${monthKey(currentYear,currentMonth)}.pdf`); return; }

  // Build table data
  const head = [['Date', 'Day', ...tasks.map(t => t.name.substring(0, 12)), '%']];
  const body = [];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj  = new Date(currentYear, currentMonth, day);
    const dateKey  = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayCell  = (md.cells && md.cells[dateKey]) || {};
    const checked  = tasks.filter(t => dayCell[t.id]).length;
    const pct      = tasks.length > 0 ? Math.round((checked / tasks.length) * 100) : 0;
    const row      = [String(day), dayNames[dateObj.getDay()], ...tasks.map(t => dayCell[t.id] ? '✓' : ''), `${pct}%`];
    body.push(row);
  }

  doc.autoTable({
    head, body,
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2.5, halign: 'center' },
    headStyles: { fillColor: [28, 26, 23], textColor: [245, 240, 232], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    columnStyles: { 0: { halign: 'center', fontStyle: 'bold' }, 1: { halign: 'center' } },
    didDrawCell: (data) => {
      // Color ✓ cells green
      if (data.section === 'body' && data.cell.raw === '✓') {
        doc.setFillColor(74, 140, 106);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        doc.setTextColor(255);
        doc.setFontSize(8);
        doc.text('✓', data.cell.x + data.cell.width/2, data.cell.y + data.cell.height/2 + 1, { align: 'center' });
        doc.setTextColor(0);
      }
    }
  });

  // Remarks page
  const remarksEntries = Object.entries(md.remarks || {}).filter(([,v]) => v && v.trim());
  if (remarksEntries.length > 0) {
    doc.addPage();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(`Remarks — ${monthName}`, 14, 16);
    let y = 26;
    remarksEntries.forEach(([dateKey, text]) => {
      const day = parseInt(dateKey.split('-')[2]);
      const dateObj = new Date(currentYear, currentMonth, day);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text(`${day} ${dayNames[dateObj.getDay()]}`, 14, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80);
      const lines = doc.splitTextToSize(text, 260);
      doc.text(lines, 14, y + 5);
      doc.setTextColor(0);
      y += 12 + lines.length * 4;
      if (y > 185) { doc.addPage(); y = 16; }
    });
  }

  doc.save(`StudyLog-${monthKey(currentYear, currentMonth)}.pdf`);
  showToast('PDF downloaded! 📄');
}

// ── Jump to today (keyboard shortcut T) ──────────
function jumpToToday() {
  const today = new Date();
  currentYear  = today.getFullYear();
  currentMonth = today.getMonth();
  loadMonth().then(() => {
    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const row = tableBody.querySelector(`tr[data-date="${todayKey}"]`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// ── Sync task list to Pomodoro selector ──────────
function syncPomoTaskList() {
  const sel = document.getElementById('pomo-task-select');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">— select a task —</option>' + tasks.map(t => `<option value="${t.id}" ${t.id === cur ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('');
}

function showLoading() {
  trackerLoading.style.display = 'flex';
  tableScroll.style.display    = 'none';
  trackerEmpty.style.display   = 'none';
}

// ── Expose for other modules ──────────────────────
function getTrackerState() { return { tasks, monthData, currentYear, currentMonth, monthKey }; }
