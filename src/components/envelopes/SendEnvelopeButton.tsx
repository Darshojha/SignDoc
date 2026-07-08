"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import type { SignerLink } from "@/lib/envelopes/types";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassCard } from "@/components/ui/glass/GlassCard";

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <GlassButton
      type="button"
      onClick={handleCopy}
      variant="ghost"
      className="mt-2 px-3 py-1 text-xs"
    >
      {copied ? "Copied" : "Copy signing link"}
    </GlassButton>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function SendEnvelopeButton({
  envelopeId,
  disabled,
}: {
  envelopeId: string;
  disabled: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [links, setLinks] = useState<SignerLink[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [rawInput, setRawInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [invalidEmails, setInvalidEmails] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  function parseAndValidate(next: string) {
    setRawInput(next);
    if (!touched) return;

    const parts = next
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const valid: string[] = [];
    const invalid: string[] = [];

    for (const part of parts) {
      if (isValidEmail(part)) {
        if (!valid.includes(part)) valid.push(part);
      } else {
        invalid.push(part);
      }
    }

    setEmails(valid);
    setInvalidEmails(invalid);
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((item) => item !== email));
    setInvalidEmails((prev) => prev.filter((item) => item !== email));
    setRawInput((prev) => {
      const parts = prev
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      const next = parts.filter((item) => item !== email).join(", ");
      return next;
    });
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    setTouched(true);

    const parts = rawInput
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const valid: string[] = [];
    const invalid: string[] = [];

    for (const part of parts) {
      if (isValidEmail(part)) {
        if (!valid.includes(part)) valid.push(part);
      } else {
        invalid.push(part);
      }
    }

    setEmails(valid);
    setInvalidEmails(invalid);

    if (invalid.length > 0) return;

    setStatus("sending");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/envelopes/${envelopeId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: valid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not send envelope.");
      setLinks(data.signer_links);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMessage((err as Error).message);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSend}>
      <label className="flex flex-col gap-1 text-sm text-[color:var(--theme-text-primary)]">
        <span className="text-xs font-medium text-[var(--theme-text-secondary)]">Signer emails</span>
        <textarea
          value={rawInput}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => parseAndValidate(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="alex@example.com, jordan@example.com"
          rows={3}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary)]"
        />
      </label>

      {touched && invalidEmails.length > 0 && (
        <p className="text-xs text-[var(--color-danger)]">
          Invalid emails: {invalidEmails.join(", ")}
        </p>
      )}

      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs text-[var(--color-text-primary)]"
            >
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="text-[var(--color-danger)]"
                aria-label={`Remove ${email}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <GlassButton
        type="submit"
        disabled={disabled || status === "sending" || status === "sent"}
        className="px-4 py-2"
      >
        {status === "sending" ? "Sending..." : status === "sent" ? "Sent" : "Send envelope"}
      </GlassButton>
      {errorMessage && <p className="text-sm text-[var(--color-danger)]">{errorMessage}</p>}
      {links.length > 0 && (
        <GlassCard className="w-full max-w-xl p-4 text-left">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Magic links for testing</p>
          <div className="mt-3 grid gap-2">
            {links.map((link) => (
              <div key={link.signer_id} className="text-xs text-[var(--color-text-secondary)]">
                <p className="font-medium text-[var(--color-text-primary)]">
                  {link.signer_name} ({link.assigned_role})
                </p>
                <a
                  href={link.url}
                  className="break-all text-[var(--color-primary-hover)] underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.url}
                </a>
                <CopyLinkButton url={link.url} />
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </form>
  );
}