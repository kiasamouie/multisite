import type { SocialLinksBlockContent } from "../../types";

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

  return (
    <section className="mx-auto max-w-2xl px-6 py-12 text-center">
      {content.title && <h2 className="mb-8 text-2xl font-bold">{content.title}</h2>}
      <div className="flex flex-wrap justify-center gap-4">
        {links.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-lg transition hover:border-primary hover:text-primary"
            title={link.label || link.platform}
          >
            {PLATFORM_ICONS[link.platform.toLowerCase()] || link.platform.charAt(0).toUpperCase()}
          </a>
        ))}
      </div>
    </section>
  );
}
