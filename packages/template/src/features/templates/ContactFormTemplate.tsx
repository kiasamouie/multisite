"use client";

import type { Page } from "../../types";
import { SectionRenderer } from "../../renderer/SectionRenderer";
import { usePageMedia } from "../../renderer/PageContext";

/**
 * ContactFormTemplate: template for "contact_form" feature pages.
 * Renders hero media, contact card with page title, then sections.
 */
export function ContactFormTemplate({ page }: { page: Page }) {
  const { getByUsageType } = usePageMedia();
  const heroAssets = getByUsageType("hero");
  const sortedSections = [...page.sections].sort((a, b) => a.position - b.position);

  const heroImage = heroAssets.find((a) => a.type === "image");

  return (
    <main>
      {/* Hero with overlay */}
      <section className="relative flex min-h-[40vh] items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-16 text-center">
        {heroImage && (
          <img
            src={heroImage.signedUrl}
            alt={heroImage.filename}
            className="absolute inset-0 h-full w-full object-cover opacity-20"
            loading="eager"
          />
        )}
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight">{page.title}</h1>
        </div>
      </section>

      {/* Standard section/block content (including contact block) */}
      {sortedSections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </main>
  );
}
