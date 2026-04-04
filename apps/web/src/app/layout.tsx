import "@repo/ui/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { getCurrentTenant } from "@/lib/tenant";
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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body
        className={inter.className}
        style={brandingVars as React.CSSProperties}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {tenant && (
            <SiteNav
              tenantName={tenant.name}
              branding={tenant.branding || {}}
              navConfig={tenant.nav_config || {}}
            />
          )}
          <div className="min-h-screen">{children}</div>
          {tenant && <SiteFooter tenantName={tenant.name} />}
        </ThemeProvider>
      </body>
    </html>
  );
}
