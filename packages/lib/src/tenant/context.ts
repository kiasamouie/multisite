export interface Tenant {
  id: number;
  name: string;
  domain: string;
  from_email: string | null;
  stripe_customer_id: string | null;
  plan: "starter" | "growth" | "pro";
  admin_enabled: boolean;
  branding: TenantBranding;
  nav_config: TenantNavConfig;
  created_at: string;
}

export interface TenantBranding {
  primary_color?: string;
  accent_color?: string;
  bg_color?: string;
  font_family?: string;
  logo_url?: string;
  favicon_url?: string;
}

export interface TenantNavConfig {
  links?: Array<{ label: string; href: string }>;
  cta?: { label: string; href: string };
}

export interface TenantContext {
  tenant: Tenant;
  userId: string | null;
  role: "owner" | "admin" | "editor" | null;
}
