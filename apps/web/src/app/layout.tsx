import "@repo/ui/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@repo/ui/toaster";
import { getCurrentTenant } from "@/lib/tenant";
import { getCachedNavPages } from "@/lib/cache";
import { SiteNav, SiteFooter } from "@/components/site";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Multisite Platform",
  description: "Multi-tenant website platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();
  const navPages = tenant ? await getCachedNavPages(tenant.id) : [];

  const brandingVars = tenant?.branding
    ? {
        "--tenant-primary": tenant.branding.primary_color || "#2563eb",
        "--tenant-accent": tenant.branding.accent_color || "#7c3aed",
        "--tenant-bg": tenant.branding.bg_color || "#ffffff",
        "--tenant-font": tenant.branding.font_family || "inherit",
      }
    : {};

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {tenant?.branding?.favicon_url && (
          <link rel="icon" href={tenant.branding.favicon_url} />
        )}
      </head>
      <body
        className={inter.className}
        style={brandingVars as React.CSSProperties}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {tenant && (
            <SiteNav
              tenantName={tenant.name}
              branding={tenant.branding || {}}
              navConfig={tenant.nav_config || {}}
              pages={navPages}
            />
          )}
          <div className="min-h-screen">{children}</div>
          {tenant && <SiteFooter tenantName={tenant.name} />}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
