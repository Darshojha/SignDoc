import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SignDocLogo } from "@/components/ui/SignDocLogo";

export const metadata: Metadata = {
  title: "SignDoc",
  description: "Internal e-signature workspace setup status.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <div className="pointer-events-none fixed left-4 top-4 z-50 flex items-center gap-3 rounded-full border border-white/20 bg-white/30 px-3 py-2 backdrop-blur-xl dark:bg-black/30">
          <SignDocLogo className="h-7 w-7" />
          <span className="text-sm font-medium text-[color:var(--theme-text-primary)]">SignDoc</span>
        </div>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}