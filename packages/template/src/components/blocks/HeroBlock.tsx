import type { HeroBlockContent } from "../../types";

interface HeroBlockProps {
  content: HeroBlockContent;
}

export function HeroBlock({ content }: HeroBlockProps) {
  return (
    <section
      className="relative flex min-h-[60vh] items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-20 text-center"
      style={
        content.backgroundImage
          ? { backgroundImage: `url(${content.backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      <div className="max-w-3xl">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          {content.title}
        </h1>
        {content.subtitle && (
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
            {content.subtitle}
          </p>
        )}
        {content.ctaText && (
          <a
            href={content.ctaLink || "#"}
            className="inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            {content.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
