import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ── DEV-ONLY: In-memory session cache for cross-subdomain auth ────────────
// Browsers reject `domain=.localhost` cookies, so subdomain cookie sharing
// is impossible in local dev. Instead, the middleware caches the auth cookies
// from any authenticated request (e.g. on localhost). When a tenant subdomain
// (proplumb.localhost) request arrives with no auth, the cached cookies are
// injected into the response, and the browser is redirected to the same URL
// so it resends the request with the newly-set cookies.
// For production with a real domain, set NEXT_PUBLIC_COOKIE_DOMAIN instead.
let devSessionCache: { cookies: { name: string; value: string }[] } | null =
  null;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const normalizedHost = host.toLowerCase().replace(/:\d+$/, "");
  const adminDomain =
    process.env.NEXT_PUBLIC_ADMIN_DOMAIN?.replace(/:\d+$/, "") ||
    "admin.localhost";
  const isDev = process.env.NODE_ENV === "development";

  // Determine if this is an admin request
  const isAdminSubdomain =
    normalizedHost === adminDomain || normalizedHost.startsWith("admin.");
  const isAdminPath = pathname.startsWith("/admin");
  const isAdminRequest = isAdminSubdomain || isAdminPath;

  // Skip middleware for static assets and API routes (except admin API)
  // Also skip the media upload route — it handles auth itself and large bodies
  // (e.g. audio files) can be lost when middleware clones the request headers.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    (pathname.startsWith("/api") && !pathname.startsWith("/api/admin")) ||
    pathname === "/api/admin/media/upload"
  ) {
    return NextResponse.next();
  }

  // Inject pathname into request headers for downstream server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // ── DEV-ONLY tenant switcher: ?_tenant=kaimusic ──────────────────────────
  // Allows testing any tenant on localhost without /etc/hosts.
  // Stripped automatically in production (NODE_ENV check).
  if (isDev && !isAdminPath) {
    const tenantSlug = request.nextUrl.searchParams.get("_tenant");
    if (tenantSlug) {
      requestHeaders.set("x-tenant-slug", tenantSlug);
    }
  }

  // Create Supabase client for session management
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Cookie domain: production uses NEXT_PUBLIC_COOKIE_DOMAIN for real domains.
  // In dev, no domain is set — each subdomain has its own cookies, and the
  // auth relay (above) handles cross-subdomain session sharing.
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...(options as Record<string, unknown>),
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            })
          );
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── DEV: Cache auth cookies so tenant subdomains can reuse the session ──
  if (isDev && user) {
    const sbCookies = request.cookies
      .getAll()
      .filter((c) => c.name.startsWith("sb-"));
    if (sbCookies.length > 0) {
      devSessionCache = {
        cookies: sbCookies.map((c) => ({ name: c.name, value: c.value })),
      };
    }
  }

  // --- ADMIN ROUTES ---
  if (isAdminRequest) {
    // Allow login and auth callback without authentication
    const adminPath = isAdminSubdomain ? pathname : pathname.replace("/admin", "");
    if (adminPath === "/login" || adminPath.startsWith("/auth/")) {
      return response;
    }

    // Require authentication for admin
    if (!user) {
      const isPlatformHost =
        normalizedHost === adminDomain ||
        normalizedHost === "localhost" ||
        normalizedHost.startsWith("admin.");

      // In dev, inject cached session for tenant subdomains
      if (
        isDev &&
        !isPlatformHost &&
        devSessionCache &&
        !request.nextUrl.searchParams.has("_r")
      ) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.searchParams.set("_r", "1"); // prevent redirect loop
        const res = NextResponse.redirect(redirectUrl);
        for (const { name, value } of devSessionCache.cookies) {
          res.cookies.set(name, value, {
            path: "/",
            sameSite: "lax" as const,
            httpOnly: false,
            maxAge: 34560000,
          });
        }
        return res;
      }

      // Clear stale relay guard if session injection failed
      if (isDev && request.nextUrl.searchParams.has("_r")) {
        devSessionCache = null;
      }

      const loginUrl = isAdminSubdomain
        ? new URL("/login", request.url)
        : new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Strip _r param if present after successful auth
    if (isDev && request.nextUrl.searchParams.has("_r")) {
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete("_r");
      return NextResponse.redirect(cleanUrl);
    }

    // Inject user info into headers for downstream use
    response.headers.set("x-user-id", user.id);

    return response;
  }

  // --- PUBLIC ROUTES ---
  // Inject tenant domain for public page resolution
  // In dev, ?_tenant=slug overrides host-based resolution
  const tenantSlug = requestHeaders.get("x-tenant-slug");
  if (isDev && tenantSlug) {
    response.headers.set("x-tenant-slug", tenantSlug);
  } else {
    response.headers.set("x-tenant-domain", normalizedHost);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
