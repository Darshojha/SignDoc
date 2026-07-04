import Link from "next/link";
import { ReactNode } from "react";
import { BaseLayout } from "@/components/layout/BaseLayout";

type AuthLayoutProps = {
  title: string;
  description: string;
  switchHref: string;
  switchLabel: string;
  children: ReactNode;
};

export function AuthLayout({
  title,
  description,
  switchHref,
  switchLabel,
  children,
}: AuthLayoutProps) {
  return (
    <BaseLayout title={title} description={description}>
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-normal text-[var(--theme-text-primary)]">
          {title}
        </h1>
        <p className="mt-3 text-base leading-7 text-[var(--theme-text-secondary)]">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <Link href={switchHref} className="text-sm font-medium text-[var(--theme-text-secondary)] transition hover:text-[var(--theme-text-primary)]">
          {switchLabel}
        </Link>
      </div>

      {children}
    </BaseLayout>
  );
}
