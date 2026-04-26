import type { MapBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

export function MapBlock({ content }: { content: MapBlockContent }) {
  const title = readStyledText(content.title);
  const sec = sectionAttrs("mx-auto max-w-4xl px-6 py-12", content.sectionStyle);
  const heading = headingAttrs("mb-6 text-2xl font-bold", title.style);
  return (
    <section className={sec.className} style={sec.style}>
      {title.value && <h2 className={heading.className} style={heading.style}>{title.value}</h2>}
      {content.embedUrl ? (
        <div className="relative overflow-hidden rounded-lg pt-[56.25%]">
          <iframe
            src={content.embedUrl}
            title={title.value || "Map"}
            className="absolute inset-0 h-full w-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-border bg-muted">
          <p className="text-muted-foreground">{content.address}</p>
        </div>
      )}
      {content.address && content.embedUrl && (
        <p className="mt-4 text-sm text-muted-foreground">{content.address}</p>
      )}
    </section>
  );
}
