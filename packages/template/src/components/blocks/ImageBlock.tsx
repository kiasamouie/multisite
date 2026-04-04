import type { ImageBlockContent } from "../../types";

export function ImageBlock({ content }: { content: ImageBlockContent }) {
  return (
    <figure className="mx-auto max-w-4xl px-6 py-8">
      <img
        src={content.url}
        alt={content.alt || ""}
        width={content.width}
        height={content.height}
        className="h-auto w-full rounded-lg object-cover"
        loading="lazy"
      />
      {content.caption && (
        <figcaption className="mt-3 text-center text-sm text-muted-foreground">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}
