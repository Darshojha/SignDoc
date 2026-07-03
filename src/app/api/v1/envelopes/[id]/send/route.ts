import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/route";
import { sendEnvelope } from "@/lib/envelopes/workflow";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;

  try {
    const signer_links = await sendEnvelope(id);
    return NextResponse.json({ signer_links });
  } catch (err) {
    return apiError("envelope_not_signable", (err as Error).message);
  }
}
