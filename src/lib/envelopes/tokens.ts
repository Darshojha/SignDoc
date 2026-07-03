import "server-only";

import { createHash, createHmac } from "node:crypto";

function getSignerTokenSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return secret;
}

export function deriveSignerToken(params: { envelopeId: string; signerId: string }) {
  return createHmac("sha256", getSignerTokenSecret())
    .update(`${params.envelopeId}:${params.signerId}`)
    .digest("base64url");
}

export function hashSignerToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
