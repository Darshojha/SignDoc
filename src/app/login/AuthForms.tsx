"use client";

import { useActionState } from "react";
import { signIn, signUp } from "./actions";

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
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
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

export function AuthForms() {
  return (
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
  );
}
