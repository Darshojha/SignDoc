# SignDoc — Project Brief

## What this is

An internal e-signature tool for our organization — a leaner, faster, easier-to-use alternative to DocuSign for our own team's document-signing needs. Not a public SaaS product.

## Stack (fixed — do not suggest alternatives)

Next.js (App Router, TypeScript) + Supabase (DB, Auth, Storage) + Vercel (hosting).

## v1 Scope — build this, nothing more

- **Documents & templates**: upload PDFs, save reusable templates with field layouts, shared org template library, bulk send.
- **E-sign core**: drag-and-drop fields (signature/initials/date/text/checkbox), draw/type/upload signature, sequential or parallel multi-signer, decline with reason.
- **Workflow**: envelope status tracking (draft → sent → viewed → signed → completed/declined/voided), lightweight activity log (who/when, not legal-grade audit).
- **Notifications**: email on send/viewed/signed/completed, reminders for pending signers.
- **Accounts**: single org, two roles only (`admin`, `member`), no billing/quotas.

## Explicitly OUT of scope for v1 (do not build, even if it seems easy)

- Compliance-grade audit trail (IP logging, document hashing, certificate of completion)
- Delegated signing
- Salesforce integration
- Google Drive integration
- Usage quotas / billing tiers
- Mobile native app

If asked to build any of the above, respond with: "This is a v2 item per PROJECT.md — confirm with the project owner before building."

## Design direction

Soft, warm, rounded, professional — see `frontend-design-system` skill for exact tokens. Sidebar-nav dashboard for logged-in users; a separate, simpler layout for external signers (no dashboard chrome).

## Quality guardrails — apply to every feature, not just listed once

### Security baseline
- Every API route must check the requester is authenticated AND authorized for that specific org/envelope — never trust a client-sent org_id or user_id.
- Signer magic-links: single-use where possible, expire with the envelope, rate-limited against guessing attempts.
- No secrets (Supabase service key, etc.) ever in client-side code — server-only.
- Validate file uploads server-side (type + size), never trust client-side validation alone.

### Data protection
- Never overwrite an original uploaded document — signed versions are separate files (see document-storage skill).
- Enable Supabase Row Level Security before any real documents go through the app, even for personal use.
- Confirm Supabase's automatic backups are on (default on most plans) — don't build custom backup logic for v1.

### Performance / lag-free
- PDF preview/rendering and file uploads must show a loading state — never a frozen screen with no feedback.
- Large PDFs: render page-by-page (lazy load), not the whole document at once.
- Bulk send and reminder jobs run in the background (job queue), never block the UI.
- Target: dashboard list views and document open should feel instant (<1s) for typical personal-use document counts.

### UX polish
- Every async action (send, sign, save template) needs a visible success/failure state — no silent failures.
- Consistent use of frontend-design-system tokens on every screen — no one-off styling.
- Every error message should say what happened and what to do next, not a raw error code.
- Empty states everywhere a list could be empty (no templates yet, no envelopes yet).



`document-workflow-engine`, `pdf-signature-overlay`, `auth-and-permissions`, `templates-and-bulk-send`, `notification-system`, `document-storage`, `deployment-and-setup`, `frontend-design-system`, `api-design-conventions`

## Current phase

**Week 1 — v1 build.** See tutor plan for day-by-day breakdown.