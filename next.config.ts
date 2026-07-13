import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// React's dev mode (next dev) uses eval() for debugging features like
// reconstructing component stacks. Production builds never use eval(), so we
// only relax the CSP in development to keep production locked down.
const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.resend.com; frame-src 'self' https://*.supabase.co blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src ${scriptSrc};`,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
