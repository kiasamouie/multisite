import type { CtaBlockContent } from "../../types";

interface CtaBlockProps {
  content: CtaBlockContent;
}

export function CtaBlock({ content }: CtaBlockProps) {
  return (
    <section className="bg-primary px-4 py-16 text-primary-foreground">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold">{content.title}</h2>
        {content.subtitle && (
          <p className="mb-8 text-lg opacity-90">{content.subtitle}</p>
        )}
        <a
          href={content.buttonLink}
          className="inline-flex h-11 items-center rounded-md bg-background px-8 text-sm font-medium text-foreground shadow transition-colors hover:bg-background/90"
        >
          {content.buttonText}
        </a>
      </div>
    </section>
  );
}
