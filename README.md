# Community Share

פלטפורמה קהילתית סגורה לניהול השאלת ציוד – Next.js + Supabase + Vercel.

## Demo mode (local development)

1. Copy `.env.example` to `.env.local`
2. Keep `USE_MOCK_DATA=true`
3. `npm install && npm run dev`
4. Open `/login` and pick a demo user (admin / regular member / pending approval)

Demo data lives in memory and resets whenever the server restarts.

## Supabase mode (production)

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations/` in order (001 → 004), e.g. in the SQL Editor.
3. Set the environment variables (see `.env.example`):
   - `USE_MOCK_DATA=false`
   - `NEXT_PUBLIC_SITE_URL` – the public origin of the site
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret, server only)
4. In Supabase → Authentication → URL Configuration:
   - **Site URL**: your site origin
   - **Redirect URLs**: `{SITE_URL}/auth/callback`
5. Register through the site, then promote the first admin once:

```sql
UPDATE public.users SET role = 'admin', status = 'approved' WHERE email = 'your@email.com';
```

After that, new members are approved from the admin panel.

## Architecture

- **`proxy.ts`** – runs before every request: refreshes the session, guards routes by
  account status and role, and sets a per-request Content-Security-Policy nonce.
- **Server Actions** (`lib/actions/`) – every mutation: checks the session, validates
  input with Zod, applies a rate limit, then calls the repository.
- **Repository** (`lib/data/repository.ts`) – one interface, two implementations:
  `lib/mock/` (in-memory demo) and `lib/supabase/` (production).
- **Database** (`supabase/migrations/`) – tables are read-only for clients and filtered
  by Row Level Security; every write is a `SECURITY DEFINER` function that re-checks
  who is calling.

## Security

See [`SECURITY.md`](SECURITY.md).
