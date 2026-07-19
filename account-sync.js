(() => {
  const GUEST_KEY = 'focusGuestMode';
  const SYNC_KEYS = ['todos', 'focusSessions', 'focusPresets', 'sceneState', 'bgScene', 'focusTimerState'];
  const configured = Boolean(window.FOCUS_SUPABASE_URL && window.FOCUS_SUPABASE_PUBLISHABLE_KEY);
  let client = null;
  let user = null;
  let lastSignature = '';

  const style = document.createElement('style');
  style.textContent = `
    #focus-account-button{position:fixed;right:16px;bottom:16px;z-index:9998;border:1px solid #ffffff66;border-radius:999px;padding:9px 13px;background:#101820d9;color:#fff;font:600 13px system-ui;cursor:pointer;backdrop-filter:blur(12px)}
    #focus-account-overlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:#071018b8;backdrop-filter:blur(10px);font-family:system-ui,sans-serif}
    #focus-account-card{width:min(100%,390px);padding:27px;border:1px solid #ffffff38;border-radius:20px;background:#101820;color:#fff;box-shadow:0 20px 60px #0008;text-align:center}
    #focus-account-card h2{margin:0 0 9px;font-size:24px}#focus-account-card p{margin:0 0 20px;color:#c7d4dd;line-height:1.5;font-size:14px}
    #focus-account-card input{width:100%;margin:6px 0;padding:12px;border:1px solid #ffffff33;border-radius:10px;background:#ffffff12;color:#fff;font:inherit}
    #focus-account-card button{width:100%;margin-top:9px;padding:12px;border:0;border-radius:10px;background:#76d5ff;color:#062030;font:700 14px system-ui;cursor:pointer}
    #focus-account-card button.secondary{background:#ffffff16;color:#fff}#focus-account-card button.link{background:none;color:#9fdcff;padding:6px}.focus-account-note{min-height:18px;margin-top:12px!important;color:#ffcf86!important}
  `;
  document.head.append(style);

  function getSnapshot() {
    const data = {};
    SYNC_KEYS.forEach(key => { const value = localStorage.getItem(key); if (value !== null) data[key] = value; });
    return data;
  }
  function signature() { return JSON.stringify(getSnapshot()); }
  function setSnapshot(data) { Object.entries(data || {}).forEach(([key, value]) => { if (SYNC_KEYS.includes(key) && typeof value === 'string') localStorage.setItem(key, value); }); }
  function mergeValues(local, remote) {
    if (!local) return remote; if (!remote) return local;
    try {
      const a = JSON.parse(local), b = JSON.parse(remote);
      if (Array.isArray(a) && Array.isArray(b)) {
        const seen = new Set();
        return JSON.stringify([...b, ...a].filter(item => {
          const id = item && typeof item === 'object' ? (item.id || item.createdAt || item.timestamp || JSON.stringify(item)) : JSON.stringify(item);
          if (seen.has(id)) return false; seen.add(id); return true;
        }));
      }
    } catch (_) {}
    return local;
  }
  async function syncNow() {
    if (!user || !navigator.onLine) return;
    const data = getSnapshot(); const next = JSON.stringify(data);
    if (next === lastSignature) return;
    const { error } = await client.from('focus_user_snapshots').upsert({ user_id: user.id, data, updated_at: new Date().toISOString() });
    if (!error) lastSignature = next;
  }
  async function loadAndMerge() {
    const local = getSnapshot();
    const { data, error } = await client.from('focus_user_snapshots').select('data').eq('user_id', user.id).maybeSingle();
    if (!error && data && data.data) {
      const merged = { ...data.data };
      SYNC_KEYS.forEach(key => { merged[key] = mergeValues(local[key], data.data[key]); });
      setSnapshot(merged);
    }
    lastSignature = '';
    await syncNow();
  }
  function removeOverlay() { document.querySelector('#focus-account-overlay')?.remove(); }
  function accountButton() {
    if (document.querySelector('#focus-account-button')) return;
    const button = document.createElement('button'); button.id = 'focus-account-button';
    button.textContent = user ? `Signed in: ${user.email}` : 'Account';
    button.onclick = () => showAccount(user ? 'signed-in' : 'choice'); document.body.append(button);
  }
  function showAccount(mode = 'choice') {
    removeOverlay();
    const overlay = document.createElement('div'); overlay.id = 'focus-account-overlay';
    const card = document.createElement('div'); card.id = 'focus-account-card'; overlay.append(card); document.body.append(overlay);
    const close = () => { removeOverlay(); accountButton(); };
    if (mode === 'signed-in') {
      card.innerHTML = `<h2>You are signed in</h2><p>${user.email}<br>Your changes sync when internet is available.</p><button class="secondary" id="focus-signout">Sign out and continue locally</button><button class="link" id="focus-close">Close</button>`;
      card.querySelector('#focus-signout').onclick = async () => { await client.auth.signOut(); user = null; localStorage.setItem(GUEST_KEY, '1'); close(); };
      card.querySelector('#focus-close').onclick = close; return;
    }
    if (mode === 'form') {
      card.innerHTML = `<h2>Sign in to sync</h2><p>Use the same account on all your devices.</p><input id="focus-email" type="email" placeholder="Email" autocomplete="email"><input id="focus-password" type="password" placeholder="Password" autocomplete="current-password"><button id="focus-login">Sign in</button><button class="secondary" id="focus-signup">Create account</button><button class="link" id="focus-back">Back</button><p class="focus-account-note" id="focus-note"></p>`;
      const note = card.querySelector('#focus-note');
      if (!configured) { note.textContent = 'Add Supabase details to supabase-config.js first.'; card.querySelector('#focus-login').disabled = card.querySelector('#focus-signup').disabled = true; }
      const credentials = () => ({ email: card.querySelector('#focus-email').value.trim(), password: card.querySelector('#focus-password').value });
      card.querySelector('#focus-login').onclick = async () => { const { error } = await client.auth.signInWithPassword(credentials()); note.textContent = error ? error.message : 'Signed in.'; };
      card.querySelector('#focus-signup').onclick = async () => { const { error } = await client.auth.signUp(credentials()); note.textContent = error ? error.message : 'Check your email to confirm your account.'; };
      card.querySelector('#focus-back').onclick = () => showAccount('choice'); return;
    }
    card.innerHTML = `<h2>Welcome to FOCUS</h2><p>Use it privately on this device, or sign in to keep your data synced across devices.</p><button id="focus-guest">Continue without an account</button><button class="secondary" id="focus-account">Sign in or create account</button>`;
    card.querySelector('#focus-guest').onclick = () => { localStorage.setItem(GUEST_KEY, '1'); close(); };
    card.querySelector('#focus-account').onclick = () => showAccount('form');
  }
  async function start() {
    if (!configured || !window.supabase) { if (!localStorage.getItem(GUEST_KEY)) showAccount(); accountButton(); return; }
    client = window.supabase.createClient(window.FOCUS_SUPABASE_URL, window.FOCUS_SUPABASE_PUBLISHABLE_KEY);
    const { data: { session } } = await client.auth.getSession(); user = session?.user || null;
    client.auth.onAuthStateChange(async (_event, session) => { user = session?.user || null; if (user) { removeOverlay(); await loadAndMerge(); } accountButton(); });
    if (user) await loadAndMerge(); else if (!localStorage.getItem(GUEST_KEY)) showAccount();
    accountButton(); setInterval(syncNow, 5000); window.addEventListener('online', syncNow);
  }
  start();
})();
