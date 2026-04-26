import type { HeroBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs, textAttrs, buttonAttrs } from "../../lib/styled-block";

function resolveImageUrl(content: HeroBlockContent): string | undefined {
  if (content.backgroundImageId) return `/api/media/${content.backgroundImageId}/img`;
  return content.backgroundImage || undefined;
}

interface HeroBlockProps {
  content: HeroBlockContent;
}

export function HeroBlock({ content }: HeroBlockProps) {
  const bgUrl = resolveImageUrl(content);
  const title = readStyledText(content.title);
  const subtitle = readStyledText(content.subtitle);
  const sec = sectionAttrs(
    "relative flex min-h-[60vh] items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-20 text-center",
    content.sectionStyle,
  );
  const heading = headingAttrs(
    "mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl",
    title.style,
  );
  const sub = textAttrs("mb-8 text-lg text-muted-foreground sm:text-xl", subtitle.style);
  const btn = buttonAttrs(
    "inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90",
    content.ctaButtonStyle,
  );
  return (
    <section
      className={sec.className}
      style={
        bgUrl
          ? { ...sec.style, backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : sec.style
      }
    >
      <div className="max-w-3xl">
        <h1 className={heading.className} style={heading.style}>
          {title.value}
        </h1>
        {subtitle.value && (
          <p className={sub.className} style={sub.style}>
            {subtitle.value}
          </p>
        )}
        {content.ctaText && (
          <a
            href={content.ctaLink || "#"}
            className={btn.className}
            style={btn.style}
          >
            {content.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
