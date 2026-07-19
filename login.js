(() => {
  const note = document.querySelector('#note'); let mode = 'signin', email = '';
  const configured = Boolean(window.FOCUS_SUPABASE_URL && window.FOCUS_SUPABASE_PUBLISHABLE_KEY);
  const returnTo = new URLSearchParams(location.search).get('return') || 'index.html';
  const safeReturn = returnTo.includes('://') ? 'index.html' : returnTo;
  const client = configured && window.supabase ? window.supabase.createClient(window.FOCUS_SUPABASE_URL, window.FOCUS_SUPABASE_PUBLISHABLE_KEY) : null;
  const byId = id => document.querySelector(`#${id}`);
  function setMode(next) { mode = next; document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mode)); document.querySelector('.signup-only').hidden = mode !== 'signup'; byId('heading').textContent = mode === 'signup' ? 'Create your account' : 'Welcome back'; byId('sub').textContent = 'We will send a one-time code to your email.'; resetCode(); }
  function resetCode() { email = ''; byId('email-field').classList.remove('hidden'); byId('code-field').classList.add('hidden'); byId('change-email').classList.add('hidden'); byId('email-action').textContent = 'Email me a code'; note.textContent = ''; }
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  byId('guest').onclick = () => { localStorage.setItem('focusGuestMode', '1'); location.assign(safeReturn); };
  byId('change-email').onclick = resetCode;
  byId('email-action').onclick = async () => {
    if (!client) { note.textContent = 'Supabase is not configured yet. Add its URL and publishable key first.'; return; }
    if (!email) {
      email = byId('email').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { note.textContent = 'Enter a valid email address.'; return; }
      const name = byId('name').value.trim(); byId('email-action').disabled = true; byId('email-action').textContent = 'Sending code…';
      const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: name ? { display_name: name } : {} } });
      byId('email-action').disabled = false;
      if (error) { note.textContent = error.message; byId('email-action').textContent = 'Email me a code'; return; }
      byId('email-field').classList.add('hidden'); byId('code-field').classList.remove('hidden'); byId('change-email').classList.remove('hidden'); byId('email-action').textContent = 'Verify and continue'; byId('code').focus(); note.textContent = `A one-time code was sent to ${email}.`;
      return;
    }
    const token = byId('code').value.trim(); if (token.length < 6) { note.textContent = 'Enter the one-time code from your email.'; return; }
    byId('email-action').disabled = true; byId('email-action').textContent = 'Verifying…';
    const { error } = await client.auth.verifyOtp({ email, token, type: 'email' });
    if (error) { note.textContent = error.message; byId('email-action').disabled = false; byId('email-action').textContent = 'Verify and continue'; return; }
    location.assign(safeReturn);
  };
  (async () => { if (client) { const { data:{session} } = await client.auth.getSession(); if (session) location.replace(safeReturn); } })();
})();
