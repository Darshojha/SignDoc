"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { completePasswordReset, requestPasswordReset, signIn, signUp } from "./actions";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassCard } from "@/components/ui/glass/GlassCard";

function AuthForm({ action }: { action: typeof signIn }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--theme-text-primary)]">
          Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-white/20 bg-white/55 px-3 py-2 text-sm text-[var(--theme-text-primary)] outline-none transition focus:border-[var(--theme-accent)]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--theme-text-primary)]">
          Password
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-[var(--radius-md)] border border-white/20 bg-white/55 px-3 py-2 text-sm text-[var(--theme-text-primary)] outline-none transition focus:border-[var(--theme-accent)]"
        />
      </label>

      <div className="flex items-center justify-end">
        <Link href="/login?reset=1" className="text-sm font-medium text-[var(--theme-text-secondary)] transition hover:text-[var(--theme-text-primary)]">
          Forgot password?
        </Link>
      </div>

      {state?.error ? <p className="text-sm text-[var(--color-danger)]">{state.error}</p> : null}

      <GlassButton type="submit" disabled={pending} className="w-full px-4 py-2">
        {pending ? "Working..." : "Sign in"}
      </GlassButton>
    </form>
  );
}

function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--theme-text-primary)]">
          Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-white/20 bg-white/55 px-3 py-2 text-sm text-[var(--theme-text-primary)] outline-none transition focus:border-[var(--theme-accent)]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--theme-text-primary)]">
          Password
        </span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-white/20 bg-white/55 px-3 py-2 text-sm text-[var(--theme-text-primary)] outline-none transition focus:border-[var(--theme-accent)]"
        />
        <p className="mt-1 text-xs text-[var(--theme-text-secondary)]">
          Use at least 6 characters.
        </p>
      </label>

      {state?.error ? <p className="text-sm text-[var(--color-danger)]">{state.error}</p> : null}

      <GlassButton type="submit" disabled={pending} className="w-full px-4 py-2">
        {pending ? "Creating account..." : "Create account"}
      </GlassButton>
    </form>
  );
}

function PasswordResetRequestForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);
  const [email, setEmail] = useState("");

  return (
    <GlassCard className="p-6">
      <form action={formAction}>
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

          <GlassButton type="submit" disabled={pending} className="w-full px-4 py-2">
            {pending ? "Sending..." : "Send reset link"}
          </GlassButton>
        </div>
      </form>
    </GlassCard>
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
    <GlassCard className="p-6">
      <form action={formAction}>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Set a new password
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Use the recovery link from your email to choose a new password.
        </p>

        <div className="mt-5 space-y-4">
          <input type="hidden" name="access_token" value={effectiveAccessToken ?? ""} />

            <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--theme-text-primary)]">
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

          <GlassButton type="submit" disabled={pending || !effectiveAccessToken} className="w-full px-4 py-2">
            {pending ? "Updating..." : "Update password"}
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  );
}

export function AuthForms({
  initialAccessToken,
  mode = "login",
}: {
  initialAccessToken?: string;
  mode?: "login" | "signup";
}) {
  const searchParams = useSearchParams();
  const resetMode = searchParams.get("reset") === "1";

  if (mode === "signup") {
    return (
      <div className="space-y-4">
        <GlassCard className="p-0">
          <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr]">
            <GlassCard className="border-white/20 bg-white/25 p-6 backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-[var(--theme-text-primary)]">Create account</h2>
              <p className="mt-2 text-sm text-[var(--theme-text-secondary)]">
                Create your account to manage envelopes, templates, and document activity.
              </p>
              <div className="mt-5">
                <SignupForm />
              </div>
            </GlassCard>

            <GlassCard className="flex flex-col justify-between gap-4 border-white/20 bg-white/20 p-6 backdrop-blur-xl">
              <div>
                <h3 className="text-lg font-semibold text-[var(--theme-text-primary)]">Already have an account?</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--theme-text-secondary)]">
                  Sign in to continue working in your workspace.
                </p>
              </div>
              <Link
                href="/login"
                className="text-sm font-medium text-[var(--theme-text-primary)] transition hover:opacity-80"
              >
                Back to sign in
              </Link>
            </GlassCard>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-0">
        <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr]">
          <GlassCard className="border-white/20 bg-white/25 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-[var(--theme-text-primary)]">Sign in</h2>
            <p className="mt-2 text-sm text-[var(--theme-text-secondary)]">
              Use your email and password to access your workspace.
            </p>
            <div className="mt-5">
              <AuthForm action={signIn} />
            </div>
          </GlassCard>

          <GlassCard className="flex flex-col justify-between gap-4 border-white/20 bg-white/20 p-6 backdrop-blur-xl">
            <div>
              <h3 className="text-lg font-semibold text-[var(--theme-text-primary)]">Need help?</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--theme-text-secondary)]">
                If you cannot remember your password, request a reset link below.
              </p>
            </div>
            <Link
              href="/signup"
              className="text-sm font-medium text-[var(--theme-text-primary)] transition hover:opacity-80"
            >
              Don&apos;t have an account? Create one
            </Link>
          </GlassCard>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <PasswordResetRequestForm />
        {resetMode ? <RecoveryPasswordForm initialAccessToken={initialAccessToken} /> : null}
      </div>
    </div>
  );
}
