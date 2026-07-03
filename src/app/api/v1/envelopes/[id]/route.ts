import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/route";
import { getEnvelopeDetails } from "@/lib/envelopes/workflow";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;

  try {
    const envelope = await getEnvelopeDetails(id);
    if (!envelope) return apiError("not_found", "This envelope does not exist.", null);
    return NextResponse.json({ envelope });
  } catch (err) {
    return apiError("internal_error", (err as Error).message);
  }
}
