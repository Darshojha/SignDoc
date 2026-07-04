import "server-only";

import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAnonClient } from "@/lib/supabase/server";

export const AUTH_SESSION_COOKIE = "docsign-auth-token";

function isProduction() {
  // Treat non-localhost URLs as production-like so secure cookies work on HTTPS previews
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && !appUrl.includes("localhost")) {
    return true;
  }
  return process.env.NODE_ENV === "production";
}

export async function setAuthSession(accessToken: string, maxAgeSeconds: number) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 0,
  });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export function readAuthToken(request: NextRequest) {
  return request.cookies.get(AUTH_SESSION_COOKIE)?.value ?? readBearerToken(request);
}

export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  const token = readAuthToken(request);
  if (!token) return null;

  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function getAuthenticatedUserFromCookies(): Promise<User | null> {
  const token = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!token) return null;

  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function getAuthTokenFromCookies(): Promise<string | null> {
  return (await cookies()).get(AUTH_SESSION_COOKIE)?.value ?? null;
}
