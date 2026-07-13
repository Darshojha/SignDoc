"use client";

import { useState, useEffect, useOptimistic } from "react";
import type { Template } from "@/lib/templates/types";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { alertClass, textClass } from "@/lib/status";

type Toast = {
  id: string;
  message: React.ReactNode;
  type: "success" | "error";
};

type TemplateListProps = {
  initialTemplates: Template[];
};

type BulkSendJob = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{ email: string; status: "sent" | "failed"; error?: string }>;
};

export function TemplateList({ initialTemplates }: TemplateListProps) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [optimisticTemplates, setOptimisticTemplates] = useOptimistic(
    templates,
    (state, newTemplate: Template) => [newTemplate, ...state],
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [bulkSendJobId, setBulkSendJobId] = useState<string | null>(null);
  const [bulkSendStatus, setBulkSendStatus] = useState<BulkSendJob | null>(null);
  const [progressPoll, setProgressPoll] = useState<NodeJS.Timeout | null>(null);
  const [bulkTemplate, setBulkTemplate] = useState<Template | null>(null);
  const [bulkRecipientsText, setBulkRecipientsText] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  function addToast(message: React.ReactNode, type: Toast["type"]) {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (type === "success") {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    }
  }

  async function handleDuplicate(template: Template) {
    setLoadingId(template.id);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/v1/templates/${template.id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to duplicate template.");
      }
      const duplicated: Template = data.template;
      setOptimisticTemplates(duplicated);
      setTemplates((prev) => [duplicated, ...prev]);
      addToast("Template duplicated successfully.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to duplicate template.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  function startInlineRename(template: Template) {
    setEditingId(template.id);
    setEditingName(template.name);
    setMenuOpenId(null);
  }

  async function saveInlineRename(template: Template) {
    const trimmed = editingName.trim();
    if (trimmed === template.name || trimmed.length === 0) {
      setEditingId(null);
      return;
    }

    setLoadingId(template.id);
    setEditingId(null);
    try {
      const res = await fetch(`/api/v1/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to rename template.");
      }
      const updated: Template = data.template;
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      addToast("Template renamed.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to rename template.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(template: Template) {
    const confirmed = window.confirm(`Delete "${template.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setLoadingId(template.id);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/v1/templates/${template.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "Failed to delete template.");
      }
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      addToast("Template deleted.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete template.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  function openBulkSend(template: Template) {
    setMenuOpenId(null);
    setBulkRecipientsText("");
    setBulkTemplate(template);
  }

  // One recipient per line: "email" or "Name, email" (order-independent — the part
  // containing @ is treated as the email).
  function parseRecipients(text: string) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((part) => part.trim()).filter(Boolean);
        const email = parts.find((part) => part.includes("@")) ?? "";
        const name = parts.find((part) => !part.includes("@"));
        return { email, name };
      })
      .filter((recipient) => recipient.email.includes("@"));
  }

  async function submitBulkSend() {
    if (!bulkTemplate) return;
    const recipients = parseRecipients(bulkRecipientsText);
    if (recipients.length === 0) {
      addToast("Enter at least one recipient email.", "error");
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await fetch(`/api/v1/templates/${bulkTemplate.id}/bulk-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Bulk send failed.");
      }
      setBulkTemplate(null);
      if (data.jobId) {
        setBulkSendJobId(data.jobId);
        startBulkSendPoll(data.jobId);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Bulk send failed.", "error");
    } finally {
      setBulkSubmitting(false);
    }
  }

  function startBulkSendPoll(jobId: string) {
    if (progressPoll) clearInterval(progressPoll);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/bulk-send/${jobId}`);
        if (!res.ok) throw new Error("Failed to poll bulk send status");
        const data = await res.json();
        setBulkSendStatus(data.job);
        if (data.job.status === "completed" || data.job.status === "failed") {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 1000);
    setProgressPoll(interval);
  }

  function closeBulkSend() {
    if (progressPoll) clearInterval(progressPoll);
    setProgressPoll(null);
    setBulkSendJobId(null);
    setBulkSendStatus(null);
  }

  return (
    <div className="relative">
      <ul className="grid gap-3">
        {optimisticTemplates.map((template) => (
          <li key={template.id}>
            <GlassCard interactive className="p-0">
              <div className="flex items-center justify-between rounded-[var(--radius-lg)] px-5 py-4">
                <div className="flex-1">
                  {editingId === template.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => saveInlineRename(template)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveInlineRename(template);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-primary)] px-3 py-1 text-sm outline-none"
                      autoFocus
                    />
                  ) : (
                    <p
                      className="font-medium text-[var(--color-text-primary)]"
                      onDoubleClick={() => startInlineRename(template)}
                    >
                      {template.name}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {template.page_count} page{template.page_count === 1 ? "" : "s"} · {template.field_layout.length} field
                    {template.field_layout.length === 1 ? "" : "s"} placed
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/templates/${template.id}/edit`}
                    className="rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-primary-hover)]"
                  >
                    Edit
                  </a>
                  <div className="relative">
                    <GlassButton
                      variant="ghost"
                      className="px-2 py-1 text-sm"
                      onClick={() => setMenuOpenId(menuOpenId === template.id ? null : template.id)}
                      disabled={loadingId === template.id}
                    >
                      •••
                    </GlassButton>
                    {menuOpenId === template.id && (
                      <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white py-1 shadow-[var(--shadow-card)]">
                        <button
                          type="button"
                          onClick={() => startInlineRename(template)}
                          className="block w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-black/5"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(template)}
                          className="block w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-black/5"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => openBulkSend(template)}
                          className="block w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-black/5"
                        >
                          Bulk send
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(template)}
                          className="block w-full px-4 py-2 text-left text-sm text-[var(--color-danger)] hover:bg-black/5"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          </li>
        ))}
      </ul>

      {bulkTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setBulkTemplate(null)}>
          <GlassCard className="w-full max-w-lg p-6" >
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Bulk send “{bulkTemplate.name}”</h2>
                <button type="button" onClick={() => setBulkTemplate(null)} className="text-xs text-[var(--color-danger)]">
                  Close
                </button>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                One recipient per line. Use <code>email</code> or <code>Name, email</code>. Each gets their own copy to sign.
              </p>
              <textarea
                value={bulkRecipientsText}
                onChange={(e) => setBulkRecipientsText(e.target.value)}
                rows={6}
                placeholder={"alex@example.com\nJordan Lee, jordan@example.com"}
                className="mt-3 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-2">
                <GlassButton type="button" variant="ghost" className="px-4 py-2" onClick={() => setBulkTemplate(null)}>
                  Cancel
                </GlassButton>
                <GlassButton type="button" className="px-4 py-2" onClick={submitBulkSend} disabled={bulkSubmitting}>
                  {bulkSubmitting ? "Sending…" : "Send to recipients"}
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {bulkSendStatus && (
        <GlassCard className="fixed bottom-4 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Bulk send</p>
            <button type="button" onClick={closeBulkSend} className="text-xs text-[var(--color-danger)]">
              Close
            </button>
          </div>
          <div className="mt-3 h-2 rounded-full bg-black/5">
            <div
              className="h-2 rounded-full bg-[var(--color-primary)] transition-all"
              style={{ width: `${bulkSendStatus.total === 0 ? 0 : (bulkSendStatus.processed / bulkSendStatus.total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            {bulkSendStatus.processed}/{bulkSendStatus.total} processed · {bulkSendStatus.succeeded} sent · {bulkSendStatus.failed} failed
          </p>
          <div className="mt-3 max-h-40 overflow-y-auto grid gap-1">
            {bulkSendStatus.results.map((result) => (
              <div key={result.email} className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-primary)]">{result.email}</span>
                <span className={result.status === "sent" ? textClass("success") : textClass("error")}>
                  {result.status}{result.error ? `: ${result.error}` : ""}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 grid gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-[var(--radius-md)] px-4 py-3 text-sm shadow-[var(--shadow-card)] ${
                toast.type === "success" ? alertClass("success") : alertClass("error")
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}