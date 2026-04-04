import Link from "next/link";
import type { TenantBranding, TenantNavConfig } from "@repo/lib/tenant/context";

interface SiteNavProps {
  tenantName: string;
  branding: TenantBranding;
  navConfig: TenantNavConfig;
}

export function SiteNav({ tenantName, branding, navConfig }: SiteNavProps) {
  const links = navConfig.links || [];
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

        {links.length > 0 && (
          <ul className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
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
