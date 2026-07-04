# SignDoc — Development Context (Agent Reference)

> Read this + `PROJECT.md` + latest `PROGRESS.md` entry before any feature work.

## Stack (fixed)

Next.js App Router (TypeScript) + Supabase (DB, Auth, Storage) + Vercel. Read `node_modules/next/dist/docs/` before Next.js API changes — this version has breaking changes from training data.

## v1 scope

- Templates with field layouts (signature/initials/date/text/checkbox)
- Draw / type / upload signature capture
- Sequential or parallel multi-signer envelopes
- Decline with reason
- Envelope state machine: DRAFT → SENT → VIEWED → PARTIALLY_SIGNED → COMPLETED | DECLINED | VOIDED | EXPIRED
- Email notifications (Resend wired; inbox verification pending)
- Single org, admin/member roles, owner-scoped data (`created_by`)

## Explicitly OUT of scope (v2)

Compliance audit (certificates, document hashing), delegated signing, Salesforce/Drive, billing/quotas, mobile app. If asked: *"This is a v2 item per PROJECT.md — confirm with the project owner before building."*

## Auth model (two systems)

1. **Account holders** — Supabase session login at `/login`; required for `/api/v1/envelopes` and `/api/v1/templates`.
2. **Signers** — magic-link token in `/sign/[token]`; token hash in `envelope_signers.access_token_hash`; validate via `resolveSignerContextByToken()` / `getSignerEnvelopeByToken()`. Decline uses `X-Signer-Token` header. No full account required.

## Security guardrails

- Every API route: authenticate + authorize (never trust client `org_id` / `user_id`).
- Service role key server-only; never in client code.
- RLS enabled on all tables; server routes use service-role (bypasses RLS) with app-level auth checks.
- Rate limits: login/signup/send — 5/min/IP.
- Never overwrite original PDFs — signed copies are separate paths in storage.
- Validate uploads server-side (type + size).

## Data model highlights

```
envelopes, envelope_signers, envelope_documents (field_layout jsonb), envelope_events
templates (field_layout jsonb)
signatures (per-field capture — see 0005_signatures.sql)
```

Field layout: `{ id, page, x, y, width, height, field_type, assigned_role }` — **percentages 0–100**, top-left origin in UI; PDF Y-axis is bottom-left (flip when stamping).

## API conventions

- Prefix `/v1/`; nested resources for actions (`POST .../send`, `POST .../decline`).
- Standard error shape: `{ error: { code, message, field } }`.
- Signing: `GET/POST /api/v1/signing/[token]`.
- Decline: `POST /api/v1/envelopes/[id]/signers/[signerId]/decline` + `X-Signer-Token`.

## Workflow rules (document-workflow-engine)

1. Signer acts only when envelope is SENT or PARTIALLY_SIGNED and it's their turn (`signerCanAct`).
2. Sequential: signer N+1 waits until N completes.
3. COMPLETED when all signers signed.
4. Every status transition → append-only `envelope_events` row (lightweight log, not legal audit).
5. Centralize transitions in `src/lib/envelopes/workflow.ts` — never set status directly in route handlers.

## Frontend design system

- Tokens in `globals.css` / `frontend-design-system` skill: warm, rounded, Inter, indigo primary.
- Dashboard: sidebar nav, max-width ~1100px.
- **Signer view**: separate simple layout — no sidebar, document + sign action only.
- Glass components (`GlassCard`, `GlassButton`), `AmbientBackgroundMotion`, loading spinners, empty states on all lists.
- Every async action needs visible success/failure feedback.

## Storage (document-storage)

- Supabase Storage, private buckets; signed URLs generated server-side only.
- Paths: `envelopes/{id}/original/...` and `envelopes/{id}/signed/...` — never overwrite original.

## Current progress (as of 2026-07-04)

| Area | Status |
|------|--------|
| Create → send → sign cycle | ✅ Verified |
| Decline flow | ✅ Verified (`21666d1`) |
| API auth guards | ✅ |
| Owner scoping | ✅ |
| Rate limiting | ✅ |
| Loading / empty states | ✅ |
| Email notifications | ⚠️ Resend wired; inbox proof pending |
| Password reset | ⚠️ UI done; Supabase rate limit blocked email test |
| Signature modal integration | 🔄 In progress (type/draw/upload components exist; wiring to `/sign/[token]` pending) |

## Key files for signing work

| File | Purpose |
|------|---------|
| `src/app/sign/[token]/page.tsx` | Signer page (server) |
| `src/components/signing/SignerEnvelopeView.tsx` | Signer UI + submit/decline |
| `src/components/signing/SignatureCaptureModal.tsx` | Type/Draw/Upload tabs modal |
| `src/lib/envelopes/workflow.ts` | State machine, token resolution, PDF render |
| `src/app/api/v1/signing/[token]/route.ts` | Sign API |
| `supabase/migrations/0005_signatures.sql` | Signatures table |

## Implementation principles

1. **Minimal diff** — don't touch decline flow or envelope status logic unless required.
2. **Reuse existing patterns** — token validation like decline; glass UI components; workflow.ts for server logic.
3. **No silent failures** — loading/error states on all async signature saves.
4. **Test manually** before committing (all 3 capture methods).

## Cursor skills (`.cursor/rules/`)

| Skill | Use when |
|-------|----------|
| `document-workflow-engine` | Envelope states, transitions, events |
| `pdf-signature-overlay` | Field placement, coordinates, flattening |
| `auth-and-permissions` | Sessions, magic links, RLS |
| `templates-and-bulk-send` | Template library, bulk send |
| `notification-system` | Email triggers, reminders |
| `document-storage` | Uploads, signed URLs, buckets |
| `frontend-design-system` | UI tokens, layout rules |
| `api-design-conventions` | Endpoint naming, errors |
| `deployment-and-setup` | Env vars, Vercel, local dev |

## PROGRESS.md rule

Read latest entry before starting. Append new entry when stopping (even if incomplete). Never delete old entries.
