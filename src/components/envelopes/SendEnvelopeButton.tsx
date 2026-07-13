"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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

export function SendEnvelopeButton({
  envelopeId,
  disabled,
}: {
  envelopeId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [links, setLinks] = useState<SignerLink[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/envelopes/${envelopeId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not send envelope.");
      setLinks(data.signer_links ?? []);
      setStatus("sent");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage((err as Error).message);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSend}>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Emails the invitation to each configured signer.
      </p>
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
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Signing links</p>
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
