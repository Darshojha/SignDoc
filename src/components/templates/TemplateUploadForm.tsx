"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassCard } from "@/components/ui/glass/GlassCard";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function TemplateUploadForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFileChange(selected: File | null) {
    setErrorMessage(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.type !== "application/pdf") {
      setErrorMessage("Only PDF files are supported.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setErrorMessage("File exceeds the 25MB limit.");
      setFile(null);
      return;
    }
    setFile(selected);
    if (!name) {
      setName(selected.name.replace(/\.pdf$/i, ""));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name.trim()) return;

    setStatus("uploading");
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("file", file);

    try {
      const res = await fetch("/api/v1/templates", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data?.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      router.push(`/templates/${data.template.id}/edit`);
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach the server. Please try again.");
    }
  }

  const isUploading = status === "uploading";

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
      <GlassCard className="flex flex-col gap-5 p-6">

      <div className="flex flex-col gap-2">
        <label htmlFor="template-name" className="text-sm font-medium text-[var(--color-text-primary)]">
          Template name
        </label>
        <input
          id="template-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Contractor Agreement"
          disabled={isUploading}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="template-file" className="text-sm font-medium text-[var(--color-text-primary)]">
          PDF document
        </label>
        <input
          id="template-file"
          type="file"
          accept="application/pdf"
          disabled={isUploading}
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[#F5F5F4] file:px-3 file:py-1.5 file:text-sm"
        />
        <p className="text-xs text-[var(--color-text-secondary)]">PDF only, up to 25MB.</p>
      </div>

      {errorMessage && (
        <p className="rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </p>
      )}

      <GlassButton
        type="submit"
        disabled={!file || !name.trim() || isUploading}
        className="w-fit px-4 py-2"
      >
        {isUploading ? "Uploading…" : "Upload and continue"}
      </GlassButton>
      </GlassCard>
    </form>
  );
}
