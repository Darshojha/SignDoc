import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api/errors";
import { sendEnvelope } from "@/lib/envelopes/workflow";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const signer_links = await sendEnvelope(id);
    return NextResponse.json({ signer_links });
  } catch (err) {
    return apiError("envelope_not_signable", (err as Error).message);
  }
}
