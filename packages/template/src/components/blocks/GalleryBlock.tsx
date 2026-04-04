import type { GalleryBlockContent } from "../../types";

interface GalleryBlockProps {
  content: GalleryBlockContent;
}

export function GalleryBlock({ content }: GalleryBlockProps) {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-6xl">
        {content.title && (
          <h2 className="mb-12 text-center text-3xl font-bold">{content.title}</h2>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.images.map((img, i) => (
            <div key={i} className="group overflow-hidden rounded-xl">
              <img
                src={img.url}
                alt={img.alt}
                className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
              />
              {img.caption && (
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {img.caption}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
