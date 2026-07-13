import { NextResponse, type NextRequest } from "next/server";
import { apiError, internalApiError } from "@/lib/api/errors";
import {
  getSignerEnvelopeByToken,
  signEnvelopeWithToken,
} from "@/lib/envelopes/workflow";
import { isSignerToken } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isSignerToken(token)) {
    return apiError("not_found", "This signing link is invalid or expired.", null);
  }

  try {
    const context = await getSignerEnvelopeByToken(token);
    if (!context) return apiError("not_found", "This signing link is invalid or expired.", null);
    return NextResponse.json(context);
  } catch (err) {
    return internalApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isSignerToken(token)) {
    return apiError("not_found", "This signing link is invalid or expired.", null);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_request", "Expected a JSON body.", null);
  }

  const signatureText = (body as { signature_text?: unknown } | null)?.signature_text;
  if (typeof signatureText !== "string" || signatureText.trim().length < 2) {
    return apiError("invalid_request", "Enter your signature before submitting.", "signature_text");
  }

  try {
    const envelope = await signEnvelopeWithToken({ token, signatureText });
    return NextResponse.json({ envelope });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("invalid or expired")) {
      return apiError("not_found", "This signing link is invalid or expired.", null);
    }
    if (message.includes("not ready for this signer")) {
      return apiError("envelope_not_signable", "This envelope is not ready for this signer.", null);
    }
    if (message.includes("required fields")) {
      return apiError("invalid_request", "Complete all required fields before signing.", null);
    }
    return internalApiError(err);
  }
}
