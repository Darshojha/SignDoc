import { NextResponse, type NextRequest } from "next/server";
import { apiError, internalApiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/route";
import { sendEnvelope } from "@/lib/envelopes/workflow";
import { isUuid } from "@/lib/validation";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

const SEND_RATE_LIMIT = { limit: 5, windowMs: 60_000 };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimit = consumeRateLimit(`envelope-send:${getClientIp(request.headers)}`, SEND_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return apiError("rate_limited", "Too many attempts. Try again later.", null);
  }

  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) {
    return apiError("invalid_request", "Invalid envelope id.", "id");
  }

  try {
    const signer_links = await sendEnvelope(id, auth.user.id);
    return NextResponse.json({ signer_links });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Envelope not found.")) {
      return apiError("not_found", "This envelope does not exist.", null);
    }
    if (
      message.includes("Only draft envelopes can be sent.") ||
      message.includes("Envelope has no document.") ||
      message.includes("Envelope needs at least one signer.")
    ) {
      return apiError("envelope_not_signable", "This envelope cannot be sent.", null);
    }
    return internalApiError(err);
  }
}
