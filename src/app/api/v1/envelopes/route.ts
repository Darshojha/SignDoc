import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/route";
import { createEnvelopeFromTemplate, listEnvelopes } from "@/lib/envelopes/workflow";
import type { SigningOrder } from "@/lib/envelopes/types";

const MIN_SIGNERS = 1;

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  try {
    const envelopes = await listEnvelopes();
    return NextResponse.json({ envelopes });
  } catch (err) {
    return apiError("internal_error", (err as Error).message);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_request", "Expected a JSON body.", null);
  }

  const input = body as {
    template_id?: unknown;
    title?: unknown;
    signing_order?: unknown;
    signers?: unknown;
  };

  if (typeof input.template_id !== "string") {
    return apiError("invalid_request", "A template is required.", "template_id");
  }
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    return apiError("invalid_request", "An envelope title is required.", "title");
  }
  if (input.signing_order !== "sequential" && input.signing_order !== "parallel") {
    return apiError("invalid_request", "Signing order must be sequential or parallel.", "signing_order");
  }
  if (!Array.isArray(input.signers) || input.signers.length < MIN_SIGNERS) {
    return apiError("invalid_request", "At least one signer is required.", "signers");
  }

  const signers = input.signers.map((raw, index) => {
    const signer = raw as Record<string, unknown>;
    return {
      name: typeof signer.name === "string" ? signer.name.trim() : "",
      email: typeof signer.email === "string" ? signer.email.trim().toLowerCase() : "",
      assignedRole:
        typeof signer.assigned_role === "string" ? signer.assigned_role.trim() : "",
      orderIndex:
        typeof signer.order_index === "number" && Number.isFinite(signer.order_index)
          ? signer.order_index
          : index + 1,
    };
  });

  if (
    signers.some(
      (signer) =>
        !signer.name ||
        !signer.email ||
        !signer.assignedRole ||
        !signer.email.includes("@"),
    )
  ) {
    return apiError("invalid_request", "Each signer needs a name, email, and role.", "signers");
  }

  try {
    const envelope = await createEnvelopeFromTemplate({
      templateId: input.template_id,
      title: input.title.trim(),
      signingOrder: input.signing_order as SigningOrder,
      signers,
    });
    return NextResponse.json({ envelope }, { status: 201 });
  } catch (err) {
    return apiError("invalid_request", (err as Error).message, null);
  }
}
