import "server-only";

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export type RequiredEnvKey = (typeof requiredEnvKeys)[number];

export function getEnvStatus() {
  return requiredEnvKeys.map((key) => ({
    key,
    configured: Boolean(process.env[key]),
  }));
}

export function getMissingEnvKeys() {
  return getEnvStatus()
    .filter((entry) => !entry.configured)
    .map((entry) => entry.key);
}

export function requireServerEnv(key: RequiredEnvKey) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
