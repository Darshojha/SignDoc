# SignDoc — Agent Instructions (Codex)

> Read PROJECT.md and PROGRESS.md in this repo first. This file contains the detailed how-to knowledge for every part of the app — read the relevant section before touching that part of the codebase.


---

# Document Workflow Engine

This skill encodes the core state machine that makes a signing product actually work.
Everything else (PDFs, auth, notifications) hangs off this backbone, so build it first.

## The core model

An **Envelope** is the unit of work — one or more documents + one or more signers.

States (this is the part most beginners get wrong — don't skip statuses):
```
DRAFT -> SENT -> (VIEWED) -> (PARTIALLY_SIGNED) -> COMPLETED
                                                  -> DECLINED
                                                  -> VOIDED
                                                  -> EXPIRED
```

Rules to enforce in code, not just in the UI:
1. A signer can only act on an envelope that is `SENT` or `PARTIALLY_SIGNED`.
2. If signing order is `sequential`, signer N+1 cannot receive/view the document until signer N completes their action.
3. If signing order is `parallel`, all signers are notified simultaneously.
4. `COMPLETED` is only reached when every required signer has signed — track this with a signer-level status field, not just a global counter, so partial completion is queryable.
5. Every state transition writes a row to a simple `envelope_events` table (event_type, actor, timestamp) — this is a lightweight activity log for answering "did they sign yet?", NOT a compliance/legal audit trail. Keep it simple: no IP logging, no document hashing, no certificate generation. Never mutate status without logging the change.

## What to ask the user before writing code

If the user hasn't specified these, ask (don't assume):
- Sequential or parallel signing, or both (configurable per envelope)?
- Can a signer delegate/forward to someone else?
- What happens on decline — does it void the whole envelope or just that signer's branch?
- Expiration: hard deadline, or reminder-then-expire?

## Data model starting point

```
envelopes: id, status, created_by, created_at, expires_at, signing_order (enum: sequential|parallel)
envelope_signers: id, envelope_id, user_email, order_index, status, signed_at, ip_address
envelope_documents: id, envelope_id, file_url, page_count
envelope_events: id, envelope_id, actor, event_type, timestamp, metadata (jsonb)
```

`envelope_events` is your audit trail seed — keep it append-only, never update rows in it.

## Implementation guidance by stack

If the user names a framework, follow it; otherwise ask. Common choices and where the workflow logic should live:
- **Node/Express or Nest**: implement the state machine as its own service class (`EnvelopeStateMachine`), not scattered across route handlers.
- **Python/Django or FastAPI**: model status as a `TextChoices`/`Enum`, transitions as methods on the model, guarded by a `can_transition()` check.
- **Ruby on Rails**: this is a textbook `aasm` or `state_machine` gem use case — recommend it rather than hand-rolling unless the user objects.

Whatever the stack, the transition logic should be centralized in one place that every code path calls — never let a route handler set `status = 'completed'` directly.

## Common mistakes to catch

- Allowing a signature to be recorded without first checking the envelope is in a signable state (race condition risk if two requests hit at once — use a DB-level lock or optimistic concurrency check).
- Storing signer order as an array on the envelope instead of a row per signer — makes partial status tracking painful later.
- Treating "viewed" as equivalent to "signed" for compliance purposes — they are legally distinct events and must be logged separately.

---

# PDF Signature Overlay

## Two distinct sub-problems — don't conflate them

1. **Field placement (sender side)**: sender drags fields (signature, initials, date, text, checkbox) onto page coordinates. Store as `{page, x, y, width, height, field_type, assigned_signer}` — coordinates as a percentage of page width/height, NOT raw pixels, so it survives different render resolutions.
2. **Field fulfillment + flattening (signer side)**: once a signer submits, render their input (image or generated cursive text) into the exact field position, then **flatten** — merge the annotation layer into the page content so it can never be edited or extracted as a separate layer again. Flattening is what gives the document legal weight — don't skip it.

## Recommended libraries by stack

