import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createBrowserClient() {
  // For production multi-tenant: set NEXT_PUBLIC_COOKIE_DOMAIN=.myapp.com
  // to share auth cookies across subdomains. In dev this is unset — the
  // middleware auth relay handles cross-subdomain sessions instead.
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

  return _createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(domain ? { cookieOptions: { domain } } : {}),
    }
  );
}
