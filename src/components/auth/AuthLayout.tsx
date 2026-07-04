import Link from "next/link";
import { ReactNode } from "react";
import { AmbientBackgroundMotion } from "@/components/ui/AmbientBackgroundMotion";
import { SignDocLogo } from "@/components/ui/SignDocLogo";
import { GlassCard } from "@/components/ui/glass/GlassCard";

type AuthLayoutProps = {
  title: string;
  description: string;
  switchHref: string;
  switchLabel: string;
  children: ReactNode;
};

export function AuthLayout({
  title,
  description,
  switchHref,
  switchLabel,
  children,
}: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-8 lg:px-12">
      <AmbientBackgroundMotion />
      <GlassCard className="relative z-10 w-full max-w-4xl border-white/20 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-10 lg:p-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <SignDocLogo className="h-10 w-10" />
            <div>
              <p className="text-lg font-semibold text-[var(--theme-text-primary)]">SignDoc</p>
              <p className="text-sm text-[var(--theme-text-secondary)]">Secure signing, refined.</p>
            </div>
          </div>
          <Link href={switchHref} className="text-sm font-medium text-[var(--theme-text-secondary)] transition hover:text-[var(--theme-text-primary)]">
            {switchLabel}
          </Link>
        </div>

        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-normal text-[var(--theme-text-primary)]">
            {title}
          </h1>
          <p className="mt-3 text-base leading-7 text-[var(--theme-text-secondary)]">
            {description}
          </p>
        </div>

        {children}
      </GlassCard>
    </main>
  );
}