- **Python**: `pypdf` for structure/merging, `reportlab` or `pdf2image` + `Pillow` for stamping images onto pages, then re-merge. For form-field-based PDFs, `pdfrw` or `PyMuPDF (fitz)` handles flattening well.
- **Node**: `pdf-lib` handles overlay + flatten in one library, actively maintained, good default choice.
- **Existing PDF forms (AcroForms)**: prefer filling native form fields over drawing overlays when the PDF already has them — cleaner, more accessible, easier to flatten correctly.

## Coordinate system gotcha

PDF origin is bottom-left, most UI canvases are top-left. When translating a click position from a browser canvas to PDF coordinates, flip the Y axis: `pdf_y = page_height - canvas_y`. This is the single most common bug in this feature — check it first if fields appear in the wrong place.

## Signature capture on signer side

Three input methods to support: drawn (canvas + touch/mouse), typed (render in a cursive web font, e.g. via a stamped SVG-to-image), or uploaded image. Store the raw signature data (SVG path or image) separately from the flattened PDF, so you have an auditable original.

## Legal note (mention to user, don't decide for them)

Flattened + hash-logged PDFs plus an audit trail are generally what satisfies e-signature frameworks like ESIGN/UETA (US) or eIDAS (EU), but Claude is not a lawyer — tell the user to confirm compliance requirements with counsel for their jurisdiction.

---

# Auth & Permissions

## Two separate auth systems — this product needs both

1. **Account holders** (people who log in to send/manage envelopes) — normal auth: email/password, OAuth/SSO, sessions or JWT.
2. **Signers** (people receiving a document to sign) — usually should NOT need a full account. Use a signed, expiring, single-use link (magic link) tied to that specific envelope + signer row. This is what most beginners get wrong by forcing signers to register.

## Recommended signer link design

- Generate a random token (e.g. 32-byte, base64url), store its hash (not the raw token) in `envelope_signers.access_token_hash`.
- Set an expiration matching the envelope's expiration.
- On access, verify token hash + envelope status is signable + this signer hasn't already completed.
- Log the access (IP, timestamp, user agent) as an audit event immediately, even before they sign anything.

## Roles for account holders — v1 scope (single org, no billing)

Keep this simple for v1 — two roles only:
- `admin` — manage org users, see all envelopes/templates in the org
- `member` — create/send envelopes, use shared templates, sees their own envelopes plus anything shared with them

Don't build a billing/owner tier or usage quotas for v1 — this app has one org (yours), no plan tiers.

## Out of scope for v1 — do not build yet

**Delegated signing** ("sign on my behalf" / forwarding an envelope to someone else) is a v2 feature. If an AI agent suggests adding it while building auth, defer it — note it as a TODO instead of implementing, to avoid scope creep mid-week.

Enforce these at the query layer (e.g. always scope `WHERE org_id = ? AND (created_by = ? OR role IN ('admin','owner'))`), not just by hiding UI buttons — hidden buttons are not security.

## Stack-specific starting points

