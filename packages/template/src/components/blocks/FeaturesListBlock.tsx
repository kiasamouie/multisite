import type { FeaturesListBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs, textAttrs } from "../../lib/styled-block";

export function FeaturesListBlock({ content }: { content: FeaturesListBlockContent }) {
  const features = content.features || [];
  const title = readStyledText(content.title);
  const subtitle = readStyledText(content.subtitle);
  const sec = sectionAttrs("mx-auto max-w-6xl px-6 py-16", content.sectionStyle);
  const heading = headingAttrs("text-3xl font-bold", title.style);
  const sub = textAttrs("mt-4 text-lg text-muted-foreground", subtitle.style);

  return (
    <section className={sec.className} style={sec.style}>
      {(title.value || subtitle.value) && (
        <div className="mb-12 text-center">
          {title.value && <h2 className={heading.className} style={heading.style}>{title.value}</h2>}
          {subtitle.value && <p className={sub.className} style={sub.style}>{subtitle.value}</p>}
        </div>
      )}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            {f.icon && (
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl text-primary">
                {f.icon}
              </div>
            )}
            <h3 className="text-lg font-bold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
