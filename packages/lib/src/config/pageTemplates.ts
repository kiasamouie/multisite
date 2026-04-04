/**
 * Page Templates Configuration
 * 
 * Defines all built-in page templates that can be provisioned for tenants
 * Each template includes:
 * - feature_key: links to feature_flags.key for enable/disable
 * - default_sections: section structure (sections are stored in DB, not here)
 * - default_blocks: block definitions with default content
 * - plan_requirements: which plans get this feature
 */

export type PageTemplate = {
  key: string;                    // Unique identifier
  feature_key: string;            // Must match feature_flags.key
  title: string;
  description?: string;
  slug: string;                   // URL slug
  requiredPlans: ('starter' | 'growth' | 'pro')[];
  defaultConfig: {
    hero?: {
      title: string;
      subtitle?: string;
      background?: string;
    };
    form?: {
      type: 'contact' | 'newsletter' | 'custom';
      recipient_email?: string;
      success_message?: string;
      fields?: Array<{
        name: string;
        label: string;
        type: string;
        required?: boolean;
      }>;
    };
    content?: Record<string, any>;
  };
};

/**
 * All page templates
 * When provisions a tenant, we create page instances from these templates
 */
export const PAGE_TEMPLATES: Record<string, PageTemplate> = {
  contact_form: {
    key: 'contact_form',
    feature_key: 'contact_form',
    title: 'Contact Us',
    description: 'Contact form page for customers',
    slug: 'contact',
    requiredPlans: ['starter', 'growth', 'pro'],
    defaultConfig: {
      hero: {
        title: 'Get in Touch',
        subtitle: 'We\'d love to hear from you',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      form: {
        type: 'contact',
        recipient_email: 'contact@example.com',
        success_message: 'Thank you for reaching out! We\'ll be in touch soon.',
        fields: [
          { name: 'name', label: 'Full Name', type: 'text', required: true },
          { name: 'email', label: 'Email Address', type: 'email', required: true },
          { name: 'message', label: 'Message', type: 'textarea', required: true },
        ],
      },
    },
  },

  blog: {
    key: 'blog',
    feature_key: 'blog',
    title: 'Blog',
    description: 'Blog listing page',
    slug: 'blog',
    requiredPlans: ['growth', 'pro'],
    defaultConfig: {
      hero: {
        title: 'Our Blog',
        subtitle: 'Insights, tips, and stories',
      },
      content: {
        posts_per_page: 12,
        show_featured: true,
        categories_enabled: true,
      },
    },
  },

  media_gallery: {
    key: 'media_gallery',
    feature_key: 'media_upload',
    title: 'Gallery',
    description: 'Media gallery showcase',
    slug: 'gallery',
    requiredPlans: ['starter', 'growth', 'pro'],
    defaultConfig: {
      hero: {
        title: 'Gallery',
        subtitle: 'Our work and media',
      },
      content: {
        columns: 3,
        show_descriptions: true,
        lightbox_enabled: true,
      },
    },
  },

  pricing: {
    key: 'pricing',
    feature_key: 'pricing_table',
    title: 'Pricing',
    description: 'Pricing plans page',
    slug: 'pricing',
    requiredPlans: ['growth', 'pro'],
    defaultConfig: {
      hero: {
        title: 'Simple, Transparent Pricing',
        subtitle: 'Choose the plan that\'s right for you',
      },
      content: {
        show_annual_discount: true,
        highlight_popular: true,
        call_to_action: 'Get Started',
      },
    },
  },

  faq: {
    key: 'faq',
    feature_key: 'documentation',
    title: 'FAQ',
    description: 'Frequently asked questions',
    slug: 'faq',
    requiredPlans: ['growth', 'pro'],
    defaultConfig: {
      hero: {
        title: 'Frequently Asked Questions',
        subtitle: 'Find answers to common questions',
      },
      content: {
        accordion_style: true,
        categories_enabled: false,
      },
    },
  },

  about: {
    key: 'about',
    feature_key: 'about_page',
    title: 'About Us',
    description: 'Company about page',
    slug: 'about',
    requiredPlans: ['starter', 'growth', 'pro'],
    defaultConfig: {
      hero: {
        title: 'About Our Company',
        subtitle: 'Our story, mission, and values',
      },
      content: {
        show_team: true,
        show_timeline: false,
      },
    },
  },
};

/**
 * Get templates for a specific plan
 * Returns all templates available for that plan tier
 */
export function getTemplatesForPlan(
  plan: 'starter' | 'growth' | 'pro'
): PageTemplate[] {
  return Object.values(PAGE_TEMPLATES).filter((template) =>
    template.requiredPlans.includes(plan)
  );
}

/**
 * Get a single template by key
 */
export function getTemplateByKey(key: string): PageTemplate | undefined {
  return PAGE_TEMPLATES[key];
}

/**
 * Get a template by feature_key
 */
export function getTemplateByFeatureKey(featureKey: string): PageTemplate | undefined {
  return Object.values(PAGE_TEMPLATES).find(
    (template) => template.feature_key === featureKey
  );
}
