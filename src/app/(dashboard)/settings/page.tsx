import { requireServerUser } from "@/lib/auth/server";
import { SettingsForms } from "./SettingsForms";
import { AmbientBackgroundMotion } from "@/components/ui/AmbientBackgroundMotion";
import { GlassCard } from "@/components/ui/glass/GlassCard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireServerUser();
  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <AmbientBackgroundMotion />
      <div className="relative z-10 mx-auto max-w-4xl">
        <GlassCard className="p-6">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Account settings</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Manage your profile, password, and session.
          </p>
        </GlassCard>
        <div className="mt-8">
          <SettingsForms email={user.email ?? ""} fullName={fullName} />
        </div>
      </div>
    </div>
  );
}
