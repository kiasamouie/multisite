import type { ImageBlockContent } from "../../types";

function resolveImageUrl(content: ImageBlockContent): string {
  if (content.mediaId) return `/api/media/${content.mediaId}/img`;
  return content.url;
}

export function ImageBlock({ content }: { content: ImageBlockContent }) {
  const src = resolveImageUrl(content);
  return (
    <figure className="mx-auto max-w-4xl px-6 py-8">
      <img
        src={src}
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
