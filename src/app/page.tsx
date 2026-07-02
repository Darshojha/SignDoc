import { getEnvStatus } from "@/lib/env";

export default function Home() {
  const envStatus = getEnvStatus();
  const configuredCount = envStatus.filter((entry) => entry.configured).length;
  const allConfigured = configuredCount === envStatus.length;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)] sm:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-primary)]">
              Setup status
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--color-text-primary)]">
              SignDoc is ready for deployment.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)]">
              Next.js App Router and Tailwind are installed. Supabase is wired
              through server-side environment variables and will report ready
              once the Vercel project has the required keys.
            </p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${
              allConfigured
                ? "bg-emerald-50 text-[var(--color-success)]"
                : "bg-amber-50 text-[var(--color-warning)]"
            }`}
          >
            {allConfigured ? "Supabase configured" : "Env pending"}
          </span>
        </div>

        <div className="mt-8 grid gap-3">
          {envStatus.map((entry) => (
            <div
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3"
              key={entry.key}
            >
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {entry.key}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  entry.configured
                    ? "bg-emerald-50 text-[var(--color-success)]"
                    : "bg-stone-100 text-[var(--color-text-secondary)]"
                }`}
              >
                {entry.configured ? "Set" : "Missing"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[var(--radius-md)] bg-[#F5F5F4] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
          <p>
            Health endpoint:{" "}
            <code className="rounded-[var(--radius-sm)] bg-white px-2 py-1 text-[var(--color-text-primary)]">
              /api/health
            </code>
          </p>
        </div>
      </section>
    </main>
  );
}
