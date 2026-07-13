"use client";

import { usePathname } from "next/navigation";
import { GlassNavItem } from "@/components/ui/glass/GlassNavItem";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { signOut } from "@/app/(dashboard)/settings/actions";

const NAV_ITEMS = [
  { href: "/envelopes", label: "Envelopes" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar({ userName, userEmail }: { userName?: string; userEmail?: string }) {
  const pathname = usePathname();
  const displayName = userName?.trim() || userEmail || "Account";

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-2 border-r border-[var(--color-border)] bg-[color:var(--theme-surface)]/80 p-4 backdrop-blur-xl">
      <div className="mb-2 px-2 text-lg font-semibold text-[var(--color-text-primary)]">
        SignDoc
      </div>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <GlassNavItem
            key={item.href}
            href={item.href}
            active={isActive}
            className="w-full justify-start"
          >
            {item.label}
          </GlassNavItem>
        );
      })}

      <div className="mt-auto flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
        <div className="px-2">
          <p className="truncate text-sm font-medium text-[var(--color-text-primary)]" title={displayName}>
            {displayName}
          </p>
          {userEmail && userName?.trim() ? (
            <p className="truncate text-xs text-[var(--color-text-secondary)]" title={userEmail}>
              {userEmail}
            </p>
          ) : null}
        </div>
        <form action={signOut}>
          <GlassButton type="submit" variant="ghost" className="w-full justify-start px-3 py-2 text-sm">
            Sign out
          </GlassButton>
        </form>
      </div>
    </aside>
  );
}
