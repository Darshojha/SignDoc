import { NextResponse, type NextRequest } from "next/server";
import { apiError, internalApiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/route";
import { sendEnvelope } from "@/lib/envelopes/workflow";
import { isUuid } from "@/lib/validation";

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

  try {
    const signer_links = await sendEnvelope(id);
    return NextResponse.json({ signer_links });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
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
