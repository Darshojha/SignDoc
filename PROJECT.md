# SignDoc

**Stack:** Next.js App Router (TypeScript) + Supabase (DB/Auth/Storage) + Vercel.

## Product

Internal e-signature tool. Leaner DocuSign alternative for our org only.
v1: PDF upload, reusable templates with field layouts, draw/type/upload signatures, sequential/parallel multi-signer, decline-with-reason, envelope state machine (DRAFT→SENT→VIEWED→PARTIALLY_SIGNED→COMPLETED/DECLINED/VOIDED/EXPIRED), lightweight activity log, email notifications, single-org admin/member roles. No billing, no delegated signing, no compliance audit, no mobile.

## Done

- Create→send→sign cycle verified
- Decline flow with reason verified (`21666d1`)
- API auth guards + owner scoping
- Rate limiting (5/min/IP)
- Loading/empty states
- Email notifications wired (Resend)
- Password reset UI (email test blocked by Supabase rate limit)
- Signature modal: type/draw/upload components exist, wiring to `/sign/[token]` complete

## Architecture Decisions

- **Storage:** Supabase Storage private buckets. Paths: `envelopes/{id}/original/` and `/signed/`. Signed URLs server-side only, scoped to session or signer token.
- **Auth:** Two systems. Account holders: Supabase session at `/login`. Signers: single-use expiring magic-link token (`envelope_signers.access_token_hash`), no account required.
- **Signer RLS:** Direct table access denied. Signer ops use service role + token validation (`verify_signer_token` function).
- **Workflow:** Centralized transitions in `src/lib/envelopes/workflow.ts`. Every status change appends `envelope_events`. Never set status in route handlers.
- **Field layout:** JSONB `{id, page, x, y, width, height, field_type, assigned_role}`. Coordinates 0–100% top-left origin (UI); flip Y for PDF.
- **Signatures:** Per-field captures in `signatures` table (unique signer_id+field_id). Store base64 image_data separate from flattened PDF.
- **Notifications:** Event-driven via job queue. Triggers: sent/viewed/signed/completed/declined/reminder/expiring_soon.
- **Design:** Warm rounded tokens in `globals.css`. Dashboard sidebar + separate signer layout (no chrome). Glass components + ambient background.
- **Next.js:** Version has breaking changes from training data. Read `node_modules/next/dist/docs/` before coding.

## Known Constraints

- No colorful accents — monochrome/metallic palette only
- RLS must be enabled before real documents
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- PDF Y-axis flip required: `pdf_y = page_height - canvas_y`
- `.env.local` not auto-synced to Vercel — add env vars in dashboard
- PROGRESS.md: read latest entry before work, append on stop, never delete old entries

## File Map

```
src/
  app/
    (dashboard)/envelopes/[id]/page.tsx   # envelope detail
    (dashboard)/templates/[id]/edit/page.tsx # template editor
    sign/[token]/page.tsx                 # signer page → SignerEnvelopeView
    api/v1/signing/[token]/route.ts       # signer submit
    api/v1/signing/[token]/signatures/route.ts # field captures
  components/
    signing/
      SignatureCaptureModal.tsx           # type/draw/upload tabs
      SignerEnvelopeView.tsx              # signer UI + submit/decline
      SignerDocumentWithFields.tsx        # PDF + field overlay
    ui/glass/                             # GlassButton, GlassCard
  lib/
    envelopes/
      workflow.ts                         # state machine, token resolution
      signatures.ts                       # signature CRUD via token
      storage.ts                          # Supabase signed URLs
supabase/migrations/0005_signatures.sql  # signatures table + verify_signer_token()
```

## Cursor Skills

`document-workflow-engine` `pdf-signature-overlay` `auth-and-permissions` `templates-and-bulk-send` `notification-system` `document-storage` `frontend-design-system` `api-design-conventions` `deployment-and-setup`