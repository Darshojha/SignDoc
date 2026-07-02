import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const TEMPLATES_BUCKET = "templates";
export const MAX_TEMPLATE_FILE_BYTES = 25 * 1024 * 1024; // 25MB, per document-storage skill

export function templateStoragePath(templateId: string) {
  return `${templateId}/source.pdf`;
}

export async function uploadTemplateSource(templateId: string, bytes: Uint8Array) {
  const supabase = createSupabaseAdminClient();
  const path = templateStoragePath(templateId);
  const { error } = await supabase.storage
    .from(TEMPLATES_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });

  if (error) {
    throw new Error(`Failed to upload template source: ${error.message}`);
  }

  return path;
}

export async function deleteTemplateSource(templateId: string) {
  const supabase = createSupabaseAdminClient();
  await supabase.storage.from(TEMPLATES_BUCKET).remove([templateStoragePath(templateId)]);
}

// Short-lived signed URL, regenerated on each page load per document-storage skill
// (never make the bucket public, never reuse/cache a long-lived link).
export async function getTemplateSignedUrl(storagePath: string, expiresInSeconds = 600) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(TEMPLATES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
}
