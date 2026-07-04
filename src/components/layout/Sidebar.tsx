"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlassNavItem } from "@/components/ui/glass/GlassNavItem";

const NAV_ITEMS = [
  { href: "/envelopes", label: "Envelopes" },
  { href: "/templates", label: "Templates" },
];

export function Sidebar() {
  const pathname = usePathname();

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
      <Link href="/" className="mt-4 px-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]">
        Back to home
      </Link>
    </aside>
  );
}
