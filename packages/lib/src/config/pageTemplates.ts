/**
 * Page Templates Configuration
 *
 * Defines all built-in page templates provisioned for tenants.
 * Each template contains its full section + block structure with default content.
 * During provisioning, sections and blocks are inserted directly into the DB.
 *
 * Starter (4): Home, About, Contact, Gallery
 * Growth  (4): Blog, FAQ, Pricing, Services
 * Pro     (4): Portfolio, Team, Events, Reviews
 */

export type TemplateBlock = {
  type: string;
  position: number;
  content: Record<string, unknown>;
};

export type TemplateSection = {
  type: string;
  position: number;
  blocks: TemplateBlock[];
};

export type PageTemplate = {
  key: string;
  feature_key: string;
  title: string;
  slug: string;
  is_homepage?: boolean;
  requiredPlans: ("starter" | "growth" | "pro")[];
  sections: TemplateSection[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// STARTER PLAN PAGES
// ═══════════════════════════════════════════════════════════════════════════════

const HOME_TEMPLATE: PageTemplate = {
  key: "home",
  feature_key: "basic_pages",
  title: "Home",
  slug: "home",
  is_homepage: true,
  requiredPlans: ["starter", "growth", "pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "page_media",
          position: 0,
          content: { usage_type: "hero", display_mode: "single" },
        },
        {
          type: "hero",
          position: 1,
          content: {
            title: "Welcome to Our Business",
            subtitle:
              "We help you succeed with innovative solutions tailored to your needs. Discover what makes us different.",
            ctaText: "Get Started",
            ctaLink: "/contact",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "services",
          position: 0,
          content: {
            title: "What We Offer",
            services: [
              {
                name: "Web Design",
                description:
                  "Beautiful, responsive websites that convert visitors into customers.",
                icon: "🎨",
              },
              {
                name: "Digital Marketing",
                description:
                  "Data-driven campaigns that grow your online presence and revenue.",
                icon: "📈",
              },
              {
                name: "Brand Strategy",
                description:
                  "Compelling brand identities that resonate with your target audience.",
                icon: "💡",
              },
            ],
          },
        },
        {
          type: "stats",
          position: 1,
          content: {
            title: "Our Impact",
            stats: [
              { label: "Happy Clients", value: "500", suffix: "+" },
              { label: "Client Satisfaction", value: "98", suffix: "%" },
              { label: "Years Experience", value: "10", suffix: "+" },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "testimonials",
          position: 0,
          content: {
            title: "What Our Clients Say",
            testimonials: [
              {
                name: "Sarah Johnson",
                role: "CEO, TechStart",
                content:
                  "Working with this team transformed our online presence. Our traffic increased by 200% in just three months.",
              },
              {
                name: "Michael Chen",
                role: "Founder, GreenLeaf Co",
                content:
                  "Professional, creative, and results-driven. They delivered beyond our expectations every step of the way.",
              },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 3,
      blocks: [
        {
          type: "cta",
          position: 0,
          content: {
            title: "Ready to Get Started?",
            subtitle:
              "Contact us today for a free consultation and see how we can help your business grow.",
            buttonText: "Contact Us",
            buttonLink: "/contact",
          },
        },
      ],
    },
  ],
};

const ABOUT_TEMPLATE: PageTemplate = {
  key: "about",
  feature_key: "basic_pages",
  title: "About Us",
  slug: "about",
  requiredPlans: ["starter", "growth", "pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "page_media",
          position: 0,
          content: { usage_type: "hero", display_mode: "single" },
        },
        {
          type: "hero",
          position: 1,
          content: {
            title: "About Us",
            subtitle: "Our story, mission, and the people behind it all",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "about",
          position: 0,
          content: {
            title: "Our Story",
            content:
              "Founded in 2015, we set out with a simple mission: to help businesses thrive in the digital age. What started as a small team of passionate creators has grown into a full-service agency trusted by hundreds of clients worldwide. We believe that every business deserves a powerful online presence, regardless of size or industry.",
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "two_column",
          position: 0,
          content: {
            leftHtml:
              "<h3>Our Mission</h3><p>To empower businesses with cutting-edge digital solutions that drive growth, build brand loyalty, and create lasting impact in their communities.</p>",
            rightHtml:
              "<h3>Our Vision</h3><p>A world where every business, from local startups to global enterprises, can harness the full potential of digital technology to reach their goals.</p>",
          },
        },
      ],
    },
    {
      type: "default",
      position: 3,
      blocks: [
        {
          type: "team",
          position: 0,
          content: {
            title: "Meet Our Team",
            members: [
              {
                name: "Alex Rivera",
                role: "Founder & CEO",
                bio: "Visionary leader with 15+ years in digital strategy and business development.",
              },
              {
                name: "Jordan Lee",
                role: "Creative Director",
                bio: "Award-winning designer passionate about creating beautiful, user-centric experiences.",
              },
              {
                name: "Sam Patel",
                role: "Head of Technology",
                bio: "Full-stack engineer who loves turning complex problems into elegant solutions.",
              },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 4,
      blocks: [
        {
          type: "stats",
          position: 0,
          content: {
            title: "By the Numbers",
            stats: [
              { label: "Projects Completed", value: "1,200", suffix: "+" },
              { label: "Team Members", value: "45" },
              { label: "Countries Served", value: "30", suffix: "+" },
              { label: "Client Retention", value: "96", suffix: "%" },
            ],
          },
        },
        {
          type: "cta",
          position: 1,
          content: {
            title: "Want to Work With Us?",
            subtitle:
              "We are always looking for talented people and exciting projects.",
            buttonText: "Get in Touch",
            buttonLink: "/contact",
          },
        },
      ],
    },
  ],
};

const CONTACT_TEMPLATE: PageTemplate = {
  key: "contact_form",
  feature_key: "contact_form",
  title: "Contact Us",
  slug: "contact",
  requiredPlans: ["starter", "growth", "pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "hero",
          position: 0,
          content: {
            title: "Get in Touch",
            subtitle:
              "Have a question or want to work together? We would love to hear from you.",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "contact",
          position: 0,
          content: {
            title: "Contact Us",
            subtitle: "Fill out the form below and we will get back to you within 24 hours.",
            email: "hello@example.com",
            phone: "+1 (555) 123-4567",
            showForm: true,
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "map",
          position: 0,
          content: {
            title: "Find Us",
            address: "123 Business Street, Suite 100, San Francisco, CA 94105",
          },
        },
        {
          type: "opening_hours",
          position: 1,
          content: {
            title: "Business Hours",
            hours: [
              { day: "Monday", open: "9:00 AM", close: "6:00 PM" },
              { day: "Tuesday", open: "9:00 AM", close: "6:00 PM" },
              { day: "Wednesday", open: "9:00 AM", close: "6:00 PM" },
              { day: "Thursday", open: "9:00 AM", close: "6:00 PM" },
              { day: "Friday", open: "9:00 AM", close: "5:00 PM" },
              { day: "Saturday", open: "10:00 AM", close: "2:00 PM" },
              { day: "Sunday", open: "", close: "", closed: true },
            ],
          },
        },
      ],
    },
  ],
};

const GALLERY_TEMPLATE: PageTemplate = {
  key: "media_gallery",
  feature_key: "media_upload",
  title: "Gallery",
  slug: "gallery",
  requiredPlans: ["starter", "growth", "pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "hero",
          position: 0,
          content: {
            title: "Our Gallery",
            subtitle: "Browse our latest work and media",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "heading",
          position: 0,
          content: { text: "Featured Work", level: 2, alignment: "center" },
        },
        {
          type: "page_media",
          position: 1,
          content: {
            usage_type: "gallery",
            display_mode: "gallery",
            title: "",
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "cta",
          position: 0,
          content: {
            title: "Like What You See?",
            subtitle: "Get in touch to discuss your project with our creative team.",
            buttonText: "Start a Project",
            buttonLink: "/contact",
          },
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// GROWTH PLAN PAGES
// ═══════════════════════════════════════════════════════════════════════════════

const BLOG_TEMPLATE: PageTemplate = {
  key: "blog",
  feature_key: "blog",
  title: "Blog",
  slug: "blog",
  requiredPlans: ["growth", "pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "hero",
          position: 0,
          content: {
            title: "Our Blog",
            subtitle: "Insights, tips, and stories from our team",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "blog_grid",
          position: 0,
          content: {
            title: "Latest Posts",
            posts: [
              {
                title: "10 Tips for Growing Your Online Presence",
                excerpt:
                  "Discover proven strategies to expand your digital footprint and attract more customers to your business.",
                href: "#",
                date: "2025-01-15",
                author: "Alex Rivera",
              },
              {
                title: "The Future of Web Design in 2025",
                excerpt:
                  "Explore the latest trends shaping modern web design, from AI-powered layouts to immersive experiences.",
                href: "#",
                date: "2025-01-10",
                author: "Jordan Lee",
              },
              {
                title: "Building a Brand That Lasts",
                excerpt:
                  "Learn the fundamentals of creating a strong, memorable brand identity that resonates with your audience.",
                href: "#",
                date: "2025-01-05",
                author: "Sam Patel",
              },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "newsletter",
          position: 0,
          content: {
            title: "Stay Updated",
            subtitle:
              "Subscribe to our newsletter and never miss a new post or announcement.",
            placeholder: "Enter your email",
            buttonText: "Subscribe",
          },
        },
      ],
    },
  ],
};

const FAQ_TEMPLATE: PageTemplate = {
  key: "faq",
  feature_key: "seo_tools",
  title: "FAQ",
  slug: "faq",
  requiredPlans: ["growth", "pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "hero",
          position: 0,
          content: {
            title: "Frequently Asked Questions",
            subtitle: "Find answers to the most common questions about our services",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "faq",
          position: 0,
          content: {
            title: "Common Questions",
            items: [
              { question: "What services do you offer?", answer: "We offer a full range of digital services including web design, development, digital marketing, SEO, brand strategy, and ongoing support and maintenance." },
              { question: "How long does a typical project take?", answer: "Project timelines vary based on scope and complexity. A simple website typically takes 4-6 weeks, while larger projects may take 2-4 months. We will provide a detailed timeline during our initial consultation." },
              { question: "What is your pricing structure?", answer: "We offer flexible pricing based on project requirements. We provide detailed quotes after an initial discovery session to understand your specific needs and goals." },
              { question: "Do you offer ongoing support?", answer: "Yes, we offer several maintenance and support packages to keep your site running smoothly, secure, and up-to-date after launch." },
              { question: "Can I update the website myself?", answer: "Absolutely. We build all websites with an easy-to-use content management system that allows you to make updates, add content, and manage your site without technical knowledge." },
              { question: "Do you work with businesses outside my area?", answer: "Yes, we work with clients worldwide. Our team collaborates remotely with clients across different time zones using modern communication tools." },
              { question: "What technologies do you use?", answer: "We use modern, industry-standard technologies including React, Next.js, TypeScript, and cloud-based infrastructure to ensure your site is fast, secure, and scalable." },
              { question: "How do I get started?", answer: "Simply reach out through our contact page or give us a call. We will schedule a free consultation to discuss your project, goals, and how we can help." },
              { question: "Do you provide SEO services?", answer: "Yes, SEO is integrated into everything we build. We also offer dedicated SEO packages for ongoing optimization, content strategy, and performance monitoring." },
              { question: "What is your refund policy?", answer: "We work in phases with approval checkpoints to ensure satisfaction. If you are not happy with the direction, we will work with you to make it right before moving to the next phase." },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "cta",
          position: 0,
          content: {
            title: "Still Have Questions?",
            subtitle: "Our team is here to help. Reach out and we will get back to you promptly.",
            buttonText: "Contact Us",
            buttonLink: "/contact",
          },
        },
      ],
    },
  ],
};

const PRICING_TEMPLATE: PageTemplate = {
  key: "pricing",
  feature_key: "analytics",
  title: "Pricing",
  slug: "pricing",
  requiredPlans: ["growth", "pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "heading",
          position: 0,
          content: {
            text: "Simple, Transparent Pricing",
            level: 1,
            alignment: "center",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "pricing_table",
          position: 0,
          content: {
            title: "",
            subtitle: "Choose the plan that fits your business needs",
            tiers: [
              {
                name: "Starter",
                price: "$29",
                period: "month",
                features: [
                  "Up to 5 pages",
                  "Contact form",
                  "Media gallery",
                  "Basic analytics",
                  "Email support",
                ],
                ctaText: "Get Started",
                ctaLink: "/contact",
              },
              {
                name: "Growth",
                price: "$79",
                period: "month",
                features: [
                  "Up to 25 pages",
                  "Blog & SEO tools",
                  "Custom domain",
                  "Advanced analytics",
                  "Priority support",
                  "Services page",
                ],
                ctaText: "Choose Growth",
                ctaLink: "/contact",
                highlighted: true,
              },
              {
                name: "Pro",
                price: "$199",
                period: "month",
                features: [
                  "Unlimited pages",
                  "Everything in Growth",
                  "Portfolio & team pages",
                  "Events management",
                  "White-label branding",
                  "API access",
                  "Dedicated support",
                ],
                ctaText: "Go Pro",
                ctaLink: "/contact",
              },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "faq",
          position: 0,
          content: {
            title: "Pricing FAQ",
            items: [
              { question: "Can I change plans later?", answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated." },
              { question: "Is there a free trial?", answer: "We offer a 14-day free trial on all plans so you can explore the features before committing." },
              { question: "What payment methods do you accept?", answer: "We accept all major credit cards, debit cards, and bank transfers through our secure payment processor." },
              { question: "Are there any long-term contracts?", answer: "No, all plans are month-to-month with no long-term commitment. You can cancel anytime." },
              { question: "Do you offer discounts for annual billing?", answer: "Yes, you save 20% when you choose annual billing on any plan." },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 3,
      blocks: [
        {
          type: "cta",
          position: 0,
          content: {
            title: "Ready to Get Started?",
            subtitle: "Start your free trial today. No credit card required.",
            buttonText: "Start Free Trial",
            buttonLink: "/contact",
          },
        },
      ],
    },
  ],
};

const SERVICES_TEMPLATE: PageTemplate = {
  key: "services",
  feature_key: "services_page",
  title: "Services",
  slug: "services",
  requiredPlans: ["growth", "pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "hero",
          position: 0,
          content: {
            title: "Our Services",
            subtitle:
              "Comprehensive digital solutions to help your business grow and succeed online",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "features_list",
          position: 0,
          content: {
            title: "Why Choose Us",
            subtitle: "We bring expertise, creativity, and dedication to every project",
            features: [
              { title: "Expert Team", description: "Our team of specialists brings years of industry experience to your project.", icon: "⭐" },
              { title: "Custom Solutions", description: "Every solution is tailored to your specific business needs and goals.", icon: "🎯" },
              { title: "Fast Delivery", description: "We pride ourselves on delivering high-quality work on time, every time.", icon: "⚡" },
              { title: "Ongoing Support", description: "We are with you long after launch with dedicated support and maintenance.", icon: "🛡️" },
              { title: "Data Driven", description: "Every decision is backed by analytics and real performance data.", icon: "📊" },
              { title: "Scalable", description: "Our solutions grow with your business, from startup to enterprise.", icon: "🚀" },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "services",
          position: 0,
          content: {
            title: "What We Offer",
            services: [
              { name: "Website Design & Development", description: "Custom, responsive websites built with modern technologies for optimal performance and user experience.", icon: "💻" },
              { name: "Search Engine Optimization", description: "Increase your visibility and drive organic traffic with proven SEO strategies and best practices.", icon: "🔍" },
              { name: "Social Media Marketing", description: "Engage your audience and build your brand across all major social media platforms.", icon: "📱" },
              { name: "Content Strategy", description: "Compelling content that tells your story, engages visitors, and converts them into customers.", icon: "✍️" },
              { name: "E-Commerce Solutions", description: "Full-featured online stores with secure payments, inventory management, and analytics.", icon: "🛒" },
              { name: "Brand Identity", description: "Complete branding packages including logo design, color palettes, typography, and brand guidelines.", icon: "🎨" },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 3,
      blocks: [
        {
          type: "testimonials",
          position: 0,
          content: {
            title: "Client Testimonials",
            testimonials: [
              { name: "Emily Watson", role: "Marketing Director, BrightPath", content: "Their SEO strategy doubled our organic traffic in six months. The ROI has been incredible." },
              { name: "David Kim", role: "Owner, Seoul Kitchen", content: "The website they built for our restaurant is stunning. Online orders increased by 150% since launch." },
              { name: "Lisa Zhang", role: "CTO, FinanceHub", content: "Professional, responsive, and technically excellent. They delivered a complex platform on time and on budget." },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 4,
      blocks: [
        {
          type: "cta",
          position: 0,
          content: {
            title: "Let Us Help You Grow",
            subtitle: "Schedule a free consultation to discuss your project and goals.",
            buttonText: "Book a Consultation",
            buttonLink: "/contact",
          },
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRO PLAN PAGES
// ═══════════════════════════════════════════════════════════════════════════════

const PORTFOLIO_TEMPLATE: PageTemplate = {
  key: "portfolio",
  feature_key: "portfolio_page",
  title: "Portfolio",
  slug: "portfolio",
  requiredPlans: ["pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "hero",
          position: 0,
          content: {
            title: "Our Portfolio",
            subtitle: "Showcasing our best work and the results we have delivered for clients",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "portfolio",
          position: 0,
          content: {
            title: "Featured Projects",
            projects: [
              { title: "BrightPath Rebrand", description: "Complete brand overhaul and website redesign for a leading education platform.", imageUrl: "/placeholder-project.jpg", tags: ["Branding", "Web Design"] },
              { title: "Seoul Kitchen Online", description: "E-commerce platform and ordering system for a popular restaurant chain.", imageUrl: "/placeholder-project.jpg", tags: ["E-Commerce", "Development"] },
              { title: "FinanceHub Dashboard", description: "Real-time financial analytics dashboard with complex data visualizations.", imageUrl: "/placeholder-project.jpg", tags: ["SaaS", "UI/UX"] },
              { title: "GreenLeaf Campaign", description: "Multi-channel marketing campaign that achieved 300% ROI in three months.", imageUrl: "/placeholder-project.jpg", tags: ["Marketing", "Strategy"] },
              { title: "TechStart Mobile App", description: "Cross-platform mobile application for a tech startup's core product.", imageUrl: "/placeholder-project.jpg", tags: ["Mobile", "Development"] },
              { title: "Artisan Collective", description: "Marketplace platform connecting independent artists with buyers worldwide.", imageUrl: "/placeholder-project.jpg", tags: ["Marketplace", "Web Design"] },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "reviews_carousel",
          position: 0,
          content: {
            title: "Client Reviews",
            reviews: [
              { author: "Mark Thompson", rating: 5, content: "Exceeded all expectations. The project was delivered ahead of schedule with outstanding quality.", source: "Google" },
              { author: "Anna Kowalski", rating: 5, content: "Incredibly creative team. They brought ideas to the table we hadn't even considered.", source: "Clutch" },
              { author: "James Wilson", rating: 5, content: "The attention to detail and commitment to our vision was remarkable throughout.", source: "Google" },
              { author: "Priya Sharma", rating: 4, content: "Great results and professional communication from start to finish. Highly recommend.", source: "Trustpilot" },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 3,
      blocks: [
        {
          type: "cta",
          position: 0,
          content: {
            title: "Start Your Project",
            subtitle: "Ready to create something amazing together? Let us talk about your vision.",
            buttonText: "Get a Quote",
            buttonLink: "/contact",
          },
        },
      ],
    },
  ],
};

const TEAM_TEMPLATE: PageTemplate = {
  key: "team",
  feature_key: "team_page",
  title: "Our Team",
  slug: "team",
  requiredPlans: ["pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "hero",
          position: 0,
          content: {
            title: "Our Team",
            subtitle: "Meet the talented people who make great things happen",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "team",
          position: 0,
          content: {
            title: "Leadership Team",
            members: [
              { name: "Alex Rivera", role: "Founder & CEO", bio: "Visionary leader with 15+ years in digital strategy and business development. Alex founded the company with a mission to democratize great design." },
              { name: "Jordan Lee", role: "Creative Director", bio: "Award-winning designer with a passion for creating beautiful, functional user experiences that drive results." },
              { name: "Sam Patel", role: "Head of Technology", bio: "Full-stack engineer and architect who loves turning complex business problems into elegant technical solutions." },
              { name: "Maria Santos", role: "Head of Marketing", bio: "Data-driven marketer with expertise in growth strategy, content marketing, and brand development." },
              { name: "Chris Taylor", role: "Lead Developer", bio: "Specialized in modern web frameworks and cloud architecture. Passionate about clean code and performance." },
              { name: "Nina Kowalski", role: "UX Research Lead", bio: "Human-centered design advocate who ensures every product decision is informed by real user needs and behaviors." },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "stats",
          position: 0,
          content: {
            title: "Team Achievements",
            stats: [
              { label: "Awards Won", value: "25", suffix: "+" },
              { label: "Team Members", value: "45" },
              { label: "Combined Experience", value: "120", suffix: " yrs" },
              { label: "Languages Spoken", value: "12" },
            ],
          },
        },
        {
          type: "rich_text",
          position: 1,
          content: {
            html: "<h3>Our Culture</h3><p>We believe that great work comes from great teams. Our culture is built on collaboration, continuous learning, and mutual respect. We celebrate diversity, encourage innovation, and invest in our people's growth and well-being.</p><p>Whether we are brainstorming new ideas, tackling tough challenges, or celebrating wins together, our team brings passion and dedication to everything we do.</p>",
          },
        },
      ],
    },
    {
      type: "default",
      position: 3,
      blocks: [
        {
          type: "cta",
          position: 0,
          content: {
            title: "Join Our Team",
            subtitle: "We are always looking for talented people who share our passion for great work.",
            buttonText: "View Open Positions",
            buttonLink: "/contact",
          },
        },
      ],
    },
  ],
};

const EVENTS_TEMPLATE: PageTemplate = {
  key: "events",
  feature_key: "events_page",
  title: "Events",
  slug: "events",
  requiredPlans: ["pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "hero",
          position: 0,
          content: {
            title: "Upcoming Events",
            subtitle: "Join us at our upcoming events, workshops, and meetups",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "events_list",
          position: 0,
          content: {
            title: "Events Calendar",
            events: [
              { name: "Digital Marketing Workshop", date: "2025-08-15", venue: "Innovation Hub", city: "San Francisco", description: "Hands-on workshop covering the latest digital marketing strategies and tools.", ticketUrl: "#" },
              { name: "Web Design Meetup", date: "2025-09-02", venue: "Creative Space", city: "New York", description: "Monthly meetup for designers to share ideas, get feedback, and network.", ticketUrl: "#" },
              { name: "Tech Conference 2025", date: "2025-09-20", venue: "Convention Center", city: "Austin", description: "Annual conference featuring talks from industry leaders on the future of technology.", ticketUrl: "#" },
              { name: "Brand Strategy Seminar", date: "2025-10-05", venue: "Business Center", city: "Chicago", description: "Learn how to build and maintain a powerful brand that stands out in a crowded market.", ticketUrl: "#" },
              { name: "Holiday Networking Mixer", date: "2025-12-10", venue: "Skyline Lounge", city: "Los Angeles", description: "End-of-year networking event to connect with industry professionals and celebrate the season.", ticketUrl: "#" },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "newsletter",
          position: 0,
          content: {
            title: "Never Miss an Event",
            subtitle: "Subscribe to get notified about upcoming events and early-bird tickets.",
            placeholder: "Your email address",
            buttonText: "Notify Me",
          },
        },
      ],
    },
  ],
};

const REVIEWS_TEMPLATE: PageTemplate = {
  key: "reviews",
  feature_key: "integrations",
  title: "Reviews",
  slug: "reviews",
  requiredPlans: ["pro"],
  sections: [
    {
      type: "default",
      position: 0,
      blocks: [
        {
          type: "hero",
          position: 0,
          content: {
            title: "Customer Reviews",
            subtitle: "See what our clients have to say about working with us",
          },
        },
      ],
    },
    {
      type: "default",
      position: 1,
      blocks: [
        {
          type: "stats",
          position: 0,
          content: {
            title: "Customer Satisfaction",
            stats: [
              { label: "Average Rating", value: "4.9", suffix: "/5" },
              { label: "Total Reviews", value: "340", suffix: "+" },
              { label: "Would Recommend", value: "98", suffix: "%" },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 2,
      blocks: [
        {
          type: "reviews_carousel",
          position: 0,
          content: {
            title: "What People Say",
            reviews: [
              { author: "Sarah Johnson", rating: 5, content: "Absolutely transformed our business. The website they built generates leads on autopilot now.", date: "2025-01-20", source: "Google" },
              { author: "Michael Chen", rating: 5, content: "Best agency we have ever worked with. Professional, creative, and they truly care about results.", date: "2025-01-15", source: "Clutch" },
              { author: "Emily Watson", rating: 5, content: "Our SEO rankings skyrocketed after working with this team. The ROI speaks for itself.", date: "2025-01-10", source: "Trustpilot" },
              { author: "David Kim", rating: 4, content: "Great communication throughout the project. They kept us informed at every stage and delivered on time.", date: "2024-12-28", source: "Google" },
              { author: "Lisa Zhang", rating: 5, content: "The design quality is exceptional. Our customers constantly compliment our new website.", date: "2024-12-15", source: "Google" },
            ],
          },
        },
      ],
    },
    {
      type: "default",
      position: 3,
      blocks: [
        {
          type: "cta",
          position: 0,
          content: {
            title: "Ready to Join Our Happy Clients?",
            subtitle: "Start your project today and see why hundreds of businesses trust us.",
            buttonText: "Get Started",
            buttonLink: "/contact",
          },
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const PAGE_TEMPLATES: Record<string, PageTemplate> = {
  // Starter
  home: HOME_TEMPLATE,
  about: ABOUT_TEMPLATE,
  contact_form: CONTACT_TEMPLATE,
  media_gallery: GALLERY_TEMPLATE,
  // Growth
  blog: BLOG_TEMPLATE,
  faq: FAQ_TEMPLATE,
  pricing: PRICING_TEMPLATE,
  services: SERVICES_TEMPLATE,
  // Pro
  portfolio: PORTFOLIO_TEMPLATE,
  team: TEAM_TEMPLATE,
  events: EVENTS_TEMPLATE,
  reviews: REVIEWS_TEMPLATE,
};

export function getTemplatesForPlan(
  plan: "starter" | "growth" | "pro"
): PageTemplate[] {
  return Object.values(PAGE_TEMPLATES).filter((template) =>
    template.requiredPlans.includes(plan)
  );
}

export function getTemplateByKey(key: string): PageTemplate | undefined {
  return PAGE_TEMPLATES[key];
}

export function getTemplateByFeatureKey(
  featureKey: string
): PageTemplate | undefined {
  return Object.values(PAGE_TEMPLATES).find(
    (template) => template.feature_key === featureKey
  );
}
