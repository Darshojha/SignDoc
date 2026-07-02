import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const ENVELOPES_BUCKET = "envelopes";

export function envelopeOriginalPath(envelopeId: string, documentName = "document.pdf") {
  return `${envelopeId}/original/${documentName}`;
}

export function envelopeSignedPath(envelopeId: string, documentName = "document.pdf") {
  return `${envelopeId}/signed/${documentName}`;
}

export async function copyTemplateToEnvelope(params: {
  templateStoragePath: string;
  envelopeId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const source = await supabase.storage.from("templates").download(params.templateStoragePath);
  if (source.error || !source.data) {
    throw new Error(`Failed to read template PDF: ${source.error?.message ?? "unknown error"}`);
  }

  const bytes = new Uint8Array(await source.data.arrayBuffer());
  const path = envelopeOriginalPath(params.envelopeId);
  const upload = await supabase.storage
    .from(ENVELOPES_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });

  if (upload.error) {
    throw new Error(`Failed to copy document into envelope storage: ${upload.error.message}`);
  }

  return path;
}

export async function uploadSignedEnvelopePdf(envelopeId: string, bytes: Uint8Array) {
  const supabase = createSupabaseAdminClient();
  const path = envelopeSignedPath(envelopeId);
  const { error } = await supabase.storage
    .from(ENVELOPES_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });

  if (error) {
    throw new Error(`Failed to upload signed PDF: ${error.message}`);
  }

  return path;
}

export async function downloadEnvelopePdf(storagePath: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(ENVELOPES_BUCKET).download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download envelope PDF: ${error?.message ?? "unknown error"}`);
  }

  return new Uint8Array(await data.arrayBuffer());
}

export async function getEnvelopeSignedUrl(storagePath: string, expiresInSeconds = 600) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(ENVELOPES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Failed to create envelope signed URL: ${error?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
}
