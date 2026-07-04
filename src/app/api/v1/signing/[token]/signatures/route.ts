import { NextResponse, type NextRequest } from "next/server";
import { apiError, internalApiError } from "@/lib/api/errors";
import {
  getSignaturesForToken,
  saveSignatureForToken,
  type SignatureMethod,
} from "@/lib/envelopes/signatures";
import { isSignerToken } from "@/lib/validation";

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

function isSignatureMethod(value: unknown): value is SignatureMethod {
  return value === "typed" || value === "drawn" || value === "uploaded";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isSignerToken(token)) {
    return apiError("not_found", "This signing link is invalid or expired.", null);
  }

  try {
    const signatures = await getSignaturesForToken(token);
    return NextResponse.json({ signatures });
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

  const payload = body as {
    field_id?: unknown;
    image_data?: unknown;
    method?: unknown;
  } | null;

  const fieldId = payload?.field_id;
  const imageData = payload?.image_data;
  const method = payload?.method;

  if (typeof fieldId !== "string" || fieldId.trim().length === 0) {
    return apiError("invalid_request", "A field id is required.", "field_id");
  }
  if (typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
    return apiError("invalid_request", "Signature must be a base64 PNG image.", "image_data");
  }
  if (!isSignatureMethod(method)) {
    return apiError("invalid_request", "Signature method must be typed, drawn, or uploaded.", "method");
  }

  try {
    const signature = await saveSignatureForToken({
      token,
      fieldId,
      imageData,
      method,
      ipAddress: clientIp(request),
    });
    return NextResponse.json({ signature });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("invalid or expired")) {
      return apiError("not_found", "This signing link is invalid or expired.", null);
    }
    if (message.includes("not ready for this signer")) {
      return apiError("envelope_not_signable", "This envelope is not ready for this signer.", null);
    }
    if (message.includes("not allowed to sign")) {
      return apiError("forbidden", "You are not allowed to sign this field.", null);
    }
    if (message.includes("Permission denied")) {
      return apiError("forbidden", "Permission denied — this signing link cannot save signatures.", null);
    }
    if (message.includes("does not exist")) {
      return apiError("invalid_request", "This field does not exist on the document.", "field_id");
    }
    return internalApiError(err);
  }
}
