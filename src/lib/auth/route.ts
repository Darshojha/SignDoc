import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { apiError } from "@/lib/api/errors";
import { getAuthenticatedUser } from "@/lib/auth/session";

export type ApiUserResult =
  | { user: User }
  | { response: ReturnType<typeof apiError> };

export async function requireApiUser(request: NextRequest): Promise<ApiUserResult> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      response: apiError("unauthorized", "You must be logged in.", null),
    };
  }

  return { user };
}
