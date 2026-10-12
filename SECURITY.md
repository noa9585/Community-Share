# Security – Community Share

How the application is protected, organised by the eight topics of the course
security checklist, followed by the additional hardening that goes beyond it.

## Checklist

| # | Topic | Status | Where |
|---|-------|--------|-------|
| 1 | Secrets in code | No secrets in the repository. `.env*` is git-ignored; values come from environment variables. | `.env.example`, `lib/config.ts` |
| 2 | Input validation | Every Server Action and every query-string parameter is parsed with a Zod schema before use. The database repeats the important limits as `CHECK` constraints. | `lib/validation/schemas.ts`, `001_schema.sql` |
| 3 | SQL injection | No SQL is ever built from strings. Queries go through the Supabase query builder and parameterised functions; search terms are escaped for `LIKE`. | `lib/supabase/repository.ts` |
| 4 | Authentication on protected routes | Three layers: the proxy guards every route, each page re-checks the user next to its data, and each action calls `requireApprovedUser()` / `requireAdminUser()`. | `proxy.ts`, `lib/auth/session.ts` |
| 5 | Sensitive data in the browser | The service-role key is only read inside a `server-only` module. The browser never talks to Supabase directly – there is no browser client at all. | `lib/supabase/admin.ts` |
| 6 | Rate limiting | Login, registration, password reset, search and all mutations are limited. Counters live in Postgres (serverless instances share no memory) and keys are hashed. | `lib/security/rate-limit.ts` |
| 7 | CORS | No cross-origin API is exposed and no `Access-Control-Allow-Origin` header is sent. Server Actions accept same-origin requests only (enforced by Next.js). | – |
| 8 | Row Level Security | RLS is enabled on every table. Clients have `SELECT` only; anonymous visitors have no access at all. | `002_rls_policies.sql` |

## Database model: default deny

- **No write policies exist.** `INSERT`/`UPDATE`/`DELETE` are revoked from the
  `authenticated` role on every table. All writes go through functions in
  `003_functions.sql`, each of which takes the caller from `auth.uid()` (never from a
  parameter) and re-checks approval status, ownership and business rules.
- **Functions are locked down**: `SECURITY DEFINER` with an empty `search_path` and
  schema-qualified names; `EXECUTE` is revoked from `PUBLIC`/`anon` and granted back
  one by one.
- **Privilege escalation is not expressible**: no function lets a user change their
  own `role`, `status` or `email`. Sign-up metadata is sanitised by the trigger and
  never decides role or status.
- **Blocking is immediate**: policies and functions read the user's status live, so a
  blocked account loses access even while its session token is still valid.
- **Races**: approving a request locks the item row, so two approvals cannot both
  pass the availability check.
- **Privacy**: other members' e-mail addresses are never readable. A view exposes
  name and area only; the two parties of a request get each other's address through
  a dedicated function. The occupancy calendar returns dates and quantities, not who.
- **Audit**: admin approvals and blocks are written to `admin_audit_log`.

## Files

- The storage bucket is **private**; images are served through signed URLs that
  expire after an hour.
- Uploads are resized and re-encoded in the browser (which also strips GPS metadata),
  then the server identifies the type from the file's **magic bytes** – the browser's
  MIME type and file name are ignored – and enforces count and size limits.
- Storage policies allow writing only under `<own user id>/<own item id>/`.

## Browser hardening

- **Content-Security-Policy with a per-request nonce** and `strict-dynamic`: no
  inline or third-party script can run. `frame-ancestors 'none'`, `form-action 'self'`,
  `object-src 'none'`, `base-uri 'self'`.
- `Strict-Transport-Security` (2 years, preload), `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
  `Cross-Origin-Opener-Policy`; `X-Powered-By` removed.
- Session cookies are `HttpOnly` and managed by `@supabase/ssr`. The session is
  verified with the auth server on every request (`getUser()`), not just decoded.
- Pages are rendered per request and sent with `Cache-Control: private, no-store`.
- The site asks search engines not to index it.

## Authentication behaviour

- Passwords: 10–72 characters with a letter and a digit; hashing is done by Supabase Auth.
- Login, registration and password reset give the same answer whether or not an
  address is registered (no account enumeration).
- Redirect targets (`next`) are reduced to same-site paths (no open redirect).
- Changing a password signs out every other session.
- Errors shown to users are fixed, translated messages; database and provider
  errors are only logged on the server.

## Settings to verify in the Supabase dashboard

These are configuration, not code, so they cannot be enforced from this repository:

1. Authentication → URL Configuration: Site URL and `{SITE_URL}/auth/callback` redirect.
2. Authentication → Sign In / Providers → Email: keep **Confirm email** enabled.
3. Authentication → Attack Protection: enable leaked-password protection and CAPTCHA
   if the plan allows it.
4. Never share or commit the service-role key or the database password.

## Known limits

- Demo mode (`USE_MOCK_DATA=true`) has no real authentication: anyone can sign in as
  any demo user. It contains sample data only and must not be used for a real community.
- Rate limiting is per account, e-mail and client address. Volumetric (DDoS)
  protection is left to the hosting platform.
- `style-src` allows inline style attributes (used for a few computed sizes). Styles
  cannot execute code; script execution stays nonce-only.
