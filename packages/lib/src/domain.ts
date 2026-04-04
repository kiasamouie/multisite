/**
 * Normalize a tenant domain based on the current environment.
 *
 * Dev  : "acme.com" → "acme.localhost"
 * Prod : "acme.com" → "acme.com" (unchanged)
 *
 * Safe to call in both browser and server/SSR contexts.
 */
export function normalizeDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();

  // Already normalized — nothing to do.
  if (trimmed.endsWith(".localhost")) return trimmed;

  const firstSegment = trimmed.split(".")[0];

  // Browser context: check the actual hostname the admin is running on.
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname.endsWith(".localhost")) {
      return `${firstSegment}.localhost`;
    }
    return trimmed;
  }

  // Server / SSR context: fall back to NODE_ENV.
  if (process.env.NODE_ENV === "development") {
    return `${firstSegment}.localhost`;
  }

  return trimmed;
}
