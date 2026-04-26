import type { GalleryBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

interface GalleryBlockProps {
  content: GalleryBlockContent;
}

export function GalleryBlock({ content }: GalleryBlockProps) {
  // Prefer media-library selection over inline URL list.
  const images =
    content.galleryMediaIds && content.galleryMediaIds.length > 0
      ? content.galleryMediaIds.map((id) => ({
          url: `/api/media/${id}/img`,
          alt: "",
          caption: undefined as string | undefined,
        }))
      : content.images || [];

  const title = readStyledText(content.title);
  const sec = sectionAttrs("px-4 py-16", content.sectionStyle);
  const heading = headingAttrs("mb-12 text-center text-3xl font-bold", title.style);

  return (
    <section className={sec.className} style={sec.style}>
      <div className="mx-auto max-w-6xl">
        {title.value && (
          <h2 className={heading.className} style={heading.style}>{title.value}</h2>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <div key={i} className="group overflow-hidden rounded-xl">
              {img.url ? (
                <img
                  src={img.url}
                  alt={img.alt}
                  className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                  No image
                </div>
              )}
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
