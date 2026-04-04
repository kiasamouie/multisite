"use client";

import type { Page } from "../../types";
import { SectionRenderer } from "../../renderer/SectionRenderer";
import { usePageMedia } from "../../renderer/PageContext";

/**
 * BlogTemplate: template for "blog" feature pages.
 * Renders hero media, then the page title, then all sections/blocks.
 */
export function BlogTemplate({ page }: { page: Page }) {
  const { getByUsageType } = usePageMedia();
  const heroAssets = getByUsageType("hero");
  const thumbnailAssets = getByUsageType("thumbnail");
  const sortedSections = [...page.sections].sort((a, b) => a.position - b.position);

  const heroImage = heroAssets.find((a) => a.type === "image");
  const thumbnail = thumbnailAssets.find((a) => a.type === "image");

  return (
    <main>
      {/* Hero / featured image */}
      {heroImage && (
        <section className="relative overflow-hidden">
          <img
            src={heroImage.signedUrl}
            alt={heroImage.filename}
            className="h-64 w-full object-cover sm:h-80 lg:h-[28rem]"
            loading="eager"
          />
        </section>
      )}

      {/* Article header */}
      <article className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">{page.title}</h1>
        </header>

        {/* Thumbnail (if separate from hero) */}
        {!heroImage && thumbnail && (
          <figure className="mb-8">
            <img
              src={thumbnail.signedUrl}
              alt={thumbnail.filename}
              className="h-auto w-full rounded-lg object-cover"
              loading="lazy"
            />
          </figure>
        )}

        {/* Section/block content */}
        {sortedSections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </article>
    </main>
  );
}
