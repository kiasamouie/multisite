/**
 * Builds a full URL for a tenant domain.
 *
 * - Localhost: uses http + preserves the current dev port (e.g. :3000)
 * - Production: uses https, no port override
 *
 * Usage (client components only — reads window.location.port):
 *   buildTenantUrl("kaimusic.localhost") → "http://kaimusic.localhost:3000"
 *   buildTenantUrl("acme.com", "/music") → "https://acme.com/music"
 */
export function buildTenantUrl(domain: string, path = ""): string {
  const isLocal = domain.includes("localhost");
  const protocol = isLocal ? "http" : "https";
  const port =
    isLocal && typeof window !== "undefined" && window.location.port
      ? `:${window.location.port}`
      : "";
  return `${protocol}://${domain}${port}${path}`;
}
