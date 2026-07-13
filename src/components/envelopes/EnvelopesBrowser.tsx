"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Envelope, EnvelopeStatus } from "@/lib/envelopes/types";
import { statusBadgeClass } from "@/lib/status";
import { GlassCard } from "@/components/ui/glass/GlassCard";

type Group = "all" | "draft" | "in_progress" | "completed" | "closed";

const GROUP_STATUSES: Record<Exclude<Group, "all">, EnvelopeStatus[]> = {
  draft: ["DRAFT"],
  in_progress: ["SENT", "VIEWED", "PARTIALLY_SIGNED"],
  completed: ["COMPLETED"],
  closed: ["DECLINED", "VOIDED", "EXPIRED"],
};

function groupOf(status: EnvelopeStatus): Exclude<Group, "all"> {
  if (status === "DRAFT") return "draft";
  if (status === "COMPLETED") return "completed";
  if (status === "DECLINED" || status === "VOIDED" || status === "EXPIRED") return "closed";
  return "in_progress";
}

const FILTERS: { key: Group; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "closed", label: "Closed" },
];

export function EnvelopesBrowser({ envelopes }: { envelopes: Envelope[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Group>("all");

  const counts = useMemo(() => {
    const base = { all: envelopes.length, draft: 0, in_progress: 0, completed: 0, closed: 0 };
    for (const env of envelopes) base[groupOf(env.status)] += 1;
    return base;
  }, [envelopes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return envelopes.filter((env) => {
      if (filter !== "all" && !GROUP_STATUSES[filter].includes(env.status)) return false;
      if (q && !env.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [envelopes, query, filter]);

  return (
    <div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-[var(--radius-md)] border p-3 text-left transition ${
              filter === key
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
            }`}
          >
            <span className="block text-2xl font-semibold text-[var(--color-text-primary)]">
              {counts[key]}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search envelopes by title…"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/70 px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
        />
      </div>

      {filtered.length === 0 ? (
        <GlassCard className="mt-6 px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
          No envelopes match your search.
        </GlassCard>
      ) : (
        <ul className="mt-4 grid gap-3">
          {filtered.map((envelope) => (
            <li key={envelope.id}>
              <GlassCard interactive className="p-0">
                <Link
                  href={`/envelopes/${envelope.id}`}
                  className="flex items-center justify-between rounded-[var(--radius-lg)] px-5 py-4"
                >
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{envelope.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {envelope.signing_order} signing · updated{" "}
                      {new Date(envelope.updated_at).toLocaleDateString("en-US")}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(envelope.status)}`}>
                    {envelope.status}
                  </span>
                </Link>
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
