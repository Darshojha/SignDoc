import { ReactNode } from "react";
import { AmbientBackgroundMotion } from "@/components/ui/AmbientBackgroundMotion";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { SignDocLogo } from "@/components/ui/SignDocLogo";

type BaseLayoutProps = {
  children: ReactNode;
  maxWidth?: string;
  title?: string;
  description?: string;
};

export function BaseLayout({
  children,
  maxWidth = "max-w-5xl",
  title,
  description,
}: BaseLayoutProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-8 lg:px-12">
      <AmbientBackgroundMotion />
      <GlassCard className={`relative z-10 w-full ${maxWidth} border-white/20 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-10 lg:p-12`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <SignDocLogo className="h-10 w-10" />
            <div>
              <p className="text-lg font-semibold text-[var(--theme-text-primary)]">SignDoc</p>
              <p className="text-sm text-[var(--theme-text-secondary)]">Secure signing, refined.</p>
            </div>
          </div>
          {title && description && (
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-[var(--theme-text-secondary)]">{description}</p>
            </div>
          )}
        </div>

        <div className="mt-16">
          {children}
        </div>
      </GlassCard>
    </main>
  );
}