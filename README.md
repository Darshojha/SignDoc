# SignDoc

SignDoc is a Next.js app for managing document templates, envelopes, and signer workflows with Supabase-backed storage and auth.

## Local Setup

1. Install dependencies.
2. Create a `.env.local` file with the required environment variables listed below.
3. Start the dev server.

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## Run Dev Server

```bash
npm run dev
```

## Deployment Notes

- Production is deployed from the `main` branch.
- The app uses Supabase for data access and auth sessions.
- Resend is used for notification email delivery.
- Security headers are configured in `next.config.ts`.
- Rate limiting is implemented in-process for login, signup, and envelope send requests.
