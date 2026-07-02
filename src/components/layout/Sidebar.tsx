import Link from "next/link";

const NAV_ITEMS = [
  { href: "/envelopes", label: "Envelopes" },
  { href: "/templates", label: "Templates" },
];

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-4 px-2 text-lg font-semibold text-[var(--color-text-primary)]">
        SignDoc
      </div>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[#F5F5F4]"
        >
          {item.label}
        </Link>
      ))}
    </aside>
  );
}
