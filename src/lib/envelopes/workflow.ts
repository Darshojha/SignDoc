import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getTemplateById } from "@/lib/templates/db";
import type { TemplateField } from "@/lib/templates/types";
import { sendSignerInvitationEmail } from "@/lib/notifications";
import {
  copyTemplateToEnvelope,
  downloadEnvelopePdf,
  getEnvelopeSignedUrl,
  uploadSignedEnvelopePdf,
} from "@/lib/envelopes/storage";
import { deriveSignerToken, hashSignerToken } from "@/lib/envelopes/tokens";
import type {
  Envelope,
  EnvelopeDocument,
  EnvelopeEvent,
  EnvelopeSigner,
  EnvelopeStatus,
  EnvelopeWithDetails,
  SignerLink,
  SigningOrder,
} from "@/lib/envelopes/types";

type EnvelopeRow = Omit<Envelope, "status" | "signing_order"> & {
  status: EnvelopeStatus;
  signing_order: SigningOrder;
};

const ENVELOPE_SELECT =
  "id, template_id, title, status, signing_order, created_at, updated_at, sent_at, completed_at, expires_at";

const SIGNER_SELECT =
  "id, envelope_id, name, user_email, assigned_role, order_index, status, access_token_expires_at, viewed_at, signed_at, signature_text, created_at";

const DOCUMENT_SELECT =
  "id, envelope_id, template_id, storage_path, signed_storage_path, page_count, field_layout, created_at";

const EVENT_SELECT = "id, envelope_id, actor, event_type, timestamp, metadata";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^/, "https://") ||
    "http://localhost:3000"
  );
}

export function isEnvelopeTerminal(status: EnvelopeStatus) {
  return status === "COMPLETED" || status === "DECLINED" || status === "VOIDED" || status === "EXPIRED";
}

function toEnvelope(row: EnvelopeRow): Envelope {
  return row;
}

function toEnvelopeDocument(row: EnvelopeDocument): EnvelopeDocument {
  return {
    ...row,
    field_layout: row.field_layout ?? [],
  };
}

