import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getEnvelopeDetails } from "@/lib/envelopes/workflow";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const envelope = await getEnvelopeDetails(id);
    if (!envelope) return apiError("not_found", "This envelope does not exist.", null);
    return NextResponse.json({ envelope });
  } catch (err) {
    return apiError("internal_error", (err as Error).message);
  }
}
