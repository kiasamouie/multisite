import { z } from "zod";

// --- Tenant ---
export const tenantSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  plan: z.enum(["starter", "growth", "pro"]).default("starter"),
  admin_enabled: z.boolean().default(true),
  branding: z.object({
    primary_color: z.string().optional(),
    accent_color: z.string().optional(),
    bg_color: z.string().optional(),
    font_family: z.string().optional(),
    logo_url: z.string().optional(),
    favicon_url: z.string().optional(),
  }).default({}),
  nav_config: z.object({
    links: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
    cta: z.object({ label: z.string(), href: z.string() }).optional(),
  }).default({}),
});

export const tenantUpdateSchema = tenantSchema.partial();

// --- Page ---
export const pageSchema = z.object({
  tenant_id: z.number().int().positive(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(1).max(255),
  is_published: z.boolean().default(false),
  is_homepage: z.boolean().default(false),
});

export const pageUpdateSchema = pageSchema.partial().omit({ tenant_id: true });

// --- Section ---
export const sectionSchema = z.object({
  page_id: z.number().int().positive(),
  type: z.string().min(1).max(100),
  position: z.number().int().min(0),
});

export const sectionUpdateSchema = sectionSchema.partial().omit({ page_id: true });

// --- Block ---
export const blockSchema = z.object({
  section_id: z.number().int().positive(),
  type: z.string().min(1).max(100),
  content: z.record(z.unknown()),
  position: z.number().int().min(0),
});

export const blockUpdateSchema = blockSchema.partial().omit({ section_id: true });

// --- Contact Form ---
export const contactFormSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  message: z.string().min(1).max(5000),
});

// --- Media ---
export const mediaSchema = z.object({
  tenant_id: z.number().int().positive(),
  url: z.string().url(),
  filename: z.string().min(1).max(255),
  metadata: z.record(z.unknown()).default({}),
});

// --- Feature Flag ---
export const featureFlagSchema = z.object({
  tenant_id: z.number().int().positive(),
  key: z.string().min(1).max(100),
  enabled: z.boolean(),
});
