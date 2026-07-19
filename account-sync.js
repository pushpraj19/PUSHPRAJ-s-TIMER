(() => {
  const SYNC_KEYS = ['todos', 'focusSessions', 'focusPresets', 'sceneState', 'bgScene', 'focusTimerState', 'focusDisplayName'];
  const configured = Boolean(window.FOCUS_SUPABASE_URL && window.FOCUS_SUPABASE_PUBLISHABLE_KEY); let client, user, lastSignature = '';
  const api = { get user() { return user; }, syncNow: () => syncNow(), signOut: () => signOut(), ready: null, configured }; window.FocusAccount = api;
  const snapshot = () => Object.fromEntries(SYNC_KEYS.map(key => [key, localStorage.getItem(key)]).filter(([, value]) => value !== null));
  const setSnapshot = data => Object.entries(data || {}).forEach(([key, value]) => { if (SYNC_KEYS.includes(key) && typeof value === 'string') localStorage.setItem(key, value); });
  function merge(local, remote) { try { const a = JSON.parse(local), b = JSON.parse(remote); if (Array.isArray(a) && Array.isArray(b)) { const seen = new Set(); return JSON.stringify([...b, ...a].filter(x => { const id = x && typeof x === 'object' ? (x.id || x.timestamp || JSON.stringify(x)) : JSON.stringify(x); if (seen.has(id)) return false; seen.add(id); return true; })); } } catch (_) {} return local || remote; }
  async function syncNow() { if (!user || !navigator.onLine) return; const data = snapshot(), next = JSON.stringify(data); if (next === lastSignature) return; const { error } = await client.from('focus_user_snapshots').upsert({ user_id: user.id, data, updated_at: new Date().toISOString() }); if (!error) lastSignature = next; }
  async function loadAndMerge() { if (!localStorage.getItem('focusDisplayName') && user.user_metadata?.display_name) localStorage.setItem('focusDisplayName', user.user_metadata.display_name); const local = snapshot(); const { data } = await client.from('focus_user_snapshots').select('data').eq('user_id', user.id).maybeSingle(); if (data?.data) { const joined = { ...data.data }; SYNC_KEYS.forEach(key => joined[key] = merge(local[key], data.data[key])); setSnapshot(joined); } lastSignature = ''; await syncNow(); }
  function accountButton() { document.querySelector('#focus-account-button')?.remove(); }
  async function signOut() { if (client) await client.auth.signOut(); user = null; location.assign('login.html'); }
  function loginRedirect() { const page = location.pathname.split('/').pop() || 'index.html'; location.replace(`login.html?return=${encodeURIComponent(page)}`); }
  async function finish(session) { user = session?.user || null; if (!user) { loginRedirect(); return; } await loadAndMerge(); accountButton(); window.dispatchEvent(new CustomEvent('focus-account-ready', { detail: { user } })); }
  async function start() { if (!configured || !window.supabase) { loginRedirect(); return; } client = window.supabase.createClient(window.FOCUS_SUPABASE_URL, window.FOCUS_SUPABASE_PUBLISHABLE_KEY); const { data:{session} } = await client.auth.getSession(); await finish(session); client.auth.onAuthStateChange((_event, nextSession) => setTimeout(() => finish(nextSession), 0)); setInterval(syncNow, 5000); window.addEventListener('online', syncNow); }
  api.ready = start();
})();
