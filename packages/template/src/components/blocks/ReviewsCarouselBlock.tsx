"use client";

import { useState } from "react";
import type { ReviewsCarouselBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

export function ReviewsCarouselBlock({ content }: { content: ReviewsCarouselBlockContent }) {
  const reviews = content.reviews || [];
  const [current, setCurrent] = useState(0);

  if (reviews.length === 0) return null;

  const review = reviews[current]!;
  const title = readStyledText(content.title);
  const sec = sectionAttrs("mx-auto max-w-3xl px-6 py-16 text-center", content.sectionStyle);
  const heading = headingAttrs("mb-10 text-3xl font-bold", title.style);

  return (
    <section className={sec.className} style={sec.style}>
      {title.value && <h2 className={heading.className} style={heading.style}>{title.value}</h2>}
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="mb-4 flex justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < review.rating ? "text-yellow-500" : "text-muted-foreground/30"}>
              ★
            </span>
          ))}
        </div>
        <p className="text-lg italic">&ldquo;{review.content}&rdquo;</p>
        <p className="mt-4 font-bold">{review.author}</p>
        {review.source && <p className="text-xs text-muted-foreground">via {review.source}</p>}
        {review.date && <p className="text-xs text-muted-foreground">{review.date}</p>}
      </div>
      {reviews.length > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2.5 w-2.5 rounded-full transition ${i === current ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
