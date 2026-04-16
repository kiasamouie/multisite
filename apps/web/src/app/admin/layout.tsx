import { redirect, notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@repo/lib/supabase/server";
import { resolveTenantsByUserId, resolveTenantByDomain } from "@repo/lib/tenant/resolver";
import { getPlatformAdmin } from "@repo/lib/tenant/platform";
import { hasFlag } from "@repo/lib/flags/check";
import {
  SUPER_ADMIN_CONFIG,
  TENANT_ADMIN_CONFIG,
} from "@repo/lib/config/dashboardConfig";
import { DashboardLayout } from "@repo/ui/admin";
import type { NavItem } from "@repo/lib/config/dashboardConfig";
import { AdminClientWrapper } from "./AdminClientWrapper";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") || "";
  const hostHeader = headerStore.get("host") || "";
  const normalizedHost = hostHeader.toLowerCase().replace(/:\d+$/, "");
  const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN?.replace(/:\d+$/, "") || "admin.localhost";

  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if on login/auth pages
  const isAuthPage = pathname === "/admin/login" || pathname.startsWith("/admin/auth/");

  // If user is logged in and trying to access login/auth, redirect to dashboard
  if (user && isAuthPage) {
    redirect("/admin");
  }

  // If not logged in and on protected page, redirect to login
  if (!user && !isAuthPage) {
    redirect("/admin/login");
  }

  // Case: user is NOT logged in AND on auth page
  if (!user && isAuthPage) {
    // Render login/signup page without any admin layout
    return <>{children}</>;
  }

  // ── Check if accessing a tenant subdomain ──
  // Platform hosts: "admin.localhost", "localhost" (bare), or anything starting with "admin."
  const isPlatformHost =
    normalizedHost === adminDomain ||
    normalizedHost === "localhost" ||
    normalizedHost.startsWith("admin.");
  const isTenantSubdomain = !isPlatformHost;
  const tenantDomain = isTenantSubdomain ? normalizedHost : null;

  // At this point, user is guaranteed to be non-null (handled by early redirects above)
  const authenticatedUser = user!;

  // ── Super / Platform Admin ──
  const platformAdmin = await getPlatformAdmin(authenticatedUser.id);

  if (platformAdmin) {
    // If on a tenant subdomain, show that tenant's dashboard instead of global admin
    if (tenantDomain) {
      const tenant = await resolveTenantByDomain(tenantDomain);
      if (!tenant) notFound();

      // Check if admin_section is enabled for this tenant
      const adminSectionEnabled = await hasFlag(tenant.id, "admin_section");
      if (!adminSectionEnabled) {
        notFound();
      }

      // Show tenant-specific dashboard for this platform admin
      const navItems = TENANT_ADMIN_CONFIG.navItems;

      const bottomNavItems: NavItem[] = [];

      return (
        <AdminClientWrapper tenantId={tenant.id} plan={tenant.plan ?? null}>
          <DashboardLayout
            navItems={navItems}
            header={{ title: tenant.name, subtitle: tenant.domain }}
            userEmail={authenticatedUser.email ?? ""}
            signOutHref="/admin/auth/signout"
            siteUrl="/"
            isSuperAdmin={true}
          >
            {children}
          </DashboardLayout>
        </AdminClientWrapper>
      );
    }

    // Super admin on platform domain - show global admin view
    const navItems = SUPER_ADMIN_CONFIG.navItems;

    const bottomNavItems: NavItem[] = [];

    return (
      <AdminClientWrapper tenantId={null}>
        <DashboardLayout
          navItems={navItems}
          header={{
            title: "Multisite",
            subtitle: "Super Admin Dashboard",
            initial: "A",
          }}
          userEmail={authenticatedUser.email ?? ""}
          userName={
            platformAdmin.role === "super_admin" ? "Admin Alpha" : "Admin"
          }
          signOutHref="/admin/auth/signout"
        >
          {children}
        </DashboardLayout>
      </AdminClientWrapper>
    );
  }

  // ── Tenant Admin ──
  const tenants = await resolveTenantsByUserId(authenticatedUser.id);

  if (!tenants || tenants.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">No Sites Found</h1>
          <p className="mt-2 text-muted-foreground">
            You don&apos;t have access to any sites. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  const activeTenant = tenants[0];

  // Check if admin_section is enabled for this tenant
  const adminSectionEnabled = await hasFlag(activeTenant.id, "admin_section");

  if (!adminSectionEnabled) {
    notFound();
  }

  const navItems = TENANT_ADMIN_CONFIG.navItems;


  const bottomNavItems: NavItem[] = [];

  return (
    <AdminClientWrapper tenantId={activeTenant.id} plan={activeTenant.plan ?? null}>
      <DashboardLayout
        navItems={navItems}
        header={{ title: activeTenant.name, subtitle: activeTenant.domain }}
        userEmail={authenticatedUser.email ?? ""}
        signOutHref="/admin/auth/signout"
        siteUrl="/"
      >
        {children}
      </DashboardLayout>
    </AdminClientWrapper>
  );
}
