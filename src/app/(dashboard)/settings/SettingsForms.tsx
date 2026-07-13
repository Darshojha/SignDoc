"use client";

import { useActionState } from "react";
import { changePassword, updateProfile, signOut } from "./actions";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassCard } from "@/components/ui/glass/GlassCard";

const inputClass =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/70 px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]";

function ProfileForm({ email, fullName }: { email: string; fullName: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined);

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Profile</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Your display name appears on activity and outgoing envelopes.
      </p>
      <form action={formAction} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Email</span>
          <input value={email} disabled className={`${inputClass} opacity-60`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Display name</span>
          <input name="full_name" defaultValue={fullName} maxLength={80} className={inputClass} />
        </label>
        {state?.error ? <p className="text-sm text-[var(--color-danger)]">{state.error}</p> : null}
        {state?.message ? <p className="text-sm text-[var(--color-success)]">{state.message}</p> : null}
        <GlassButton type="submit" disabled={pending} className="px-4 py-2">
          {pending ? "Saving..." : "Save profile"}
        </GlassButton>
      </form>
    </GlassCard>
  );
}

function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Password</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Choose a new password for your account.</p>
      <form action={formAction} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">New password</span>
          <input name="password" type="password" autoComplete="new-password" minLength={6} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Confirm password</span>
          <input name="confirm_password" type="password" autoComplete="new-password" minLength={6} className={inputClass} />
        </label>
        {state?.error ? <p className="text-sm text-[var(--color-danger)]">{state.error}</p> : null}
        {state?.message ? <p className="text-sm text-[var(--color-success)]">{state.message}</p> : null}
        <GlassButton type="submit" disabled={pending} className="px-4 py-2">
          {pending ? "Updating..." : "Update password"}
        </GlassButton>
      </form>
    </GlassCard>
  );
}

export function SettingsForms({ email, fullName }: { email: string; fullName: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ProfileForm email={email} fullName={fullName} />
      <PasswordForm />
      <GlassCard className="p-6 lg:col-span-2">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Session</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Sign out of this workspace on this device.</p>
        <form action={signOut} className="mt-4">
          <GlassButton type="submit" variant="ghost" className="px-4 py-2">
            Sign out
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
