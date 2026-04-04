"use client";

import { useState } from "react";
import type { FaqBlockContent } from "../../types";

export function FaqBlock({ content }: { content: FaqBlockContent }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = content.items || [];

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      {content.title && <h2 className="mb-10 text-center text-3xl font-bold">{content.title}</h2>}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-border bg-card">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-semibold"
            >
              {item.question}
              <svg
                className={`h-5 w-5 shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openIndex === i && (
              <div className="border-t border-border px-6 py-4 text-sm text-muted-foreground">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
