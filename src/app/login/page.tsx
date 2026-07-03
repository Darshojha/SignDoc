import { AuthForms } from "./AuthForms";
import { getAuthTokenFromCookies } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const currentAccessToken = await getAuthTokenFromCookies();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#FAFAF9_0%,#F5F5F4_100%)] px-6 py-12">
      <section className="w-full max-w-4xl">
        <div className="mb-6 max-w-2xl">
          <p className="text-sm font-medium text-[var(--color-primary)]">
            Authentication
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--color-text-primary)]">
            Sign in to manage envelopes and templates
          </h1>
          <p className="mt-3 text-base leading-7 text-[var(--color-text-secondary)]">
            A logged-in Supabase session is now required for the admin API routes.
            Create a test account or sign in with an existing one to continue.
          </p>
        </div>
        <AuthForms initialAccessToken={currentAccessToken ?? undefined} />
      </section>
    </main>
  );
}
