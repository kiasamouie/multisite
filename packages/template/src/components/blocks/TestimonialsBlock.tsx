"use client";

import type { TestimonialsBlockContent } from "../../types";
import { useLibraryContent } from "../../renderer/PageContext";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

interface TestimonialsBlockProps {
  content: TestimonialsBlockContent;
}

export function TestimonialsBlock({ content }: TestimonialsBlockProps) {
  const { getItems } = useLibraryContent();
  const libraryRows = getItems("testimonials", content.testimonialIds);
  const testimonials =
    libraryRows.length > 0
      ? libraryRows.map((r) => ({
          name: String(r.name ?? ""),
          role: (r.role as string | null) ?? undefined,
          content: String(r.content ?? ""),
          avatarUrl:
            (r.avatar_id
              ? `/api/media/${r.avatar_id}/img`
              : (r.avatar_url as string | null)) ?? undefined,
        }))
      : content.testimonials || [];

  const title = readStyledText(content.title);
  const sec = sectionAttrs("px-4 py-16", content.sectionStyle);
  const heading = headingAttrs("mb-12 text-center text-3xl font-bold", title.style);

  return (
    <section className={sec.className} style={sec.style}>
      <div className="mx-auto max-w-6xl">
        <h2 className={heading.className} style={heading.style}>{title.value}</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
              <p className="mb-4 italic text-muted-foreground">&ldquo;{t.content}&rdquo;</p>
              <div className="flex items-center gap-3">
                {t.avatarUrl && (
                  <img
                    src={t.avatarUrl}
                    alt={t.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  {t.role && (
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
