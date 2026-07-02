import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api/errors";
import {
  getSignerEnvelopeByToken,
  signEnvelopeWithToken,
} from "@/lib/envelopes/workflow";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const context = await getSignerEnvelopeByToken(token);
    if (!context) return apiError("not_found", "This signing link is invalid or expired.", null);
    return NextResponse.json(context);
  } catch (err) {
    return apiError("internal_error", (err as Error).message);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

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
    return apiError("envelope_not_signable", (err as Error).message);
  }
}
