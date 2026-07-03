# SignDoc - Progress Log

> RULE FOR ALL AGENTS: Read the latest entry before starting work. Append a new entry when you stop, even if incomplete. Never delete old entries.

## Session Log

**Earlier history:** Initial scaffold, template editor, envelope tables, and storage setup are already in place; the repo history now also includes the full create -> send -> sign cycle and the signer status refresh fix.

### 2026-07-03 - Full cycle + signer refresh
**Done:** Full envelope cycle was confirmed end-to-end in browser; signer status refresh after submit was fixed and verified. Commits: `f82b088`, `0381d21`.
**Broken / blocked:** Notifications remain blocked on missing email transport creds.
**Next step:** Resume decline flow and notification work separately.

### 2026-07-03 - Notifications blocked
**Done:** Checked repo/env and confirmed there is no working email transport wired yet.
**Broken / blocked:** Still blocked on a concrete email provider + sender identity.
**Next step:** Provide creds when that task is resumed.

### 2026-07-03 - Decline flow partial
**Done:** Added `DECLINED` migration, signer decline API, signer decline UI, and dashboard activity reason display. `npm run build` passed; targeted lint on touched files passed.
**Broken / blocked:** Real browser verification did not finish because the REPL test script aborted with `FormData is not defined`. Commit/push not done yet.
**Next step:** Re-run browser verification with a different setup, capture actual status codes/UI, then commit and push.

### 2026-07-03 - Decline flow verified
**Done:** Verified in a real browser with `scripts/verify-decline-flow.mjs`. Results: current signer decline returned `200` and updated the envelope to `DECLINED` with the reason stored and shown in dashboard Activity; non-current signer decline returned `403`; empty reason returned `400`; completed-envelope decline returned `409`. Commit: `21666d1`.
**Done:** `cmd /c npm run build` passed; targeted lint on the touched decline-flow files passed; `git push` succeeded.

### 2026-07-03 - Email notifications partial
**Done:** Wired Resend-backed invitation emails at the actionable signer points in the envelope flow, using deterministic `/sign/[token]` links so the same signer URL can be recreated when a signer's turn arrives later in sequential signing. `cmd /c npm run build` passed; targeted lint on the touched email/workflow files passed.
**Broken / blocked:** Real inbox verification is blocked in this environment. I could not access a mailbox or external inbox UI from the available tools, so I could not prove delivery or click-through with live email evidence yet.
**Next step:** Resume once a reachable test inbox or email-capture surface is available, then verify send delivery and link open in a real browser before committing.

### 2026-07-03 - API auth guard verified
**Done:** Added Supabase-backed session login at `/login` and required a logged-in session for the admin envelope/template API routes under `src/app/api/v1/envelopes` and `src/app/api/v1/templates`. Browser verification results: unauthenticated `GET /api/v1/envelopes`, `GET /api/v1/templates`, `GET /api/v1/envelopes/00000000-0000-0000-0000-000000000000`, `POST /api/v1/envelopes/00000000-0000-0000-0000-000000000000/send`, and `GET /api/v1/templates/00000000-0000-0000-0000-000000000000` all returned `401`; after signing up and logging in through `/login`, `GET /api/v1/envelopes` returned `200`, `GET /api/v1/templates` returned `200`, and `POST /api/v1/envelopes` returned `201` for a one-signer draft envelope. Commit: `3d4d2c1`.
**Done:** `git push origin main` succeeded.

### 2026-07-03 - Signup and hardening verified
**Done:** Reduced signup password validation to a 6-character minimum with no complexity rules, kept the email field populated after invalid signup, and showed the inline password message. Added security headers in `next.config.ts` and hardened API validation/response handling. Browser/API verification: invalid signup returned `Password must be at least 6 characters.` and retained the email value; unauthenticated `GET /api/v1/envelopes` and `GET /api/v1/templates` returned `401`; the live response headers included `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, and `Strict-Transport-Security`; authenticated `GET /api/v1/envelopes` and `GET /api/v1/templates` returned `200`; invalid `POST /api/v1/envelopes` with a non-UUID template id returned `400`; valid `POST /api/v1/envelopes` returned `201`. Commit: `673703d`.

### 2026-07-03 - Rate limiting verified
**Done:** Added in-process fixed-window rate limiting for login, signup, and envelope-send with a 5/min/IP ceiling, plus a short project README. Verified in browser/API tests: login returned `429` on the 6th rapid submit, signup returned `429` on the 6th rapid submit, and `POST /api/v1/envelopes/11111111-1111-4111-8111-111111111111/send` returned `404` for attempts 1-5 then `429` on attempt 6 when sent from a fresh test IP. `cmd /c npm run build` passed; targeted lint on the touched files passed. Commit: `044e30d`.

### 2026-07-03 - Owner access verified
**Done:** Scoped envelope/template reads and writes to the authenticated owner, added a backfill migration for existing `created_by` rows, and wired the dashboard/API routes to pass the logged-in user id through. Browser verification with two accounts (`darsh.ojha@xtransmatrix.com` and `owner-b-1783096429@xtransmatrix.com`) showed owner filtering working: A saw only A-owned rows, B saw only B-owned rows, and direct cross-user access returned `404` for both `/envelopes/[id]`, `/templates/[id]/edit`, and the matching `/api/v1/*/[id]` routes. Code commit: `83b0aa4`.
**Done:** `cmd /c npm run build` passed and `git push origin main` succeeded for the code commit.

### 2026-07-04 - Password reset partial
**Done:** Added the login-page forgot-password UI, Supabase password-reset server action, and the recovery-mode password update form. The flow uses the current authenticated session token fallback so the recovery page can complete a password change once a recovery session exists. Code commit: `66aa58f`.
**Blocked:** Browser verification of the actual reset email send is currently blocked by Supabase returning `email rate limit exceeded` even for a fresh test account. I confirmed the UI submission path in-browser and recorded the actual provider error, but I could not verify a delivered recovery email or opened magic link in this environment.

### 2026-07-04 - Signing link copy verified
**Done:** Added the per-signer copy-link fallback on the envelope detail send result card. In-browser verification used the real send response payload and clipboard APIs: the returned URL was `http://localhost:3000/sign/uQqoICRwXhfu92PmM8jleysMmpNl4VnOrUimNs_lfoM`, and the browser clipboard contained the exact same string. Code commit: `657bb42`.

### 2026-07-04 - Loading states verified
**Done:** Added `loading.tsx` fallbacks for envelopes, templates, envelope detail, template edit, and sign pages, plus a shared spinner component. Browser checks against the new `aria-label="Loading"` spinner found the fallback on `/envelopes`, `/templates`, `/envelopes/[id]`, `/templates/[id]/edit`, and `/sign/[token]`. Code commit: `7e967ab`.

### 2026-07-04 - Empty states verified
**Done:** Updated the list empty states to the requested copy: `No envelopes yet - create your first one` and `No templates yet - create your first one`. A brand-new account with zero data saw those exact empty states on `/envelopes` and `/templates`. Code commit: `4f091ec`.
