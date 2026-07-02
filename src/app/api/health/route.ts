import { NextResponse } from "next/server";
import { getMissingEnvKeys } from "@/lib/env";

export function GET() {
  const missingEnv = getMissingEnvKeys();

  return NextResponse.json({
    ok: missingEnv.length === 0,
    app: "SignDoc",
    checks: {
      next: true,
      supabaseEnv: missingEnv.length === 0,
    },
    missingEnv,
  });
}
