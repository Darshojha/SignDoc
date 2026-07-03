"use client";

import { useState } from "react";
import type { SignerLink } from "@/lib/envelopes/types";

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
    >
      {copied ? "Copied" : "Copy signing link"}
    </button>
  );
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

  async function handleSend() {
    setStatus("sending");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/envelopes/${envelopeId}/send`, { method: "POST" });
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
    <div className="flex flex-col items-end gap-3">
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || status === "sending" || status === "sent"}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "sending" ? "Sending..." : status === "sent" ? "Sent" : "Send envelope"}
      </button>
      {errorMessage && <p className="text-sm text-[var(--color-danger)]">{errorMessage}</p>}
      {links.length > 0 && (
        <div className="w-full max-w-xl rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 text-left shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Magic links for testing
          </p>
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
        </div>
      )}
    </div>
  );
}