async function logEnvelopeEvent(params: {
  envelopeId: string;
  actor: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("envelope_events").insert({
    envelope_id: params.envelopeId,
    actor: params.actor,
    event_type: params.eventType,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to log envelope event: ${error.message}`);
  }
}

async function updateEnvelopeStatus(params: {
  envelopeId: string;
  status: EnvelopeStatus;
  actor: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("envelopes")
    .update({
      status: params.status,
      updated_at: new Date().toISOString(),
      ...(params.extra ?? {}),
    })
    .eq("id", params.envelopeId);

  if (error) {
    throw new Error(`Failed to update envelope status: ${error.message}`);
  }

  await logEnvelopeEvent({
    envelopeId: params.envelopeId,
    actor: params.actor,
    eventType: params.eventType,
    metadata: { status: params.status, ...(params.metadata ?? {}) },
  });
}

export async function listEnvelopes(): Promise<Envelope[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("envelopes")
    .select(ENVELOPE_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list envelopes: ${error.message}`);
  }

  return (data as EnvelopeRow[]).map(toEnvelope);
}

export async function getEnvelopeDetails(id: string): Promise<EnvelopeWithDetails | null> {
  const supabase = createSupabaseAdminClient();
  const [envelopeRes, documentRes, signersRes, eventsRes] = await Promise.all([
    supabase.from("envelopes").select(ENVELOPE_SELECT).eq("id", id).maybeSingle(),
    supabase.from("envelope_documents").select(DOCUMENT_SELECT).eq("envelope_id", id).maybeSingle(),
    supabase.from("envelope_signers").select(SIGNER_SELECT).eq("envelope_id", id).order("order_index"),
    supabase
      .from("envelope_events")
      .select(EVENT_SELECT)
      .eq("envelope_id", id)
      .order("timestamp", { ascending: true }),
  ]);

  if (envelopeRes.error) throw new Error(`Failed to load envelope: ${envelopeRes.error.message}`);
  if (!envelopeRes.data) return null;
  if (documentRes.error) throw new Error(`Failed to load envelope document: ${documentRes.error.message}`);
  if (signersRes.error) throw new Error(`Failed to load signers: ${signersRes.error.message}`);
  if (eventsRes.error) throw new Error(`Failed to load envelope events: ${eventsRes.error.message}`);

  return {
    ...toEnvelope(envelopeRes.data as EnvelopeRow),
    document: documentRes.data ? toEnvelopeDocument(documentRes.data as EnvelopeDocument) : null,
    signers: (signersRes.data ?? []) as EnvelopeSigner[],
    events: (eventsRes.data ?? []) as EnvelopeEvent[],
  };
}

function uniqueRoles(fields: TemplateField[]) {
  return Array.from(new Set(fields.map((field) => field.assigned_role).filter(Boolean)));
}

export async function createEnvelopeFromTemplate(params: {
  templateId: string;
  title: string;
  signingOrder: SigningOrder;
  signers: Array<{ name: string; email: string; assignedRole: string; orderIndex: number }>;
}) {
  const template = await getTemplateById(params.templateId);
  if (!template) throw new Error("Template not found.");
  if (template.field_layout.length === 0) {
    throw new Error("Place at least one field on this template before creating an envelope.");
  }

  const requiredRoles = uniqueRoles(template.field_layout);
  const signerRoles = new Set(params.signers.map((signer) => signer.assignedRole));
  const missingRoles = requiredRoles.filter((role) => !signerRoles.has(role));
  if (missingRoles.length > 0) {
    throw new Error(`Missing signer for role: ${missingRoles.join(", ")}`);
  }

  const supabase = createSupabaseAdminClient();
  const envelopeId = crypto.randomUUID();
  const storagePath = await copyTemplateToEnvelope({
    templateStoragePath: template.storage_path,
    envelopeId,
  });

  const envelopeInsert = await supabase
    .from("envelopes")
    .insert({
      id: envelopeId,
      template_id: template.id,
      title: params.title,
      signing_order: params.signingOrder,
    })
    .select(ENVELOPE_SELECT)
    .single();

  if (envelopeInsert.error || !envelopeInsert.data) {
    throw new Error(`Failed to create envelope: ${envelopeInsert.error?.message ?? "unknown error"}`);
  }

  const documentInsert = await supabase.from("envelope_documents").insert({
    envelope_id: envelopeId,
    template_id: template.id,
    storage_path: storagePath,
    page_count: template.page_count,
    field_layout: template.field_layout,
  });

  if (documentInsert.error) {
    throw new Error(`Failed to create envelope document: ${documentInsert.error.message}`);
  }

  const signerInsert = await supabase.from("envelope_signers").insert(
    params.signers.map((signer) => ({
      envelope_id: envelopeId,
      name: signer.name,
      user_email: signer.email,
      assigned_role: signer.assignedRole,
      order_index: signer.orderIndex,
    })),
  );

  if (signerInsert.error) {
    throw new Error(`Failed to create envelope signers: ${signerInsert.error.message}`);
  }

  await logEnvelopeEvent({
    envelopeId,
    actor: "system",
    eventType: "envelope.created",
    metadata: { status: "DRAFT" },
  });

  return getEnvelopeDetails(envelopeId);
}

export async function sendEnvelope(id: string): Promise<SignerLink[]> {
  const details = await getEnvelopeDetails(id);
  if (!details) throw new Error("Envelope not found.");
  if (details.status !== "DRAFT") throw new Error("Only draft envelopes can be sent.");
  if (!details.document) throw new Error("Envelope has no document.");
  if (details.signers.length === 0) throw new Error("Envelope needs at least one signer.");

  const supabase = createSupabaseAdminClient();
  const links: SignerLink[] = [];

  for (const signer of details.signers) {
    const token = deriveSignerToken({ envelopeId: details.id, signerId: signer.id });
    const { error } = await supabase
      .from("envelope_signers")
      .update({
        access_token_hash: hashSignerToken(token),
        access_token_expires_at: new Date(details.expires_at).toISOString(),
      })
      .eq("id", signer.id);

    if (error) throw new Error(`Failed to prepare signer link: ${error.message}`);

    links.push({
      signer_id: signer.id,
      signer_email: signer.user_email,
      signer_name: signer.name,
      assigned_role: signer.assigned_role,
      url: `${appBaseUrl()}/sign/${token}`,
    });
  }

  await updateEnvelopeStatus({
    envelopeId: id,
    status: "SENT",
    actor: "system",
    eventType: "envelope.sent",
    extra: { sent_at: new Date().toISOString() },
    metadata: {
      signing_order: details.signing_order,
      signer_count: details.signers.length,
    },
  });

  const refreshed = await getEnvelopeDetails(id);
  if (refreshed) {
    await notifyActionableSigners(refreshed);
  }

  return links;
}

function isEnvelopeSignable(status: EnvelopeStatus) {
  return status === "SENT" || status === "VIEWED" || status === "PARTIALLY_SIGNED";
}

function signerCanAct(details: EnvelopeWithDetails, signer: EnvelopeSigner) {
  if (!isEnvelopeSignable(details.status)) return false;
  if (signer.status === "signed" || signer.status === "declined") return false;

  if (details.signing_order === "parallel") return true;

  return details.signers
    .filter((candidate) => candidate.order_index < signer.order_index)
    .every((candidate) => candidate.status === "signed");
}

function actionableSigners(details: EnvelopeWithDetails) {
  return details.signers.filter((signer) => signer.status === "pending" && signerCanAct(details, signer));
}

async function notifyActionableSigners(details: EnvelopeWithDetails) {
  const signers = actionableSigners(details);
  if (signers.length === 0) return;

  const results = await Promise.allSettled(
    signers.map((signer) =>
      sendSignerInvitationEmail({
        signerName: signer.name,
        signerEmail: signer.user_email,
        documentName: details.title,
        signingUrl: `${appBaseUrl()}/sign/${deriveSignerToken({
          envelopeId: details.id,
          signerId: signer.id,
        })}`,
      }),
    ),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const signer = signers[index];
      console.error("Failed to send signer invitation email", {
        envelopeId: details.id,
        signerId: signer.id,
        signerEmail: signer.user_email,
        error: result.reason,
      });
    }
  });
}

