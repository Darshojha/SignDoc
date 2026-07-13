import { Sidebar } from "@/components/layout/Sidebar";
import { requireServerUser } from "@/lib/auth/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireServerUser();
  const userName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar userName={userName} userEmail={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1100px]">{children}</div>
      </main>
    </div>
  );
}