- **Node**: `passport.js` or `next-auth`/`Auth.js` for account auth; roll your own lightweight token system for signer links (don't force a full auth library onto guest signers).
- **Python**: Django's built-in auth + `django-guardian` for object-level permissions, or FastAPI + `fastapi-users`.
- **Session vs JWT**: for the account-holder side, default to server-side sessions unless the user specifically needs stateless auth (e.g. separate mobile app) — sessions are easier to revoke immediately, which matters for a legal-document product.

## Security musts, not nice-to-haves

- Rate-limit signer link access attempts.
- Never put PII (name, email) in a JWT payload if it's stored client-side unencrypted.
- Every permission check should fail closed (deny by default) — ask the user to confirm this is how their framework's guard/middleware is set up if you're not sure.

---

# Templates & Bulk Send

## What a template actually is

A template = a document + its field layout (signature/date/text positions from the pdf-signature-overlay skill), saved WITHOUT specific signers attached. When someone uses it, they pick real signers and it spins up a normal envelope.

```
templates: id, org_id, name, created_by, source_document_url, field_layout (jsonb), created_at
```

`field_layout` stores the same `{page, x, y, width, height, field_type}` shape used for regular envelopes — placeholder roles instead of real people, e.g. `assigned_role: "Signer 1"` instead of a real email. When the template is used, the UI asks the user to map each role to a real signer.

## Creating a template

1. Upload a document (same upload flow as document-storage skill).
2. Place fields as normal, but assign to a **role label** ("Client", "Manager") instead of an email.
3. Save — this writes to `templates`, not `envelopes`.

## Using a template

1. Pick a template from the library.
2. UI shows the role labels, user fills in real names/emails for each.
3. System creates a new `envelope` + `envelope_signers` rows, copying the field layout from the template with real signer IDs substituted in for the role placeholders.
4. From here it's a normal envelope — everything in document-workflow-engine applies unchanged.

## Template library

- Scope templates to the org (`org_id`), not just the individual creator — this is the "standardize agreements by sharing with your team" feature. Any user in the org should see the shared library by default; don't build private-only templates for v1 unless asked.
- Simple search/filter by name is enough for v1 — don't build folders/tagging unless it's clearly needed once you have more than ~10 templates.

## Bulk send

Send the same template to many recipients, each getting their OWN separate envelope (not one shared envelope with many signers — that's a different feature, sequential/parallel multi-signer, already covered elsewhere).

```
POST /v1/templates/:id/bulk-send
body: { recipients: [{ name, email }, ...] }
```
This should loop and create one envelope per recipient, reusing the template's field layout. Do this as a background job (see notification-system skill's job-queue pattern) if the recipient list is long — don't block the HTTP request on 50 envelope-creation calls.

## What NOT to build for v1

Conditional logic in templates (e.g. "if field X is checked, show field Y") — this is an advanced DocuSign feature, skip it unless you specifically hit a wall without it.

---

# Notification System

## Event-driven, not polling

Every status transition in the document-workflow-engine skill should emit an event; this skill's job
is to fan that event out to the right channels. Don't check-and-notify from inside HTTP request handlers directly — use a job queue (e.g. BullMQ for Node, Celery for Python) so a slow email provider never blocks a signing request.

## Notification triggers to implement

| Event | Recipient | Channel |
|---|---|---|
| envelope.sent | next signer(s) in order | email (required) |
| signer.viewed | envelope owner | email digest or in-app, not always immediate |
| signer.signed | next signer (if sequential) + owner | email |
| envelope.completed | all signers + owner | email w/ signed doc attached or link |
| envelope.declined | owner | email, immediate |
| reminder (configurable, e.g. 3 days idle) | pending signer | email |
| envelope.expiring_soon | pending signer + owner | email |

## Reminder scheduling

Store `next_reminder_at` on `envelope_signers`; a scheduled job (cron every 15–60 min) queries signers past that timestamp who are still pending, sends a reminder, and updates the timestamp — don't create one-off timers per signer, they don't survive server restarts.

## Email content rules

- Never put the actual document content in the email body — link to a secure signer link (see auth-and-permissions skill).
- Every signer-facing email needs a clear CTA button and a plain-text fallback link.
- Include a way to view "why am I getting this" (which envelope, which sender) for spam/support reasons.

## Webhook delivery to external customers

Covered in detail in api-design-conventions skill — this skill just needs to know: an outbound webhook is itself a "notification" and should go through the same job queue with retry logic, not fired synchronously.

---

# Document Storage

## Decision made: cloud storage (Supabase Storage)

Don't re-litigate this per feature — every upload/download in this app goes through Supabase Storage, not local disk, not a different provider. Consistency here matters more than which provider is "best."

## Bucket structure

```
envelopes/
  {envelope_id}/
    original/{document_name}.pdf      -- as uploaded, never modified
    signed/{document_name}.pdf        -- final flattened + signed version
    certificate.pdf                   -- certificate of completion (see audit skill)
```
Keep `original` and `signed` separate — never overwrite the original. If something is disputed later, you need both.

## Access pattern

- **Never make the bucket public.** All access goes through signed, expiring URLs generated server-side.
- Dashboard (account holder) view: generate a signed URL scoped to their session, short expiry (e.g. 10 min), regenerate on each page load.
- Signer view: generate a signed URL scoped to that signer's magic-link token (see auth-and-permissions skill) — the URL itself should not be guessable or reusable outside that flow.

## Upload flow

1. Client requests a signed *upload* URL from your API (never upload directly with a static API key from the browser).
2. Server validates: file type (PDF only, unless the user explicitly wants multi-format support), file size limit (set one — e.g. 25MB — and surface it in the UI, don't let it fail silently).
3. Client uploads directly to storage using the signed URL (keeps large files off your API server).
4. Server records the storage path in `envelope_documents.file_url` only after upload confirms — never write the DB row optimistically before the file exists.

## Environment variables needed (set these up on day 1, not later)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-only, never expose to client
```

## Common mistake to avoid

Storing the Supabase public/anon key in a way that lets a client generate arbitrary signed URLs for other envelopes. Every signed-URL request must be authorized server-side against that specific user/signer's access rights first — the storage layer has no idea what an "envelope" or "signer" is, so your API is the only place that check can happen.

---

# Frontend Design System

Purpose: this is the single visual source of truth. Any model touching the UI reads this FIRST,
so a screen built by Claude on Monday and a screen built by Cursor on Wednesday look like the same product.

## Direction: soft & friendly, professional (Stripe-docs-adjacent)

Not playful/toylike, not corporate/cold. Warm, rounded, generous whitespace, quietly confident.

## Design tokens (use these exact values — don't invent new ones per screen)

```css
:root {
  /* Color */
  --color-bg: #FAFAF9;
  --color-surface: #FFFFFF;
  --color-border: #E7E5E4;
  --color-text-primary: #292524;
  --color-text-secondary: #78716C;
  --color-primary: #6366F1;      /* indigo — primary actions */
  --color-primary-hover: #4F46E5;
  --color-success: #10B981;      /* signed/completed */
  --color-warning: #F59E0B;      /* pending/reminder */
  --color-danger: #EF4444;       /* declined/voided */

  /* Radius — this is what makes it feel "soft" */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;

  /* Shadow — subtle, never harsh */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 12px rgba(0,0,0,0.08);

  /* Spacing scale (4px base) */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px;
}
```

## Typography

- Font: `Inter` (system fallback: `-apple-system, sans-serif`) — clean, warm at larger sizes, extremely legible.
- Headings: semibold (600), not bold (700) — bold reads harsh at this weight of design.
- Body: 15–16px base, `--color-text-primary`. Secondary/meta text: 13–14px, `--color-text-secondary`.

## Component rules

- **Buttons**: `--radius-md`, no sharp corners anywhere in the app. Primary = filled `--color-primary`. Secondary = outline, `--color-border`. Always a hover state — subtle scale (1.01) or shadow lift, never a jarring color jump.
- **Cards** (envelope list items, dashboard stats): `--color-surface` background, `--shadow-card`, `--radius-lg`. On hover: `--shadow-hover`.
- **Status badges** (draft/sent/signed/voided): small rounded pill, colored background at 10% opacity of the status color + full-opacity text of that color. Never a jarring solid-fill badge — keep it soft.
- **Forms**: label above input (not floating labels — clearer for a document/legal product), generous input padding (`--space-3` vertical), `--radius-sm` on inputs.
- **Empty states**: never a blank page. Always an icon/illustration + one sentence + a clear CTA (e.g. "No envelopes yet — send your first document").

## Layout

- Max content width `1100px` on dashboard views, centered, generous side padding on mobile.
- Sidebar nav (not top nav) for the authenticated dashboard — this is the pattern users expect from Docusign/Notion-style tools and it scales better as features grow.
- The signer-facing view (external, no login) is a SEPARATE, simpler layout — no sidebar, no dashboard chrome, just the document + a clear "Sign" action. Never expose internal app nav to an external signer.

## Recommended implementation

Tailwind CSS + shadcn/ui components as the base, then apply the tokens above via `tailwind.config.js` theme extension. This gives every model a shared, well-documented component vocabulary rather than hand-rolled CSS per screen.

## Before building any screen, check

1. Am I reusing an existing component/pattern from this file, or inventing a new one? (reuse first)
2. Does this match the token values above exactly, not "close enough" hex codes?
3. Is the signer-facing view kept visually separate and simpler than the dashboard?

---

# Deployment & Setup

## Stack decision (don't re-ask per session)

Next.js (App Router) + Supabase (DB, Auth, Storage) + Vercel (hosting). One repo, one deploy target.

## Day-1 setup checklist (do this before writing any feature code)

1. `npx create-next-app@latest` — TypeScript, App Router, Tailwind: yes.
2. Create a Supabase project (free tier is enough for personal use). Copy the URL + anon key + service role key.
3. `.env.local` (never commit this — confirm `.gitignore` includes it):
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
4. Connect the GitHub repo to Vercel (import project, it auto-detects Next.js). Add the same env vars in Vercel's dashboard under Settings → Environment Variables — local `.env.local` is NOT automatically used in production.
5. Push to `main` → confirm it deploys and loads before building a single feature. If this step is skipped, you find out your deploy is broken on day 6 instead of day 1.

## Suggested day-by-day pace for a 1-week solo build

| Day | Focus |
|---|---|
| 1 | Setup (above) + auth (account holder login) + base layout using frontend-design-system skill |
| 2 | Envelope creation: upload document, place signature fields (pdf-signature-overlay skill) |
| 3 | Signing workflow + state machine (document-workflow-engine skill) |
| 4 | Signer-facing flow: magic link, view, sign, flatten (auth-and-permissions + pdf-signature-overlay) |
| 5 | Notifications (email on send/signed/completed) |
| 6 | Polish UI, empty states, error handling, dashboard views |
| 7 | Buffer — bugs always take longer than planned. Don't schedule features here. |

## Running locally

```
npm run dev
```
Confirm `.env.local` is populated before running — most "nothing works" issues at the start of a session are a missing env var, check this first.

## Common deploy mistakes

- Forgetting to add env vars to Vercel (works locally, breaks in prod — the #1 issue).
- Committing `.env.local` by accident — if this happens, rotate the Supabase keys immediately, don't just delete the commit.
- Supabase Row Level Security (RLS) left disabled — fine for a rushed demo, but for anything touching real documents, enable RLS policies before day 7 even for personal use.

---

# API Design Conventions

Purpose of this skill: keep every endpoint in the product consistent, so growth doesn't produce
five different error formats and three different pagination styles by month six.

## Resource naming

Plural nouns, nested under parent resource:
```
POST   /v1/envelopes
GET    /v1/envelopes/:id
POST   /v1/envelopes/:id/send
POST   /v1/envelopes/:id/void
GET    /v1/envelopes/:id/signers
POST   /v1/envelopes/:id/signers/:signer_id/sign
GET    /v1/envelopes/:id/audit-events
```
Actions that aren't pure CRUD (send, void, sign, remind) are sub-resource POSTs, not new top-level verbs.

## Standard error shape (use everywhere, no exceptions)

```json
{
  "error": {
    "code": "envelope_not_signable",
    "message": "This envelope is voided and can no longer be signed.",
    "field": null
  }
}
```
`code` is machine-readable and stable (frontend/SDKs branch on it); `message` is human-readable and can change.

## Pagination

Cursor-based, not offset-based, once envelope volume matters:
```
GET /v1/envelopes?limit=25&cursor=eyJpZCI6MTIzfQ
```
Response includes `next_cursor: string | null`. Offset pagination is fine for a very early MVP — flag it as tech debt if the user wants to ship fast now.

## Webhooks (this product needs them — external systems care when a doc is signed)

- Event naming: `envelope.sent`, `envelope.completed`, `envelope.voided`, `signer.signed`, `signer.declined`.
- Always include a `webhook_id` and `sent_at`, and sign the payload (HMAC with a per-org secret) so receivers can verify authenticity.
- Retry with exponential backoff on non-2xx; log delivery attempts for the user to debug in a dashboard.

## Versioning

Prefix the URL path (`/v1/`) rather than header-based versioning — simpler for signer-facing integrations to reason about. Don't introduce `/v2/` until there's an actual breaking change to ship.

## When reviewing a new endpoint, check

1. Does it follow the naming pattern above?
2. Does every error path return the standard error shape?
3. Is pagination consistent with existing list endpoints?
4. Is the response scoped to the authenticated org/user (see auth-and-permissions skill)?
