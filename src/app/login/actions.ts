"use server";

import { redirect } from "next/navigation";
import {
  createSupabaseAdminClient,
  createSupabaseAnonClient,
} from "@/lib/supabase/server";
import { setAuthSession } from "@/lib/auth/session";

type AuthState = {
  error?: string;
};

function readSignInCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || email.trim().length === 0) {
    return { error: "Enter an email address." } as const;
  }
  if (typeof password !== "string" || password.trim().length === 0) {
    return { error: "Enter a password." } as const;
  }

  return {
    email: email.trim().toLowerCase(),
    password,
  } as const;
}

function readSignUpCredentials(formData: FormData) {
  const credentials = readSignInCredentials(formData);
  if ("error" in credentials) return credentials;

  if (credentials.password.length < 6) {
    return { error: "Password must be at least 6 characters." } as const;
  }

  return credentials;
}

async function finishLogin(email: string, password: string) {
  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return { error: "Invalid email or password." } as AuthState;
  }

  await setAuthSession(data.session.access_token, data.session.expires_in);
  redirect("/envelopes");
}

export async function signIn(
  _state: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const credentials = readSignInCredentials(formData);
  if ("error" in credentials) return credentials;

  return finishLogin(credentials.email, credentials.password);
}

export async function signUp(
  _state: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const credentials = readSignUpCredentials(formData);
  if ("error" in credentials) return credentials;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.admin.createUser({
    email: credentials.email,
    password: credentials.password,
    email_confirm: true,
  });

  if (error && !error.message.toLowerCase().includes("already registered")) {
    return { error: "Unable to create your account." };
  }

  return finishLogin(credentials.email, credentials.password);
}
