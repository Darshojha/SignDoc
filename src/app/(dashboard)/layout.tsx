import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[var(--color-bg)] px-8 py-8">
        <div className="mx-auto max-w-[1100px]">{children}</div>
      </main>
    </div>
  );
}
