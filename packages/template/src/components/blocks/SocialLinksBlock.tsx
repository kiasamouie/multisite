import type { SocialLinksBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

const PLATFORM_ICONS: Record<string, string> = {
  twitter: "𝕏",
  x: "𝕏",
  facebook: "f",
  instagram: "📷",
  linkedin: "in",
  youtube: "▶",
  tiktok: "♪",
  github: "⌨",
  spotify: "🎵",
  soundcloud: "☁",
};

export function SocialLinksBlock({ content }: { content: SocialLinksBlockContent }) {
  const links = content.links || [];
  const title = readStyledText(content.title);
  const sec = sectionAttrs("mx-auto max-w-2xl px-6 py-12 text-center", content.sectionStyle);
  const heading = headingAttrs("mb-8 text-2xl font-bold", title.style);

  return (
    <section className={sec.className} style={sec.style}>
      {title.value && <h2 className={heading.className} style={heading.style}>{title.value}</h2>}
      <div className="flex flex-wrap justify-center gap-4">
        {links.map((link, i) => {
          const platform = link.platform ?? "";
          return (
            <a
              key={i}
              href={link.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-lg transition hover:border-primary hover:text-primary"
              title={link.label || platform}
            >
              {PLATFORM_ICONS[platform.toLowerCase()] || platform.charAt(0).toUpperCase() || "?"}
            </a>
          );
        })}
      </div>
    </section>
  );
}
