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
