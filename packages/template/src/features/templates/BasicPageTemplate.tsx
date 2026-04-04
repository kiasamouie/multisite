"use client";

import type { Page } from "../../types";
import { SectionRenderer } from "../../renderer/SectionRenderer";
import { usePageMedia } from "../../renderer/PageContext";

/**
 * BasicPageTemplate: the default template for "basic_pages" feature.
 * Renders a hero media slot (usage_type="hero") above the normal section flow.
 * Falls through to the standard section/block renderer for all content.
 */
export function BasicPageTemplate({ page }: { page: Page }) {
  const { getByUsageType } = usePageMedia();
  const heroAssets = getByUsageType("hero");
  const sortedSections = [...page.sections].sort((a, b) => a.position - b.position);

  return (
    <main>
      {/* Hero media slot (if attached) */}
      {heroAssets.length > 0 && heroAssets[0].type === "image" && (
        <section className="relative overflow-hidden">
          <img
            src={heroAssets[0].signedUrl}
            alt={heroAssets[0].filename}
            className="h-64 w-full object-cover sm:h-80 lg:h-96"
            loading="eager"
          />
        </section>
      )}

      {/* Standard section/block content */}
      {sortedSections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </main>
  );
}
