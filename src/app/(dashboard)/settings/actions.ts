"use server";

import { redirect } from "next/navigation";
import { createSupabaseAnonClientWithToken } from "@/lib/supabase/server";
import { clearAuthSession, getAuthTokenFromCookies } from "@/lib/auth/session";

type ActionState = {
  error?: string;
  message?: string;
};

export async function signOut() {
  await clearAuthSession();
  redirect("/login");
}

export async function updateProfile(
  _state: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const fullName = formData.get("full_name");
  if (typeof fullName !== "string" || fullName.trim().length === 0) {
    return { error: "Enter a display name." };
  }
  if (fullName.trim().length > 80) {
    return { error: "Display name must be 80 characters or fewer." };
  }

  const token = await getAuthTokenFromCookies();
  if (!token) return { error: "Your session expired. Sign in again." };

  const supabase = createSupabaseAnonClientWithToken(token);
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
  if (error) {
    return { error: "Could not update your profile. Try again." };
  }

  return { message: "Profile updated." };
}

export async function changePassword(
  _state: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const password = formData.get("password");
  const confirm = formData.get("confirm_password");

  if (typeof password !== "string" || password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const token = await getAuthTokenFromCookies();
  if (!token) return { error: "Your session expired. Sign in again." };

  const supabase = createSupabaseAnonClientWithToken(token);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Could not update your password. Try again." };
  }

  return { message: "Password updated." };
}
