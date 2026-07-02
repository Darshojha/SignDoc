import type { TemplateField } from "@/lib/templates/types";

export type EnvelopeStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIALLY_SIGNED"
  | "COMPLETED"
  | "DECLINED"
  | "VOIDED"
  | "EXPIRED";

export type SigningOrder = "sequential" | "parallel";
export type SignerStatus = "pending" | "viewed" | "signed" | "declined";

export type EnvelopeSigner = {
  id: string;
  envelope_id: string;
  name: string;
  user_email: string;
  assigned_role: string;
  order_index: number;
  status: SignerStatus;
  access_token_expires_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signature_text: string | null;
  created_at: string;
};

export type EnvelopeDocument = {
  id: string;
  envelope_id: string;
  template_id: string | null;
  storage_path: string;
  signed_storage_path: string | null;
  page_count: number;
  field_layout: TemplateField[];
  created_at: string;
};

export type EnvelopeEvent = {
  id: string;
  envelope_id: string;
  actor: string;
  event_type: string;
  timestamp: string;
  metadata: Record<string, unknown>;
};

export type Envelope = {
  id: string;
  template_id: string | null;
  title: string;
  status: EnvelopeStatus;
  signing_order: SigningOrder;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  completed_at: string | null;
  expires_at: string;
};

export type EnvelopeWithDetails = Envelope & {
  document: EnvelopeDocument | null;
  signers: EnvelopeSigner[];
  events: EnvelopeEvent[];
};

export type SignerLink = {
  signer_id: string;
  signer_email: string;
  signer_name: string;
  assigned_role: string;
  url: string;
};

export type SignerEnvelopeContext = {
  envelope: EnvelopeWithDetails;
  signer: EnvelopeSigner;
  canSign: boolean;
  pdfUrl: string;
};