async function getSignerByToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("envelope_signers")
    .select(SIGNER_SELECT)
    .eq("access_token_hash", hashSignerToken(token))
    .maybeSingle();

  if (error) throw new Error(`Failed to verify signer token: ${error.message}`);
  return data as EnvelopeSigner | null;
}

export async function resolveSignerContextByToken(token: string) {
  const signer = await getSignerByToken(token);
  if (!signer) return null;
  if (!signer.access_token_expires_at || Date.now() > Date.parse(signer.access_token_expires_at)) {
    return null;
  }

  const details = await getEnvelopeDetails(signer.envelope_id);
  if (!details || !details.document) return null;

  return {
    envelope: details,
    signer,
    canSign: signerCanAct(details, signer),
  };
}

export async function getSignerEnvelopeByToken(token: string) {
  const tokenContext = await resolveSignerContextByToken(token);
  if (!tokenContext) return null;
  const { envelope: details, signer } = tokenContext;

  await logEnvelopeEvent({
    envelopeId: details.id,
    actor: signer.user_email,
    eventType: "signer.link_opened",
    metadata: { signer_id: signer.id },
  });

  if (signer.status === "pending" && isEnvelopeSignable(details.status) && signerCanAct(details, signer)) {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("envelope_signers")
      .update({ status: "viewed", viewed_at: now })
      .eq("id", signer.id);

    if (error) throw new Error(`Failed to mark signer viewed: ${error.message}`);

    await logEnvelopeEvent({
      envelopeId: details.id,
      actor: signer.user_email,
      eventType: "signer.viewed",
      metadata: { signer_id: signer.id },
    });

    if (details.status === "SENT") {
      await updateEnvelopeStatus({
        envelopeId: details.id,
        status: "VIEWED",
        actor: signer.user_email,
        eventType: "envelope.viewed",
        metadata: { signer_id: signer.id },
      });
    }
  }

  const refreshed = await getEnvelopeDetails(details.id);
  if (!refreshed || !refreshed.document) return null;
  const refreshedSigner = refreshed.signers.find((candidate) => candidate.id === signer.id);
  if (!refreshedSigner) return null;

  return {
    envelope: refreshed,
    signer: refreshedSigner,
    canSign: signerCanAct(refreshed, refreshedSigner),
    pdfUrl: await getEnvelopeSignedUrl(refreshed.document.signed_storage_path ?? refreshed.document.storage_path),
  };
}

