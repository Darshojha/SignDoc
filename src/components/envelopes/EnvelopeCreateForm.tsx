"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Template } from "@/lib/templates/types";

type SignerInput = {
  assigned_role: string;
  name: string;
  email: string;
  order_index: number;
};

const MIN_SIGNERS = 1;

function rolesForTemplate(template: Template | undefined) {
  if (!template) return [];
  return Array.from(new Set(template.field_layout.map((field) => field.assigned_role))).filter(Boolean);
}

export function EnvelopeCreateForm({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [title, setTitle] = useState(templates[0]?.name ?? "");
  const [signingOrder, setSigningOrder] = useState<"sequential" | "parallel">("sequential");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedTemplate = templates.find((template) => template.id === templateId);
  const roles = useMemo(() => rolesForTemplate(selectedTemplate), [selectedTemplate]);
  const [signersByRole, setSignersByRole] = useState<Record<string, SignerInput>>({});

  const signers = roles.map((role, index) => ({
    assigned_role: role,
    name: signersByRole[role]?.name ?? "",
    email: signersByRole[role]?.email ?? "",
    order_index: signersByRole[role]?.order_index ?? index + 1,
  }));

  function updateSigner(role: string, patch: Partial<SignerInput>) {
    setSignersByRole((prev) => ({
      ...prev,
      [role]: {
        assigned_role: role,
        name: prev[role]?.name ?? "",
        email: prev[role]?.email ?? "",
        order_index: prev[role]?.order_index ?? roles.indexOf(role) + 1,
        ...patch,
      },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/envelopes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          title,
          signing_order: signingOrder,
          signers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Could not create envelope.");
      }
      router.push(`/envelopes/${data.envelope.id}`);
    } catch (err) {
      setStatus("error");
      setErrorMessage((err as Error).message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="template" className="text-sm font-medium text-[var(--color-text-primary)]">
            Document template
          </label>
          <select
            id="template"
            value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value);
              const next = templates.find((template) => template.id === e.target.value);
              setTitle(next?.name ?? "");
            }}
            className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm font-medium text-[var(--color-text-primary)]">
            Envelope title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">Signing order</span>
        <div className="flex gap-2">
          {(["sequential", "parallel"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSigningOrder(mode)}
              className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium ${
                signingOrder === mode
                  ? "border-[var(--color-primary)] bg-indigo-50 text-[var(--color-primary-hover)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-text-primary)]"
              }`}
            >
              {mode === "sequential" ? "Sequential" : "Parallel"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Signers</h2>
        <div className="mt-3 grid gap-3">
          {roles.map((role, index) => (
            <div
              key={role}
              className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 sm:grid-cols-[1fr_1fr_90px]"
            >
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {role} name
                </label>
                <input
                  value={signersByRole[role]?.name ?? ""}
                  onChange={(e) => updateSigner(role, { name: e.target.value })}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Email
                </label>
                <input
                  type="email"
                  value={signersByRole[role]?.email ?? ""}
                  onChange={(e) => updateSigner(role, { email: e.target.value })}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={signersByRole[role]?.order_index ?? index + 1}
                  onChange={(e) => updateSigner(role, { order_index: Number(e.target.value) })}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
          ))}
        </div>
        {roles.length === 0 && (
          <p className="mt-3 rounded-[var(--radius-sm)] bg-amber-50 px-3 py-2 text-sm text-[var(--color-warning)]">
            This template has no fields yet. Place fields before creating an envelope.
          </p>
        )}
      </div>

      {errorMessage && (
        <p className="rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
      disabled={status === "saving" || roles.length < MIN_SIGNERS}
        className="w-fit rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "saving" ? "Creating..." : "Create envelope"}
      </button>
    </form>
  );
}
