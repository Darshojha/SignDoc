"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { completePasswordReset, requestPasswordReset, signIn, signUp } from "./actions";

function AuthForm({
  action,
  buttonLabel,
  description,
  heading,
}: {
  action: typeof signIn;
  buttonLabel: string;
  description: string;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [email, setEmail] = useState("");

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
        {heading}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        {description}
      </p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
            Email
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
            Password
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
          />
        </label>

        {state?.error ? (
          <p className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Working..." : buttonLabel}
        </button>
      </div>
    </form>
  );
}

function PasswordResetRequestForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);
  const [email, setEmail] = useState("");

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
        Forgot password
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Send a recovery link to set a new password.
      </p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
            Email
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
          />
        </label>

        {state?.error ? <p className="text-sm text-[var(--color-danger)]">{state.error}</p> : null}
        {state?.message ? (
          <p className="text-sm text-[var(--color-success)]">{state.message}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Sending..." : "Send reset link"}
        </button>
      </div>
    </form>
  );
}

function RecoveryPasswordForm({ initialAccessToken }: { initialAccessToken?: string }) {
  const [state, formAction, pending] = useActionState(completePasswordReset, undefined);
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }
    });
  }, []);

  const effectiveAccessToken = accessToken ?? initialAccessToken ?? null;

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
        Set a new password
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Use the recovery link from your email to choose a new password.
      </p>

      <div className="mt-5 space-y-4">
        <input type="hidden" name="access_token" value={effectiveAccessToken ?? ""} />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
            New password
          </span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
          />
        </label>

        {state?.error ? <p className="text-sm text-[var(--color-danger)]">{state.error}</p> : null}

        <button
          type="submit"
          disabled={pending || !effectiveAccessToken}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Updating..." : "Update password"}
        </button>
      </div>
    </form>
  );
}

export function AuthForms({ initialAccessToken }: { initialAccessToken?: string }) {
  const searchParams = useSearchParams();
  const resetMode = searchParams.get("reset") === "1";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <AuthForm
          action={signIn}
          buttonLabel="Sign in"
          description="Use an existing Supabase user session."
          heading="Sign in"
        />
        <AuthForm
          action={signUp}
          buttonLabel="Create account"
          description="Create a confirmed Supabase auth user and sign in immediately."
          heading="Create account"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PasswordResetRequestForm />
        {resetMode ? <RecoveryPasswordForm initialAccessToken={initialAccessToken} /> : null}
      </div>
    </div>
  );
}