export async function declineEnvelopeWithToken(params: {
  token: string;
  signerId: string;
  reason: string;
}) {
  const reason = params.reason.trim();
  if (reason.length === 0) {
    throw new Error("Provide a decline reason before submitting.");
  }

  const tokenContext = await resolveSignerContextByToken(params.token);
  if (!tokenContext) throw new Error("This signing link is invalid or expired.");
  if (tokenContext.signer.id !== params.signerId) {
    throw new Error("This signing link does not belong to that signer.");
  }

  const { envelope, signer } = tokenContext;
  if (isEnvelopeTerminal(envelope.status) || !signerCanAct(envelope, signer)) {
    throw new Error("This signer is not allowed to decline this envelope yet.");
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const signerUpdate = await supabase
    .from("envelope_signers")
    .update({
      status: "declined",
      access_token_hash: null,
    })
    .eq("id", signer.id);

  if (signerUpdate.error) {
    throw new Error(`Failed to save decline: ${signerUpdate.error.message}`);
  }

  await logEnvelopeEvent({
    envelopeId: envelope.id,
    actor: signer.user_email,
    eventType: "signer.declined",
    metadata: {
      signer_id: signer.id,
      assigned_role: signer.assigned_role,
      reason,
    },
  });

  await updateEnvelopeStatus({
    envelopeId: envelope.id,
    status: "DECLINED",
    actor: signer.user_email,
    eventType: "envelope.declined",
    extra: { completed_at: null, sent_at: envelope.sent_at ?? now },
    metadata: {
      signer_id: signer.id,
      reason,
    },
  });

  return getEnvelopeDetails(envelope.id);
}

function fieldBelongsToSigner(field: TemplateField, signer: EnvelopeSigner) {
  return field.assigned_role === signer.assigned_role;
}

async function renderSignaturePdf(params: {
  details: EnvelopeWithDetails;
  signer: EnvelopeSigner;
  signatureText: string;
}) {
  if (!params.details.document) throw new Error("Envelope has no document.");

  const sourcePath =
    params.details.document.signed_storage_path ?? params.details.document.storage_path;
  const pdfBytes = await downloadEnvelopePdf(sourcePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const field of params.details.document.field_layout.filter((field) =>
    fieldBelongsToSigner(field, params.signer),
  )) {
    const page = pdfDoc.getPage(field.page - 1);
    const { width, height } = page.getSize();
    const x = (field.x / 100) * width;
    const y = height - ((field.y + field.height) / 100) * height;
    const fieldWidth = (field.width / 100) * width;
    const fieldHeight = (field.height / 100) * height;
    const value =
      field.field_type === "date"
        ? new Date().toLocaleDateString("en-US")
        : field.field_type === "checkbox"
          ? "X"
          : field.field_type === "initials"
            ? params.signatureText
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .toUpperCase()
            : params.signatureText;

    page.drawRectangle({
      x,
      y,
      width: fieldWidth,
      height: fieldHeight,
      borderColor: rgb(0.39, 0.4, 0.95),
      borderWidth: 0.75,
      color: rgb(1, 1, 1),
      opacity: 0.92,
    });
    page.drawText(value, {
      x: x + 4,
      y: y + Math.max(4, fieldHeight / 2 - 5),
      size: Math.min(18, Math.max(9, fieldHeight * 0.36)),
      font,
      color: rgb(0.16, 0.15, 0.14),
      maxWidth: fieldWidth - 8,
    });
  }

  return new Uint8Array(await pdfDoc.save());
}

export async function signEnvelopeWithToken(params: { token: string; signatureText: string }) {
  const signatureText = params.signatureText.trim();
  if (signatureText.length < 2) throw new Error("Enter a signature with at least 2 characters.");

  const tokenContext = await getSignerEnvelopeByToken(params.token);
  if (!tokenContext) throw new Error("This signing link is invalid or expired.");
  if (!tokenContext.canSign) throw new Error("This envelope is not ready for this signer.");

  const { envelope, signer } = tokenContext;
  const signedPdf = await renderSignaturePdf({ details: envelope, signer, signatureText });
  const signedStoragePath = await uploadSignedEnvelopePdf(envelope.id, signedPdf);

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const signerUpdate = await supabase
    .from("envelope_signers")
    .update({
      status: "signed",
      signed_at: now,
      signature_text: signatureText,
      access_token_hash: null,
    })
    .eq("id", signer.id);

  if (signerUpdate.error) {
    throw new Error(`Failed to save signature: ${signerUpdate.error.message}`);
  }

  const documentUpdate = await supabase
    .from("envelope_documents")
    .update({ signed_storage_path: signedStoragePath })
    .eq("id", envelope.document?.id);

  if (documentUpdate.error) {
    throw new Error(`Failed to save signed document path: ${documentUpdate.error.message}`);
  }

  await logEnvelopeEvent({
    envelopeId: envelope.id,
    actor: signer.user_email,
    eventType: "signer.signed",
    metadata: { signer_id: signer.id, assigned_role: signer.assigned_role },
  });

  const refreshed = await getEnvelopeDetails(envelope.id);
  if (!refreshed) throw new Error("Envelope disappeared after signing.");

  await notifyActionableSigners(refreshed);

  const allSigned = refreshed.signers.every((candidate) => candidate.status === "signed");
  if (allSigned) {
    await updateEnvelopeStatus({
      envelopeId: envelope.id,
      status: "COMPLETED",
      actor: signer.user_email,
      eventType: "envelope.completed",
      extra: { completed_at: now },
    });
  } else {
    await updateEnvelopeStatus({
      envelopeId: envelope.id,
      status: "PARTIALLY_SIGNED",
      actor: signer.user_email,
      eventType: "envelope.partially_signed",
      metadata: { signer_id: signer.id },
    });
  }

  return getEnvelopeDetails(envelope.id);
}
