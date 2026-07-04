# SignDoc - Progress Log
> RULE: Read latest entry before starting. Append when stopping. Never delete old entries.

## Session Log
**Earlier:** Scaffold, templates, envelopes, storage, create→send→sign cycle, signer refresh.

### 2026-07-03
- **Full cycle + refresh:** Verified e2e; status refresh fixed. Commits: `f82b088`, `0381d21`.
- **Notifications:** No email transport wired. Need provider creds.
- **Decline:** Added migration/API/UI. Browser verified: 200/403/400/409. Commit `21666d1`. Pushed.
- **Resend emails:** Wired with deterministic `/sign/[token]`. Build/lint passed. Blocked: no inbox for proof.
- **API auth:** `/login` + admin routes guarded. 401→200/201 verified. Commit `3d4d2c1`. Pushed.
- **Signup/hardening:** 6-char min, email retain, security headers. Verified. Commit `673703d`.
- **Rate limit:** 5/min/IP on login/signup/send. 429 verified on 6th attempt. Commit `044e30d`.
- **Owner scoping:** `created_by` filter + backfill. Two-account test passed. Commit `83b0aa4`. Pushed.

### 2026-07-04
- **Password reset:** Forgot-password UI + Supabase action. Commit `66aa58f`. Blocked: rate limit.
- **Copy link:** Clipboard gets exact token URL. Commit `657bb42`.
- **Loading states:** `loading.tsx` + spinner on all list/pages. Commit `7e967ab`.
- **Empty states:** `No envelopes/templates yet` copy verified. Commit `4f091ec`.
- **Cleanup:** Removed unused demo routes + logs; confirmed `SignatureCaptureModal` wiring. Consolidated 5 doc files into compact `PROJECT.md` (~175 lines); updated `.gitignore` for `.claude/`, `.cursor/`, `dev-server*.log`.