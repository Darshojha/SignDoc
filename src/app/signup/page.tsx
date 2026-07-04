import { AuthForms } from "@/app/login/AuthForms";
import { getAuthTokenFromCookies } from "@/lib/auth/session";
import { AuthLayout } from "@/components/auth/AuthLayout";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const currentAccessToken = await getAuthTokenFromCookies();

  return (
    <AuthLayout
      title="Start sending and signing with SignDoc."
      description="Create your account to manage envelopes, templates, and document activity."
      switchHref="/login"
      switchLabel="Back to login"
    >
      <AuthForms initialAccessToken={currentAccessToken ?? undefined} mode="signup" />
    </AuthLayout>
  );
}
