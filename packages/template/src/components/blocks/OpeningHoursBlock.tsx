import type { OpeningHoursBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

export function OpeningHoursBlock({ content }: { content: OpeningHoursBlockContent }) {
  const hours = content.hours || [];
  const title = readStyledText(content.title);
  const sec = sectionAttrs("mx-auto max-w-md px-6 py-12", content.sectionStyle);
  const heading = headingAttrs("mb-8 text-center text-2xl font-bold", title.style);

  return (
    <section className={sec.className} style={sec.style}>
      {title.value && <h2 className={heading.className} style={heading.style}>{title.value}</h2>}
      <div className="space-y-3">
        {hours.map((h, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <span className="font-medium">{h.day}</span>
            {h.closed ? (
              <span className="text-sm text-muted-foreground">Closed</span>
            ) : (
              <span className="text-sm">
                {h.open} – {h.close}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
