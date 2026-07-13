import { NextResponse, type NextRequest } from "next/server";
import { apiError, internalApiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/route";
import { getEnvelopeDetails } from "@/lib/envelopes/workflow";
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
    return NextResponse.json({ events: envelope.events });
  } catch (err) {
    return internalApiError(err);
  }
}