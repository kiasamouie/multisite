import Link from "next/link";
import type { TenantBranding, TenantNavConfig } from "@repo/lib/tenant/context";

interface NavPage {
  title: string;
  slug: string;
}

interface SiteNavProps {
  tenantName: string;
  branding: TenantBranding;
  navConfig: TenantNavConfig;
  pages?: NavPage[];
}

export function SiteNav({ tenantName, branding, navConfig, pages = [] }: SiteNavProps) {
  // Build nav links: dynamic pages first, then any manual overrides from nav_config
  // that aren't already covered by a page slug
  const pageSlugs = new Set(pages.map((p) => `/${p.slug}`));
  const manualLinks = (navConfig.links ?? []).filter((l) => !pageSlugs.has(l.href));

  const pageLinks = pages.map((p) => ({ label: p.title, href: `/${p.slug}` }));
  const allLinks = [...pageLinks, ...manualLinks];
  const cta = navConfig.cta;

  return (
    <header className="sticky top-0 z-50 border-b bg-[var(--tenant-bg,#fff)] backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={tenantName} className="h-8 w-auto" />
          ) : (
            <span className="text-xl font-bold" style={{ color: "var(--tenant-primary)" }}>
              {tenantName}
            </span>
          )}
        </Link>

        {allLinks.length > 0 && (
          <ul className="hidden items-center gap-6 md:flex">
            {allLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-gray-600 transition hover:text-[var(--tenant-primary)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {cta && (
          <Link
            href={cta.href}
            className="rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition"
            style={{ backgroundColor: "var(--tenant-primary)" }}
          >
            {cta.label}
          </Link>
        )}
      </nav>
    </header>
  );
}
