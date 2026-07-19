(() => {
  const note = document.querySelector('#note'); let mode = 'signin', otpEmail = '';
  const configured = Boolean(window.FOCUS_SUPABASE_URL && window.FOCUS_SUPABASE_PUBLISHABLE_KEY);
  const returnTo = new URLSearchParams(location.search).get('return') || 'index.html';
  const safeReturn = returnTo.includes('://') ? 'index.html' : returnTo;
  const client = configured && window.supabase ? window.supabase.createClient(window.FOCUS_SUPABASE_URL, window.FOCUS_SUPABASE_PUBLISHABLE_KEY) : null;
  const byId = id => document.querySelector(`#${id}`);
  function resetOtp() { otpEmail = ''; byId('email-field').classList.remove('hidden'); byId('code-field').classList.add('hidden'); byId('change-email').classList.add('hidden'); byId('email-action').textContent = 'Send OTP'; note.textContent = ''; }
  function setMode(next) { mode = next; document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mode)); document.querySelector('.signup-only').hidden = mode !== 'signup'; byId('heading').textContent = mode === 'signup' ? 'Create your account' : 'Welcome back'; byId('sub').textContent = 'Enter your email and we will send a one-time code.'; resetOtp(); }
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  byId('guest').onclick = () => { localStorage.setItem('focusGuestMode', '1'); location.assign(safeReturn); };
  byId('change-email').onclick = resetOtp;
  byId('email-action').onclick = async () => {
    if (!client) { note.textContent = 'Supabase is not configured yet. Add its URL and publishable key first.'; return; }
    if (!otpEmail) {
      const email = byId('email').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { note.textContent = 'Enter a valid email address.'; return; }
      const name = byId('name').value.trim();
      byId('email-action').disabled = true; byId('email-action').textContent = 'Sending OTP…';
      const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: name ? { display_name: name } : {} } });
      byId('email-action').disabled = false;
      if (error) { note.textContent = error.message; byId('email-action').textContent = 'Send OTP'; return; }
      otpEmail = email; byId('email-field').classList.add('hidden'); byId('code-field').classList.remove('hidden'); byId('change-email').classList.remove('hidden'); byId('email-action').textContent = 'Verify OTP'; byId('code').focus(); note.textContent = `OTP sent to ${email}. Enter the code here.`; return;
    }
    const token = byId('code').value.trim();
    if (token.length < 6) { note.textContent = 'Enter the OTP from your email.'; return; }
    byId('email-action').disabled = true; byId('email-action').textContent = 'Verifying…';
    const { error } = await client.auth.verifyOtp({ email: otpEmail, token, type: 'email' });
    if (error) { note.textContent = error.message; byId('email-action').disabled = false; byId('email-action').textContent = 'Verify OTP'; return; }
    location.assign(safeReturn);
  };
  (async () => { if (client) { const { data:{session} } = await client.auth.getSession(); if (session) location.replace(safeReturn); } })();
})();
