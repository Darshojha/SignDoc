// Theme-aware status badge classes. Returns only color-related classes so callers
// can append their own structural/rounded classes. Works in light and dark themes.
export function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "SIGNED" || s === "COMPLETED") {
    return "bg-[var(--status-success-bg)] text-[var(--status-success-text)]";
  }
  if (s === "DECLINED" || s === "VOIDED") {
    return "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]";
  }
  if (s === "PENDING" || s === "DRAFT") {
    return "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]";
  }
  return "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]";
}

// Soft alert surface (error/success/info banners) that stays readable in both themes.
export function alertClass(kind: "error" | "success" | "warning"): string {
  if (kind === "error") return "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]";
  if (kind === "success") return "bg-[var(--status-success-bg)] text-[var(--status-success-text)]";
  return "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]";
}

export function textClass(kind: "error" | "success" | "warning"): string {
  if (kind === "error") return "text-[var(--color-danger)]";
  if (kind === "success") return "text-[var(--color-success)]";
  return "text-[var(--color-warning)]";
}