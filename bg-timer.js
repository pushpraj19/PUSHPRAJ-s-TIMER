// bg-timer.js
(function() {
    'use strict';
    const STATE_KEY = 'focus_timer_state';
    const PENDING_KEY = 'focus_timer_pending';
    const SESSIONS_KEY = 'focus_sessions';

    function getState() {
        try { return JSON.parse(sessionStorage.getItem(STATE_KEY)); } catch(e) { return null; }
    }

    function setState(s) {
        if (s) sessionStorage.setItem(STATE_KEY, JSON.stringify(s));
        else sessionStorage.removeItem(STATE_KEY);
    }

    function getElapsed(s) {
        if (!s || !s.isRunning) return s ? s.accumulatedMs : 0;
        if (s.isPaused) return s.accumulatedMs;
        return s.accumulatedMs + (Date.now() - s.startTimestamp);
    }

    function formatTime(ms, showCs = false) {
        if (ms < 0) ms = 0;
        let totalSec = Math.floor(ms / 1000);
        let h = Math.floor(totalSec / 3600);
        let m = Math.floor((totalSec % 3600) / 60);
        let sec = totalSec % 60;
        let str = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
        if (showCs) {
            let cs = Math.floor((ms % 1000) / 10);
            str += `.${String(cs).padStart(2,'0')}`;
        }
        return str;
    }

    function processPending() {
        try {
            let p = localStorage.getItem(PENDING_KEY);
            if (p) {
                let data = JSON.parse(p);
                localStorage.removeItem(PENDING_KEY);
                if (!getState()) {
                    saveSession(data.ms, data.mode);
                    return true;
                }
            }
        } catch(e) {}
        return false;
    }

    function saveSession(ms, mode) {
        if (ms < 1000) return;
        try {
            let sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
            sessions.unshift({ id: Date.now(), ms: ms, mode: mode || 'stopwatch', date: new Date().toLocaleString() });
            if (sessions.length > 100) sessions.length = 100;
            localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
            window.dispatchEvent(new CustomEvent('sessionSaved'));
        } catch(e) {}
    }

    window.addEventListener('beforeunload', () => {
        let s = getState();
        if (s && s.isRunning) {
            localStorage.setItem(PENDING_KEY, JSON.stringify({ ms: getElapsed(s), mode: s.mode }));
        }
    });

    processPending();

    window.BgTimer = {
        getState, getElapsed, formatTime, 
        getSessions: () => { try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); } catch(e) { return []; } },
        start(mode, targetMs = 0) {
            setState({ isRunning: true, isPaused: false, mode, startTimestamp: Date.now(), accumulatedMs: 0, targetMs });
            window.dispatchEvent(new CustomEvent('bgTimerUpdate'));
        },
        pause() {
            let s = getState();
            if (s && s.isRunning && !s.isPaused) {
                s.accumulatedMs = getElapsed(s);
                s.isPaused = true;
                setState(s);
                window.dispatchEvent(new CustomEvent('bgTimerUpdate'));
            }
        },
        resume() {
            let s = getState();
            if (s && s.isRunning && s.isPaused) {
                s.startTimestamp = Date.now();
                s.isPaused = false;
                setState(s);
                window.dispatchEvent(new CustomEvent('bgTimerUpdate'));
            }
        },
        stop() {
            let s = getState();
            if (s) {
                saveSession(getElapsed(s), s.mode);
                setState(null);
                window.dispatchEvent(new CustomEvent('bgTimerUpdate'));
            }
        },
        reset() {
            setState(null);
            window.dispatchEvent(new CustomEvent('bgTimerUpdate'));
        },
        clearSessions() { localStorage.removeItem(SESSIONS_KEY); window.dispatchEvent(new CustomEvent('sessionSaved')); }
    };
})();
