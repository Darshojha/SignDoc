export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isSignerToken(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}
