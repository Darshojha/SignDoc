import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { TemplateField } from "@/lib/templates/types";
import { resolveSignerContextByToken } from "@/lib/envelopes/workflow";

export type SignatureMethod = "typed" | "drawn" | "uploaded";

export type CapturedSignature = {
  id: string;
  envelope_id: string;
  signer_id: string;
  field_id: string;
  image_data: string;
  method: SignatureMethod;
  signed_at: string;
  ip_address: string | null;
};

const SIGNATURE_SELECT =
  "id, envelope_id, signer_id, field_id, image_data, method, signed_at, ip_address";

function fieldBelongsToSigner(field: TemplateField, assignedRole: string) {
  return field.assigned_role === assignedRole;
}

function isSignableField(field: TemplateField) {
  return ["signature", "initials", "date", "text", "checkbox"].includes(field.field_type);
}

export async function getSignaturesForToken(token: string): Promise<CapturedSignature[]> {
  const context = await resolveSignerContextByToken(token);
  if (!context) return [];

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("signatures")
    .select(SIGNATURE_SELECT)
    .eq("signer_id", context.signer.id)
    .order("signed_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load signatures: ${error.message}`);
  }

  return (data ?? []) as CapturedSignature[];
}

export async function saveSignatureForToken(params: {
  token: string;
  fieldId: string;
  imageData: string;
  method: SignatureMethod;
  ipAddress?: string | null;
}): Promise<CapturedSignature> {
  if (!params.imageData) {
    throw new Error("Field value cannot be empty.");
  }

  const context = await resolveSignerContextByToken(params.token);
  if (!context) {
    throw new Error("This signing link is invalid or expired.");
  }
  if (!context.canSign) {
    throw new Error("This envelope is not ready for this signer.");
  }

  const document = context.envelope.document;
  if (!document) {
    throw new Error("Envelope has no document.");
  }

  const field = document.field_layout.find((candidate) => candidate.id === params.fieldId);
  if (!field) {
    throw new Error("This field does not exist on the document.");
  }
  if (!fieldBelongsToSigner(field, context.signer.assigned_role)) {
    throw new Error("You are not allowed to modify this field.");
  }
  if (field.field_type !== "signature" && field.field_type !== "initials") {
    if (params.imageData.startsWith("data:image/")) {
      throw new Error("Only signature/initials fields can contain image data.");
    }
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("signatures")
    .upsert(
      {
        envelope_id: context.envelope.id,
        signer_id: context.signer.id,
        field_id: params.fieldId,
        image_data: params.imageData,
        method: params.method,
        signed_at: now,
        ip_address: params.ipAddress ?? null,
      },
      { onConflict: "signer_id,field_id" },
    )
    .select(SIGNATURE_SELECT)
    .single();

  if (error) {
    if (error.code === "42501") {
      throw new Error("Permission denied — this signing link cannot save signatures.");
    }
    throw new Error(`Failed to save signature: ${error.message}`);
  }

  return data as CapturedSignature;
}

export async function deleteSignatureForToken(params: {
  token: string;
  fieldId: string;
}): Promise<void> {
  const context = await resolveSignerContextByToken(params.token);
  if (!context) {
    throw new Error("This signing link is invalid or expired.");
  }
  if (!context.canSign) {
    throw new Error("This envelope is not ready for this signer.");
  }

  const document = context.envelope.document;
  if (!document) {
    throw new Error("Envelope has no document.");
  }

  const field = document.field_layout.find((candidate) => candidate.id === params.fieldId);
  if (!field) {
    throw new Error("This field does not exist on the document.");
  }
  if (!fieldBelongsToSigner(field, context.signer.assigned_role)) {
    throw new Error("You are not allowed to modify this field.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("signatures")
    .delete()
    .eq("signer_id", context.signer.id)
    .eq("field_id", params.fieldId);

  if (error) {
    if (error.code === "42501") {
      throw new Error("Permission denied — this signing link cannot modify signatures.");
    }
    throw new Error(`Failed to delete signature: ${error.message}`);
  }
}

export function getRequiredSignatureFields(fields: TemplateField[], assignedRole: string) {
  return fields.filter(
    (field) => fieldBelongsToSigner(field, assignedRole) && isSignableField(field),
  );
}

export function allRequiredFieldsSigned(
  requiredFields: TemplateField[],
  captured: CapturedSignature[],
) {
  if (requiredFields.length === 0) return true;
  const signedIds = new Set(captured.map((entry) => entry.field_id));
  return requiredFields.every((field) => signedIds.has(field.id));
}
