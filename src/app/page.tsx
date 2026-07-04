import Link from "next/link";
import { SignDocLogo } from "@/components/ui/SignDocLogo";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { AmbientBackgroundMotion } from "@/components/ui/AmbientBackgroundMotion";
import { GlassCard } from "@/components/ui/glass/GlassCard";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-8 lg:px-12">
      <AmbientBackgroundMotion />
      <GlassCard className="relative z-10 w-full max-w-5xl border-white/20 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-10 lg:p-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <SignDocLogo className="h-10 w-10" />
            <div>
              <p className="text-lg font-semibold text-[var(--theme-text-primary)]">SignDoc</p>
              <p className="text-sm text-[var(--theme-text-secondary)]">Secure signing, refined.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <GlassButton variant="ghost" className="px-4 py-2">
                Login
              </GlassButton>
            </Link>
            <Link href="/signup">
              <GlassButton className="px-4 py-2">
                Signup
              </GlassButton>
            </Link>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center text-center">
          <div className="rounded-full border border-white/20 bg-white/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl">
            <SignDocLogo className="h-16 w-16" />
          </div>
          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-[var(--theme-text-primary)] sm:text-5xl">
            Sign documents with calm confidence.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--theme-text-secondary)]">
            Create, send, and track signatures in a polished workspace designed for modern teams.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login">
              <GlassButton className="px-6 py-3 text-base">
                Get started
              </GlassButton>
            </Link>
            <Link href="/login">
              <GlassButton variant="ghost" className="px-6 py-3 text-base">
                Sign in
              </GlassButton>
            </Link>
          </div>
        </div>
      </GlassCard>
    </main>
  );
}
