# Implementation Plan

Build a DocuSign-like signing product in four phased v1 workstreams: envelope lifecycle, advanced PDF editor, enterprise email workflows, and richer field types. The plan unifies existing template/envelope/signer foundations into a single coherent roadmap, reusing current Supabase auth, Next.js App Router routes, server-only data helpers, Resend email, and `react-pdf` + `pdf-lib` rendering pipeline. Each phase adds capabilities without removing or rewriting earlier work.

## Context and Scope

Current state: the app already supports templates with field placement, envelope creation from templates, signer magic-link tokens, viewed/signed/declined status transitions, signature capture (typed/drawn/uploaded), basic email invitations, duplicate/rename/delete templates, and bulk-send jobs. Missing for v1 parity: true envelope lifecycle controls (send reminders, void, resend, expiration handling, receipt/completion emails), a richer template editor (snapping, guides, zoom, thumbnails, multi-select/move/resize, page management), expanded field types (dropdown), and polished email workflows (CC/BCC, tracking, scheduled sending placeholder).

## Constraints and Decisions

- Keep Next.js 16 + Supabase + Resend stack. No new runtime dependencies unless unavoidable.
- Coordinates stored as percentages; all rendering uses `PAGE_WIDTH = 720` and pdf-lib coordinate transforms.
- Auth uses service-role routes plus signer-token verification; no client secrets.
- Envelope state machine centralized in `src/lib/envelopes/workflow.ts`.
- All list/edit/create endpoints live under `/api/v1/`.
- Soft-delete and restore were removed because the schema lacks `deleted_at`; direct delete is used.

## Types

New/updated TypeScript types:
- Add `is_required?: boolean` to `TemplateField` to support required-field validation.
- Add `dropdown_options?: string[]` to `TemplateField` for the new dropdown field type.
- Add `cc_bcc?: { cc: string[]; bcc: string[] }` metadata shape on envelope event/email payloads.
- Extend `EnvelopeEvent.metadata` shape with optional `reminder_count`, `scheduled_send_at`, `email_message_id`.
- Add `EmailTemplate` type for branded email subjects/bodies if branding is later enabled.

## Files

Create:
- `src/components/templates/FieldEditorToolbar.tsx`
- `src/components/templates/PageManagement.tsx`
- `src/components/templates/FieldFormatMenu.tsx`
- `src/lib/templates/editor.ts`
- `src/lib/email/templates.ts`
- `src/lib/email/tracking.ts`
- `src/app/api/v1/envelopes/[id]/void/route.ts`
- `src/app/api/v1/envelopes/[id]/remind/route.ts`
- `src/app/api/v1/envelopes/[id]/resend/route.ts`
- `src/app/api/v1/envelopes/[id]/events/route.ts`

Modify:
- `src/lib/templates/types.ts`
- `src/lib/envelopes/workflow.ts`
- `src/lib/envelopes/types.ts`
- `src/lib/notifications.ts`
- `src/components/templates/FieldPlacementEditorClient.tsx`
- `src/app/(dashboard)/envelopes/page.tsx`
- `src/app/(dashboard)/envelopes/[id]/page.tsx`
- `src/app/api/v1/envelopes/route.ts`
- `src/app/api/v1/envelopes/[id]/route.ts`

## Functions

New:
- `voidEnvelope(id, ownerId)` in `src/lib/envelopes/workflow.ts`
- `remindEnvelope(id, ownerId)` in `src/lib/envelopes/workflow.ts`
- `resendEnvelope(id, ownerId)` in `src/lib/envelopes/workflow.ts`
- `sendCompletionEmail(params)` in `src/lib/notifications.ts`
- `sendDeclineEmail(params)` in `src/lib/notifications.ts`
- `sendExpiringSoonEmail(params)` in `src/lib/notifications.ts`
- `buildEmailBody(templateName, signerName, signingUrl, action)` in `src/lib/email/templates.ts`
- `snapToGrid(value, grid)` in `src/lib/templates/editor.ts`

Modified:
- `createEnvelopeFromTemplate` supports `cc_bcc`, `scheduled_send_at`, `message`, and `reminder_config`.
- `sendEnvelope` returns `SignerLink[]` plus `rematch/sent_counts`, logs `envelope.sent`.
- `signerCanAct` ensures sequential order checks remain correct.
- `isFieldRequired`, `isFieldFilled`, `validateRequiredFields` in signing view handle new types consistently.

## Classes

No new classes. Use functional modules and server helpers to match existing code style.

## Dependencies

No new packages. Consider adding lightweight email templating in `src/lib/email/templates.ts` using template literals. Reuse `resend` for all outbound mail. Optional later: `pdf-lib` and `react-pdf` already present.

## Testing

Add manual checklist items per phase:
- Stage 1: create/send/sign/decline/expire/void.
- Stage 2: place/resize/move fields, snap to guides, zoom/thumbnails, page add/reorder.
- Stage 3: invitation, reminder timer, completion, decline, expired email flows.
- Stage 4: dropdown field validation and submission.

Automation: Playwright is already in devDependencies; add one focused smoke test file per phase if time permits.

## Implementation Order

1. **Phase 1: Envelope lifecycle**
   - Add void/remind/resend/events API routes.
   - Extend workflow helpers and event logging.
   - Add envelope completion/decline/expiring emails with Resend.
   - Update envelope detail and list pages with action buttons and status handling.

2. **Phase 2: Advanced PDF editor**
   - Add snap-to-grid, smart guides, zoom controls, thumbnail sidebar, page management.
   - Add multi-select move/resize, context menu actions.
   - Refactor `FieldPlacementEditorClient` to delegate editor logic to `src/lib/templates/editor.ts`.

3. **Phase 3: Enterprise email workflows**
   - Add CC/BCC handling to email functions.
   - Add resend/reminder scheduling hooks and event metadata.
   - Introduce email template helpers and basic tracking IDs.

4. **Phase 4: Rich field types**
   - Extend `TemplateField` with `dropdown_options` and `is_required`.
   - Add dropdown UI composer and validation.
   - Persist/adjust flattening in `renderSignaturePdf` for non-signature fields while keeping legal-weight flattening behavior.