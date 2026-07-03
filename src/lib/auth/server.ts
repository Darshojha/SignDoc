import "server-only";

import { redirect } from "next/navigation";
import { getAuthenticatedUserFromCookies } from "@/lib/auth/session";

export async function requireServerUser() {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    redirect("/login");
  }
  return user;
}
