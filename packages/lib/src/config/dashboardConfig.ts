/**
 * Dashboard configuration schema
 * Supports role-based and feature-flag-driven admin UIs
 */

export type DashboardRole = "super_admin" | "platform_admin" | "tenant_admin";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon?: string;
  requiredPlan?: "starter" | "growth" | "pro";
  requiredRole?: DashboardRole[];
  featureFlag?: string;
};

export type StatCard = {
  id: string;
  label: string;
  value: string | number;
  href?: string;
  icon?: string;
  trend?: { value: number; direction: "up" | "down" };
  requiredPlan?: string;
  featureFlag?: string;
};

export type DashboardModule = {
  id: string;
  type: "stats" | "chart" | "table" | "form" | "custom";
  title: string;
  description?: string;
  component?: string; // path to component if custom
  props?: Record<string, any>;
  requiredPlan?: "starter" | "growth" | "pro";
  requiredRole?: DashboardRole[];
  featureFlag?: string;
  order: number;
};

export type DashboardConfig = {
  role: DashboardRole;
  tenantId?: number;
  tenantName?: string;
  plan?: "starter" | "growth" | "pro";
  navItems: NavItem[];
  modules: DashboardModule[];
  featureFlags: Record<string, boolean>;
  allowTenantSelector?: boolean;
};

/**
 * Default dashboards
 */

export const SUPER_ADMIN_CONFIG: DashboardConfig = {
  role: "super_admin",
  navItems: [
    { id: "overview", label: "Overview", href: "/admin", icon: "dashboard" },
    { id: "tenants", label: "Tenants", href: "/admin/tenants", icon: "domain" },
    { id: "subscriptions", label: "Subscriptions", href: "/admin/subscriptions", icon: "payments" },
    { id: "media", label: "Media", href: "/admin/media", icon: "image" },
    { id: "pages", label: "Pages", href: "/admin/pages", icon: "article" },
  ],
  modules: [
    {
      id: "platform-stats",
      type: "stats",
      title: "Platform Overview",
      order: 1,
    },
    {
      id: "performance-chart",
      type: "chart",
      title: "Platform Performance",
      order: 2,
    },
    {
      id: "cloud-distribution",
      type: "custom",
      title: "Cloud Distribution",
      order: 3,
    },
    {
      id: "recent-tenants",
      type: "table",
      title: "Recent Tenants",
      order: 4,
    },
  ],
  featureFlags: {},
  allowTenantSelector: false,
};

export const TENANT_ADMIN_CONFIG: DashboardConfig = {
  role: "tenant_admin",
  navItems: [
    { id: "dashboard", label: "Dashboard", href: "/admin", icon: "dashboard" },
    { id: "media", label: "Media", href: "/admin/media", icon: "image" },
    { id: "pages", label: "Pages", href: "/admin/pages", icon: "article" },
    { id: "settings", label: "Settings", href: "/admin/settings", icon: "settings" },
  ],
  modules: [
    {
      id: "tenant-stats",
      type: "stats",
      title: "Site Overview",
      order: 1,
    },
    {
      id: "recent-pages",
      type: "table",
      title: "Recent Pages",
      order: 2,
    },
    {
      id: "usage-chart",
      type: "chart",
      title: "Usage & Performance",
      order: 3,
      featureFlag: "analytics",
    },
  ],
  featureFlags: {
    custom_features: true,
    analytics: true,
    api_access: false,
  },
  allowTenantSelector: false,
};

/**
 * Helper function to filter config based on permissions
 */
export function filterConfigByPermissions(
  config: DashboardConfig,
  plan: "starter" | "growth" | "pro" = "starter",
  featureFlags: Record<string, boolean> = {}
): DashboardConfig {
  const mergedFlags = { ...config.featureFlags, ...featureFlags };

  return {
    ...config,
    navItems: config.navItems.filter((item) => {
      if (item.requiredRole && !item.requiredRole.includes(config.role)) {
        return false;
      }
      if (item.requiredPlan && plan < item.requiredPlan) {
        return false;
      }
      if (item.featureFlag && !mergedFlags[item.featureFlag]) {
        return false;
      }
      return true;
    }),
    modules: config.modules.filter((mod) => {
      if (mod.requiredRole && !mod.requiredRole.includes(config.role)) {
        return false;
      }
      if (mod.requiredPlan && plan < mod.requiredPlan) {
        return false;
      }
      if (mod.featureFlag && !mergedFlags[mod.featureFlag]) {
        return false;
      }
      return true;
    }),
    featureFlags: mergedFlags,
  };
}
