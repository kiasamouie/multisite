"use client";

import type { EventsListBlockContent } from "../../types";
import { useLibraryContent } from "../../renderer/PageContext";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

export function EventsListBlock({ content }: { content: EventsListBlockContent }) {
  const { getItems } = useLibraryContent();
  const libraryRows = getItems("events", content.eventIds);
  const events =
    libraryRows.length > 0
      ? libraryRows.map((r) => ({
          name: String(r.name ?? ""),
          date: String(r.date ?? ""),
          venue: (r.venue as string | null) ?? undefined,
          city: (r.city as string | null) ?? undefined,
          ticketUrl: (r.ticket_url as string | null) ?? undefined,
          description: (r.description as string | null) ?? undefined,
        }))
      : content.events || [];

  const title = readStyledText(content.title);
  const sec = sectionAttrs("mx-auto max-w-4xl px-6 py-16", content.sectionStyle);
  const heading = headingAttrs("mb-10 text-center text-3xl font-bold", title.style);

  return (
    <section className={sec.className} style={sec.style}>
      {title.value && <h2 className={heading.className} style={heading.style}>{title.value}</h2>}
      <div className="space-y-4">
        {events.map((e, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="text-lg font-bold leading-none">
                  {new Date(e.date).getDate()}
                </span>
                <span className="text-[10px] uppercase">
                  {new Date(e.date).toLocaleDateString("en", { month: "short" })}
                </span>
              </div>
              <div>
                <h3 className="font-bold">{e.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {e.venue && e.venue}
                  {e.venue && e.city && " · "}
                  {e.city && e.city}
                </p>
                {e.description && <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>}
              </div>
            </div>
            {e.ticketUrl && (
              <a
                href={e.ticketUrl}
                className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                Get Tickets
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
