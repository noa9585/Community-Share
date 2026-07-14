# Community Share

פלטפורמה קהילתית סגורה לניהול השאלת ציוד – Next.js + Supabase + Vercel.

## Demo Mode (local development)

1. Copy `.env.example` to `.env.local` (or use the included defaults)
2. Ensure `USE_MOCK_DATA=true`
3. `npm install && npm run dev`
4. Open `/login` and pick a demo user:
   - **אדמין** – full admin panel access
   - **משתמש רגיל** – catalog, loans, items
   - **ממתין לאישור** – pending approval screen only

## Supabase Mode (production / later)

1. Set `USE_MOCK_DATA=false` in `.env.local`
2. Add Supabase URL and keys
3. Run SQL migrations from `supabase/migrations/` (001 → 004)
4. Configure Auth redirect: `{SITE_URL}/auth/callback`
5. Promote first admin:

```sql
UPDATE public.users SET role = 'admin', status = 'approved' WHERE email = 'your@email.com';
```

## Architecture

- **Repository layer** – [`lib/data/repository.ts`](lib/data/repository.ts) abstracts data access
- **Mock** – [`lib/mock/`](lib/mock/) in-memory store for demo
- **Supabase** – [`lib/supabase/`](lib/supabase/) for production (implement repository when switching)

## Security

See [`SECURITY.md`](SECURITY.md) for production security checklist (RLS, validation, secrets).
