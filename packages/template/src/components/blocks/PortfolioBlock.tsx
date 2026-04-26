"use client";

import type { PortfolioBlockContent } from "../../types";
import { useLibraryContent } from "../../renderer/PageContext";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

export function PortfolioBlock({ content }: { content: PortfolioBlockContent }) {
  const { getItems } = useLibraryContent();
  const libraryRows = getItems("portfolio", content.portfolioItemIds);
  const projects =
    libraryRows.length > 0
      ? libraryRows.map((r) => ({
          title: String(r.title ?? ""),
          description: (r.description as string | null) ?? undefined,
          imageUrl:
            (r.image_id
              ? `/api/media/${r.image_id}/img`
              : (r.image_url as string | null)) ?? "",
          link: (r.link as string | null) ?? undefined,
          tags: r.category ? [String(r.category)] : undefined,
        }))
      : content.projects || [];

  const title = readStyledText(content.title);
  const sec = sectionAttrs("mx-auto max-w-6xl px-6 py-16", content.sectionStyle);
  const heading = headingAttrs("mb-10 text-center text-3xl font-bold", title.style);

  return (
    <section className={sec.className} style={sec.style}>
      {title.value && <h2 className={heading.className} style={heading.style}>{title.value}</h2>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => (
          <div key={i} className="group overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative overflow-hidden">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold">{p.title}</h3>
              {p.description && <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>}
              {p.tags && p.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.tags.map((tag, j) => (
                    <span key={j} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {p.link && (
                <a href={p.link} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
                  View Project →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
