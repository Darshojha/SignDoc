import { AuthForms } from "./AuthForms";
import { getAuthTokenFromCookies } from "@/lib/auth/session";
import { AuthLayout } from "@/components/auth/AuthLayout";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const currentAccessToken = await getAuthTokenFromCookies();

  return (
    <AuthLayout
      title="Welcome back."
      description="Use your email and password to access envelopes, templates, and document activity."
      switchHref="/signup"
      switchLabel="Create account"
    >
      <AuthForms initialAccessToken={currentAccessToken ?? undefined} />
    </AuthLayout>
  );
}
