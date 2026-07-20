(() => {
  const note = document.querySelector('#note');
  const button = document.querySelector('#login-button');
  const configured = Boolean(window.FOCUS_SUPABASE_URL && window.FOCUS_SUPABASE_PUBLISHABLE_KEY);
  const returnTo = new URLSearchParams(location.search).get('return') || 'index.html';
  const safeReturn = returnTo.includes('://') ? 'index.html' : returnTo;
  const client = configured && window.supabase ? window.supabase.createClient(window.FOCUS_SUPABASE_URL, window.FOCUS_SUPABASE_PUBLISHABLE_KEY) : null;
  document.querySelector('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) { note.textContent = 'Supabase is not configured yet. Add its URL and publishable key first.'; return; }
    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value;
    button.disabled = true; button.textContent = 'Signing in…'; note.textContent = '';
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) { note.textContent = error.message; button.disabled = false; button.textContent = 'Sign in'; return; }
    location.assign(safeReturn);
  });
  (async () => { if (client) { const { data:{session} } = await client.auth.getSession(); if (session) location.replace(safeReturn); } })();
})();
