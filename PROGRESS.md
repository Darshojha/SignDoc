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

### 2026-07-13
- **Signing pipeline (core fix):** `renderSignaturePdf` ignored captures and stamped signer name into every field. Rewrote it to load the `signatures` table and render per type — embed PNG/JPG for signature/initials, draw captured text/date(formatted)/dropdown, `X` for checkbox. Added server-side required-field guard in `signEnvelopeWithToken` (400, not 500).
- **Capture persistence:** date/text/dropdown/checkbox now POST to `/signatures` (were client-state only); relaxed the POST route's data:image-only check (lib enforces image-vs-text per field type).
- **Signed-PDF caching bug:** overwriting one signed path made Supabase Smart CDN serve stale copies (broke cert + multi-signer layering + owner view). Fixed with immutable versioned revision paths (`{id}/signed/{ts}-{rand}.pdf`); cert + sign both update `signed_storage_path`. Superseded revisions not GC'd (noted).
- **Certificate of Completion:** `certificate.ts` appends an audit page (envelope id, signers, statuses, viewed/signed timestamps, IP) to the final PDF on completion; all signers emailed on completion.
- **Envelope UX:** detail page shows document preview + download; `EnvelopeActions`/`SendEnvelopeButton` call `router.refresh()`; removed dead email textarea on send. Envelopes list got status stat cards + search/status filter (`EnvelopesBrowser`).
- **Bulk send:** was calling the send endpoint via auth-less server fetch (401) and posting empty recipients (no UI). Now calls `sendEnvelope()` directly, added a recipients modal, uses real template name; rejects multi-role templates. In-memory job store ceiling noted.
- **Templates:** removed broken delete-undo (POST route never existed; auto-fired phantom error toast). Wired snap-to-grid in editor (was dead), dropped dead Guides button; added lenient server validation for `is_required`/`dropdown_options` in `isTemplateField`.
- **Account/SaaS:** added sign-out (was entirely missing), `/settings` (display name via user_metadata, change password, sign out), sidebar identity + Settings nav. Ignored `public/**` + `scripts/**` in eslint (vendored minified worker inflated lint 1496→19).
- **Verification:** `scripts/e2e-signing.mjs` drives the full lifecycle vs live Supabase + dev server — 30 asserts incl. pdfjs text/image extraction proving captured values land in the signed PDF, cert page, required-field guard, bulk send, and sequential multi-signer layering. All green. Build + typecheck clean. Pre-existing lint errors remain in `ThemeToggle`/`PageTransition` (unrelated).