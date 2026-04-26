import type { MenuCategoryBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

interface MenuCategoryBlockProps {
  content: MenuCategoryBlockContent;
}

export function MenuCategoryBlock({ content }: MenuCategoryBlockProps) {
  const title = readStyledText(content.title);
  const sec = sectionAttrs("px-4 py-16 md:px-12", content.sectionStyle);
  const heading = headingAttrs("text-3xl md:text-4xl font-bold", title.style);

  return (
    <section className={sec.className} style={sec.style}>
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-10 flex items-baseline gap-4 border-b border-border/20 pb-6">
          {content.sectionNumber && (
            <span className="font-serif text-3xl text-primary">{content.sectionNumber}</span>
          )}
          <h2 className={heading.className} style={heading.style}>
            {title.value}
          </h2>
        </div>

        {/* Featured item (editorial highlight) */}
        {content.featuredItem && (
          <div className="mb-12 flex flex-col gap-6 rounded-xl bg-card p-8 shadow-sm md:flex-row md:items-center">
            {content.featuredItem.imageUrl && (
              <div className="shrink-0 overflow-hidden rounded-xl md:w-1/2">
                <img
                  src={content.featuredItem.imageUrl}
                  alt={content.featuredItem.title}
                  className="h-64 w-full object-cover md:h-full"
                />
              </div>
            )}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
                Chef&apos;s Feature
              </span>
              <h3 className="font-serif text-3xl font-bold text-foreground">
                {content.featuredItem.title}
              </h3>
              {content.featuredItem.description && (
                <p className="text-muted-foreground">{content.featuredItem.description}</p>
              )}
              {content.featuredItem.price && (
                <span className="text-xl font-semibold text-foreground">
                  £{content.featuredItem.price}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Items grid with optional section image */}
        <div className={`grid gap-8 ${content.imageUrl ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
          {/* Item list */}
          <div className="space-y-6">
            {content.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-4 border-b border-border/10 pb-6">
                <div className="flex-1">
                  <h3 className="font-serif text-xl font-semibold text-foreground">{item.name}</h3>
                  {item.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
                {item.price && (
                  <span className="shrink-0 text-base font-semibold text-primary">
                    £{item.price}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Category image */}
          {content.imageUrl && (
            <div className="overflow-hidden rounded-xl">
              <img
                src={content.imageUrl}
                alt={title.value}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
