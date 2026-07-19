# FOCUS: guest mode and account sync

## Email OTP template

The app sends passwordless codes with `signInWithOtp({ email })` and verifies them with `verifyOtp({ email, token, type: 'email' })`. In Supabase **Authentication → Email Templates**, paste the contents of `supabase-email-otp-template.html` into both **Magic Link** and **Confirm signup**. The code must be written as `{{ .Token }}` — not `{}` and not `{{ Token }}`. This displays the OTP for the user to enter in the app instead of requiring a link click.

Visitors start on a dedicated, polished login page and can choose **Continue without an account** (fully local and offline) or sign in to sync across devices. The Profile page shows the user's name, email, focus totals, recent time history, sync status, and logout option.

## One-time Supabase setup

1. Create a Supabase project and enable Email authentication.
2. In its SQL Editor, run `supabase-schema.sql`.
3. Copy the Project URL and **publishable/anon** key into `supabase-config.js`.
4. In Supabase Authentication URL configuration, add your Vercel URL and `https://YOUR-VERCEL-DOMAIN/profile.html` as allowed redirect URLs.
5. To enable Google, go to Supabase **Authentication → Providers → Google**, enable it, and paste Google OAuth credentials from Google Cloud. Add the same `/profile.html` redirect URL in Google Cloud.
6. Deploy this folder to Vercel.

Never put a Supabase `service_role` or secret key in this project. The browser may only contain the publishable/anon key.

Users must be online for a first-ever sign in or account creation. After they have signed in once, their local data remains usable offline and syncs when a connection returns.
