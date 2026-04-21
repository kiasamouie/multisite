export type PlanTier = "starter" | "growth" | "pro";

export interface PlanConfig {
  name: string;
  tier: PlanTier;
  priceEnvKey: string;
  features: string[];
  limits: {
    pages: number;
    mediaStorageMb: number;
    customDomain: boolean;
    adminUsers: number;
  };
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  starter: {
    name: "Starter",
    tier: "starter",
    priceEnvKey: "STRIPE_PRICE_STARTER",
    features: [
      "basic_pages",
      "contact_form",
      "media_upload",
    ],
    limits: {
      pages: 5,
      mediaStorageMb: 100,
      customDomain: false,
      adminUsers: 1,
    },
  },
  growth: {
    name: "Growth",
    tier: "growth",
    priceEnvKey: "STRIPE_PRICE_GROWTH",
    features: [
      "basic_pages",
      "contact_form",
      "media_upload",
      "custom_domain",
      "analytics",
      "blog",
      "seo_tools",
      "services_page",
      "booking_system",
      "admin_section",
    ],
    limits: {
      pages: 25,
      mediaStorageMb: 1000,
      customDomain: true,
      adminUsers: 3,
    },
  },
  pro: {
    name: "Pro",
    tier: "pro",
    priceEnvKey: "STRIPE_PRICE_PRO",
    features: [
      "basic_pages",
      "contact_form",
      "media_upload",
      "custom_domain",
      "analytics",
      "blog",
      "seo_tools",
      "advanced_analytics",
      "api_access",
      "white_label",
      "priority_support",
      "integrations",
      "services_page",
      "portfolio_page",
      "team_page",
      "events_page",
      "booking_system",
      "booking_reminders",
      "admin_section",
    ],
    limits: {
      pages: -1, // unlimited
      mediaStorageMb: 10000,
      customDomain: true,
      adminUsers: -1, // unlimited
    },
  },
};

export function getPriceId(tier: PlanTier): string {
  const plan = PLANS[tier];
  return process.env[plan.priceEnvKey] || "";
}
