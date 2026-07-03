import { NextResponse, type NextRequest } from "next/server";
import { apiError, internalApiError } from "@/lib/api/errors";
import { declineEnvelopeWithToken, isEnvelopeTerminal } from "@/lib/envelopes/workflow";
import { getEnvelopeDetails } from "@/lib/envelopes/workflow";
import { isSignerToken, isUuid } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signerId: string }> },
) {
  const { id, signerId } = await params;
  if (!isUuid(id)) {
    return apiError("invalid_request", "Invalid envelope id.", "id");
  }
  if (!isUuid(signerId)) {
    return apiError("invalid_request", "Invalid signer id.", "signerId");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_request", "Expected a JSON body.", null);
  }

  const reason = (body as { reason?: unknown } | null)?.reason;
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return apiError("invalid_request", "Provide a decline reason.", "reason");
  }

  try {
    const envelope = await getEnvelopeDetails(id);
    if (!envelope) {
      return apiError("not_found", "This envelope does not exist.", null);
    }
    if (isEnvelopeTerminal(envelope.status)) {
      return apiError("envelope_not_signable", "This envelope is already closed for signing.", null);
    }

    const token = request.headers.get("x-signer-token");
    if (!token) {
      return apiError("not_found", "This signing link is invalid or expired.", null);
    }
    if (!isSignerToken(token)) {
      return apiError("not_found", "This signing link is invalid or expired.", null);
    }

    const declined = await declineEnvelopeWithToken({ token, signerId, reason });
    if (!declined) {
      return apiError("internal_error", "Decline failed after updating the envelope.", null);
    }

    return NextResponse.json({ envelope: declined });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("does not belong to that signer")) {
      return apiError("forbidden", "This signing link does not belong to that signer.", null);
    }
    if (message.includes("not allowed to decline this envelope yet")) {
      return apiError("forbidden", "This signer is not allowed to decline this envelope yet.", null);
    }
    if (message.includes("invalid or expired")) {
      return apiError("not_found", "This signing link is invalid or expired.", null);
    }
    if (message.includes("decline reason")) {
      return apiError("invalid_request", "Provide a decline reason.", "reason");
    }
    return internalApiError(err);
  }
}
