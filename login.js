(() => {
  const note = document.querySelector('#note'); let mode = 'signin', pendingEmail = '';
  const configured = Boolean(window.FOCUS_SUPABASE_URL && window.FOCUS_SUPABASE_PUBLISHABLE_KEY);
  const returnTo = new URLSearchParams(location.search).get('return') || 'index.html';
  const safeReturn = returnTo.includes('://') ? 'index.html' : returnTo;
  const client = configured && window.supabase ? window.supabase.createClient(window.FOCUS_SUPABASE_URL, window.FOCUS_SUPABASE_PUBLISHABLE_KEY) : null;
  const byId = id => document.querySelector(`#${id}`);
  function resetConfirmation() { pendingEmail = ''; byId('email-field').classList.remove('hidden'); byId('password-field').classList.remove('hidden'); byId('code-field').classList.add('hidden'); byId('change-email').classList.add('hidden'); byId('email-action').textContent = mode === 'signup' ? 'Create account' : 'Sign in'; note.textContent = ''; }
  function setMode(next) { mode = next; document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mode)); document.querySelector('.signup-only').hidden = mode !== 'signup'; byId('heading').textContent = mode === 'signup' ? 'Create your account' : 'Welcome back'; byId('sub').textContent = mode === 'signup' ? 'Choose a password, then confirm your email once.' : 'Sign in with your email and password.'; resetConfirmation(); }
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  byId('guest').onclick = () => { localStorage.setItem('focusGuestMode', '1'); location.assign(safeReturn); };
  byId('change-email').onclick = () => setMode('signup');
  byId('email-action').onclick = async () => {
    if (!client) { note.textContent = 'Supabase is not configured yet. Add its URL and publishable key first.'; return; }
    if (pendingEmail) {
      const token = byId('code').value.trim(); if (token.length < 6) { note.textContent = 'Enter the confirmation code from your email.'; return; }
      byId('email-action').disabled = true; byId('email-action').textContent = 'Confirming…';
      const { error } = await client.auth.verifyOtp({ email: pendingEmail, token, type: 'signup' });
      if (error) { note.textContent = error.message; byId('email-action').disabled = false; byId('email-action').textContent = 'Confirm and continue'; return; }
      location.assign(safeReturn); return;
    }
    const email = byId('email').value.trim(), password = byId('password').value;
    if (!/^\S+@\S+\.\S+$/.test(email)) { note.textContent = 'Enter a valid email address.'; return; }
    if (password.length < 6) { note.textContent = 'Use a password with at least 6 characters.'; return; }
    byId('email-action').disabled = true;
    if (mode === 'signin') {
      byId('email-action').textContent = 'Signing in…'; const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) { note.textContent = error.message; byId('email-action').disabled = false; byId('email-action').textContent = 'Sign in'; return; }
      location.assign(safeReturn); return;
    }
    byId('email-action').textContent = 'Creating account…'; const name = byId('name').value.trim();
    const { data, error } = await client.auth.signUp({ email, password, options: { data: name ? { display_name: name } : {} } });
    byId('email-action').disabled = false;
    if (error) { note.textContent = error.message; byId('email-action').textContent = 'Create account'; return; }
    if (data.session) { location.assign(safeReturn); return; }
    pendingEmail = email; byId('email-field').classList.add('hidden'); byId('password-field').classList.add('hidden'); byId('code-field').classList.remove('hidden'); byId('change-email').classList.remove('hidden'); byId('email-action').textContent = 'Confirm and continue'; byId('code').focus(); note.textContent = `A confirmation code was sent to ${email}.`;
  };
  (async () => { if (client) { const { data:{session} } = await client.auth.getSession(); if (session) location.replace(safeReturn); } })();
})();
