import "@repo/ui/globals.css";
import type { Metadata } from "next";
import {
  Inter,
  Manrope,
  Roboto,
  Poppins,
  Montserrat,
  Lora,
  Playfair_Display,
  Merriweather,
  Oswald,
  Bebas_Neue,
  JetBrains_Mono,
} from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@repo/ui/toaster";
import { getCurrentTenant } from "@/lib/tenant";
import { getHeaderConfig, getFooterConfig } from "@/lib/cache";
import { getSettings } from "@repo/lib/site-settings/read";
import { paletteToCssVars } from "@repo/lib/theme/palette";
import { SiteNav, SiteFooter } from "@/components/site";

// ── Self-hosted fonts (next/font/google) ────────────────────────────
//
// Each font is exposed as a CSS custom property on `<body>` so that
// inline `style={{ fontFamily: "var(--font-inter)" }}` works in every
// context, including the Puck editor iframe (same-origin, inherits
// document fonts) and any block component.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-merriweather",
  display: "swap",
});
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", display: "swap" });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--font-bebas", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

// All font CSS-variable classes, joined for the <body> className.
const fontVarClasses = [
  inter.variable,
  manrope.variable,
  roboto.variable,
  poppins.variable,
  montserrat.variable,
  lora.variable,
  playfair.variable,
  merriweather.variable,
  oswald.variable,
  bebas.variable,
  jetbrains.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Multisite Platform",
  description: "Multi-tenant website platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isAdminRoute = pathname.startsWith("/admin");

  const tenant = await getCurrentTenant();

  // Public-only data: header/footer + theme + navigation settings.
  // Skipped on admin routes so the admin chrome never queries public-site config.
  const [headerConfig, footerConfig, theme, navigation, advanced] =
    !isAdminRoute && tenant
      ? await Promise.all([
          getHeaderConfig(tenant.id),
          getFooterConfig(tenant.id),
          getSettings(tenant.id, "theme"),
          getSettings(tenant.id, "navigation"),
          getSettings(tenant.id, "advanced"),
        ])
      : [null, null, null, null, null];

  // CSS vars consumed by SiteNav/SiteFooter and existing block styles.
  // Theme palette (new) overrides legacy `tenants.branding` (old) when both
  // are present.
  const palette = theme?.palette ?? {};
  const brandingVars: Record<string, string> = tenant
    ? {
        "--tenant-primary":
          palette.primary || tenant.branding?.primary_color || "#2563eb",
        "--tenant-accent":
          palette.accent || tenant.branding?.accent_color || "#7c3aed",
        "--tenant-bg":
          palette.background || tenant.branding?.bg_color || "#ffffff",
        "--tenant-font":
          theme?.font?.family || tenant.branding?.font_family || "inherit",
      }
    : {};

  // HSL overrides for the Tailwind admin theme tokens (`--primary`,
  // `--background`, `--foreground`, etc.) so that all public-site blocks
  // using `bg-primary` / `text-foreground` / `bg-card` / `border-border`
  // automatically inherit the tenant's selected palette. These are merged
  // onto the *body* style on public routes ONLY — admin routes never
  // receive these so the admin chrome keeps its own theme tokens.
  //
  // Why on `<body>`: globals.css applies `body { @apply bg-background }`,
  // which resolves `--background` from the body's own cascade. Setting
  // these vars on body (not a nested wrapper) ensures the page background
  // and every transparent block section shows the tenant theme colour —
  // not the admin-theme white inherited from `:root`.
  const tenantThemeVars =
    !isAdminRoute && tenant ? paletteToCssVars(palette) : {};

  const bodyStyle: React.CSSProperties = {
    ...brandingVars,
    ...tenantThemeVars,
  } as React.CSSProperties;

  // Public site dark/light mode is DATABASE-driven (per tenant), NOT
  // controlled by next-themes. This guarantees that an admin user toggling
  // their dashboard theme can never affect the public-facing website.
  const publicDarkClass =
    !isAdminRoute && theme?.mode === "dark" ? "dark" : "";

  // next-themes (used in /admin) writes the `dark` class onto <html> and the
  // class persists across client-side navigations. Without this guard, the
  // public site inherits dark-mode CSS variables when an admin user has
  // toggled their dashboard to dark and then visits the public site.
  // We strip the class server-side via an inline script that runs before
  // the first paint to avoid a flash. Admin routes keep their own logic.
  const htmlClassResetScript = !isAdminRoute
    ? publicDarkClass === "dark"
      ? "document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');"
      : "document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');"
    : null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={!isAdminRoute ? publicDarkClass || "light" : undefined}
    >
      <head>
        {htmlClassResetScript && (
          <script
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: htmlClassResetScript }}
          />
        )}
        {tenant?.branding?.favicon_url && (
          <link rel="icon" href={tenant.branding.favicon_url} />
        )}
        {!isAdminRoute && navigation?.smoothScroll && (
          <style dangerouslySetInnerHTML={{ __html: "html{scroll-behavior:smooth}" }} />
        )}
        {!isAdminRoute && advanced?.customCss && (
          <style dangerouslySetInnerHTML={{ __html: advanced.customCss }} />
        )}
        {!isAdminRoute && advanced?.customHeadHtml && (
          <div
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: advanced.customHeadHtml }}
          />
        )}
      </head>
      <body
        className={`${inter.className} ${fontVarClasses} ${publicDarkClass}`.trim()}
        style={bodyStyle}
      >
        {isAdminRoute ? (
          // ── Admin chrome — user-controlled theme via next-themes ──
          // Uses a dedicated storageKey so the admin light/dark choice is
          // isolated from the public site theme (which is DB driven).
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="admin-theme"
          >
            {children}
            <Toaster richColors position="top-center" />
          </ThemeProvider>
        ) : (
          // ── Public site — DB-driven static theme; no client toggle ──
          // Tenant theme overrides live on `<body>` (above) so that the
          // body's `bg-background` / `text-foreground` (defined in
          // globals.css) cascade the tenant palette down to every block,
          // including blocks with no explicit background class.
          <>
            {tenant && (
              <SiteNav
                tenantName={tenant.name}
                branding={tenant.branding || {}}
                headerConfig={headerConfig ?? undefined}
              />
            )}
            <div className="min-h-screen">{children}</div>
            {tenant && (
              <SiteFooter
                tenantName={tenant.name}
                footerConfig={footerConfig ?? undefined}
              />
            )}
            <Toaster richColors position="top-center" />
          </>
        )}
      </body>
    </html>
  );
}
