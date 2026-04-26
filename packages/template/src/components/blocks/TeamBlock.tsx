"use client";

import type { TeamBlockContent } from "../../types";
import { useLibraryContent } from "../../renderer/PageContext";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

export function TeamBlock({ content }: { content: TeamBlockContent }) {
  const { getItems } = useLibraryContent();
  const libraryRows = getItems("team", content.teamMemberIds);
  const members =
    libraryRows.length > 0
      ? libraryRows.map((r) => ({
          name: String(r.name ?? ""),
          role: String(r.role ?? ""),
          imageUrl:
            (r.image_id
              ? `/api/media/${r.image_id}/img`
              : (r.image_url as string | null)) ?? undefined,
          bio: (r.bio as string | null) ?? undefined,
        }))
      : content.members || [];

  const title = readStyledText(content.title);
  const sec = sectionAttrs("mx-auto max-w-6xl px-6 py-16", content.sectionStyle);
  const heading = headingAttrs("mb-10 text-center text-3xl font-bold", title.style);

  return (
    <section className={sec.className} style={sec.style}>
      {title.value && <h2 className={heading.className} style={heading.style}>{title.value}</h2>}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 text-center">
            {m.imageUrl ? (
              <img src={m.imageUrl} alt={m.name} className="mx-auto mb-4 h-24 w-24 rounded-full object-cover" loading="lazy" />
            ) : (
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {m.name.charAt(0)}
              </div>
            )}
            <h3 className="text-lg font-bold">{m.name}</h3>
            <p className="text-sm text-primary">{m.role}</p>
            {m.bio && <p className="mt-3 text-sm text-muted-foreground">{m.bio}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
