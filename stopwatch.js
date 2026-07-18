const STORAGE_KEY = 'persistentStopwatch';

// ---- DOM references (check existence) ----
const timerDisplay = document.getElementById('timerDisplay');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');

// ---- State ----
let elapsedMs = 0;
let startTime = null;        // Date.now() when running
let running = false;
let intervalId = null;

// ---- Format mm:ss.cs ----
function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function updateDisplay() {
  if (timerDisplay) timerDisplay.textContent = formatTime(elapsedMs);
}

function updateUI() {
  if (startPauseBtn) startPauseBtn.textContent = running ? 'Pause' : 'Start';
}

// ---- Save / Load state ----
function saveState() {
  const state = {
    running,
    elapsedMs,       // base elapsedMs (without the current run)
    startTime,       // when running = Date.now(); when paused = null
    timestamp: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved.timestamp !== 'number') return false;

    elapsedMs = saved.elapsedMs || 0;
    running = saved.running || false;
    startTime = saved.startTime || null;

    if (running && startTime) {
      // catch up time since last save
      const delta = Date.now() - startTime;
      elapsedMs += delta;
      startTime = Date.now(); // restart timing from now
    }
    return true;
  } catch (_) {
    return false;
  }
}

// ---- Core timer ----
function tick() {
  if (!running) return;
  const now = Date.now();
  elapsedMs = (savedBase || 0) + (now - startTime);   // correct approach
  // Actually simpler: use a single baseElapsed + compute from startTime
  // We'll re-implement below
}

// Let's rewrite more clearly:

let baseElapsed = 0;   // elapsedMs when last started

function saveState() {
  const state = {
    running,
    baseElapsed,
    startTime,        // Date.now() at last start
    timestamp: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved.timestamp !== 'number') return false;

    running = saved.running;
    baseElapsed = saved.baseElapsed || 0;
    startTime = saved.startTime || null;

    if (running && startTime) {
      const now = Date.now();
      baseElapsed += now - startTime;   // catch up
      startTime = now;                  // continue from now
    }
    return true;
  } catch (_) {
    return false;
  }
}

function tick() {
  if (!running) return;
  const now = Date.now();
  elapsedMs = baseElapsed + (now - startTime);
  updateDisplay();
}

function startTimer() {
  if (running) return;
  running = true;
  startTime = Date.now();
  intervalId = setInterval(tick, 50);  // update every 50ms
  updateUI();
  saveState();
}

function pauseTimer() {
  if (!running) return;
  running = false;
  baseElapsed += Date.now() - startTime;  // freeze the elapsed
  startTime = null;
  clearInterval(intervalId);
  updateUI();
  updateDisplay();
  saveState();
}

function resetTimer() {
  if (running) pauseTimer();
  baseElapsed = 0;
  elapsedMs = 0;
  startTime = null;
  updateDisplay();
  updateUI();
  saveState();
}

// ---- Event Listeners ----
if (startPauseBtn) {
  startPauseBtn.addEventListener('click', () => running ? pauseTimer() : startTimer());
}
if (resetBtn) {
  resetBtn.addEventListener('click', resetTimer);
}

// Save state when leaving the page
window.addEventListener('pagehide', saveState);
window.addEventListener('beforeunload', saveState);

// ---- Initialise ----
const stateLoaded = loadState();
if (stateLoaded && running) {
  // restart the interval
  intervalId = setInterval(tick, 50);
  updateUI();
} else {
  // fresh start
  elapsedMs = baseElapsed;
  updateDisplay();
  updateUI();
}
