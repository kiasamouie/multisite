"use client";

import type { BlogGridBlockContent } from "../../types";
import { useLibraryContent } from "../../renderer/PageContext";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

export function BlogGridBlock({ content }: { content: BlogGridBlockContent }) {
  const { getItems } = useLibraryContent();
  const libraryRows = getItems("blog", content.blogPostIds);
  const posts =
    libraryRows.length > 0
      ? libraryRows.map((r) => ({
          title: String(r.title ?? ""),
          excerpt: String(r.excerpt ?? ""),
          imageUrl:
            (r.image_id
              ? `/api/media/${r.image_id}/img`
              : (r.image_url as string | null)) ?? undefined,
          href: r.slug ? `/blog/${r.slug}` : "#",
          date: (r.published_at as string | null) ?? undefined,
          author: (r.author as string | null) ?? undefined,
        }))
      : content.posts || [];

  const title = readStyledText(content.title);
  const sec = sectionAttrs("mx-auto max-w-6xl px-6 py-16", content.sectionStyle);
  const heading = headingAttrs("mb-10 text-center text-3xl font-bold", title.style);

  return (
    <section className={sec.className} style={sec.style}>
      {title.value && <h2 className={heading.className} style={heading.style}>{title.value}</h2>}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => (
          <a
            key={i}
            href={p.href}
            className="group overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-lg"
          >
            {p.imageUrl && (
              <img
                src={p.imageUrl}
                alt={p.title}
                className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            )}
            <div className="p-5">
              {(p.date || p.author) && (
                <p className="mb-2 text-xs text-muted-foreground">
                  {p.date && p.date}
                  {p.date && p.author && " · "}
                  {p.author && p.author}
                </p>
              )}
              <h3 className="text-lg font-bold group-hover:text-primary">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
