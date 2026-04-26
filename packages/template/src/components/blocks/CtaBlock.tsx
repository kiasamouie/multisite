import type { CtaBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs, textAttrs, buttonAttrs } from "../../lib/styled-block";

interface CtaBlockProps {
  content: CtaBlockContent;
}

export function CtaBlock({ content }: CtaBlockProps) {
  const title = readStyledText(content.title);
  const subtitle = readStyledText(content.subtitle);
  const sec = sectionAttrs("bg-primary px-4 py-16 text-primary-foreground", content.sectionStyle);
  const heading = headingAttrs("mb-4 text-3xl font-bold", title.style);
  const sub = textAttrs("mb-8 text-lg opacity-90", subtitle.style);
  const btn = buttonAttrs(
    "inline-flex h-11 items-center rounded-md bg-background px-8 text-sm font-medium text-foreground shadow transition-colors hover:bg-background/90",
    content.ctaButtonStyle,
  );
  return (
    <section className={sec.className} style={sec.style}>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className={heading.className} style={heading.style}>{title.value}</h2>
        {subtitle.value && (
          <p className={sub.className} style={sub.style}>{subtitle.value}</p>
        )}
        <a
          href={content.buttonLink}
          className={btn.className}
          style={btn.style}
        >
          {content.buttonText}
        </a>
      </div>
    </section>
  );
}
