import { NextResponse, type NextRequest } from "next/server";
import { apiError, internalApiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/route";
import { getEnvelopeDetails, voidEnvelope, remindEnvelope, resendEnvelope } from "@/lib/envelopes/workflow";
import { isUuid } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) {
    return apiError("invalid_request", "Invalid envelope id.", "id");
  }

  try {
    const envelope = await getEnvelopeDetails(id, auth.user.id);
    if (!envelope) return apiError("not_found", "This envelope does not exist.", null);
    return NextResponse.json({ envelope });
  } catch (err) {
    return internalApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) {
    return apiError("invalid_request", "Invalid envelope id.", "id");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_request", "Expected a JSON body.", null);
  }

  const action = (body as { action?: unknown } | null)?.action;
  if (typeof action !== "string") {
    return apiError("invalid_request", "Provide an action: void, remind, resend.", null);
  }

  try {
    if (action === "void") {
      const envelope = await voidEnvelope(id, auth.user.id);
      return NextResponse.json({ envelope });
    }
    if (action === "remind") {
      const envelope = await remindEnvelope(id, auth.user.id);
      return NextResponse.json({ envelope });
    }
    if (action === "resend") {
      const envelope = await resendEnvelope(id, auth.user.id);
      return NextResponse.json({ envelope });
    }
    return apiError("invalid_request", "Unsupported action.", null);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Envelope not found.")) return apiError("not_found", "This envelope does not exist.", null);
    return apiError("invalid_request", message || "Unable to perform action.", null);
  }
}
