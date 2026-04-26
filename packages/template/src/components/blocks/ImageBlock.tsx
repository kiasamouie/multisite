import type { ImageBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, imageAttrs, textAttrs } from "../../lib/styled-block";

function resolveImageUrl(content: ImageBlockContent): string {
  if (content.mediaId) return `/api/media/${content.mediaId}/img`;
  return content.url;
}

export function ImageBlock({ content }: { content: ImageBlockContent }) {
  const src = resolveImageUrl(content);
  const caption = readStyledText(content.caption);
  const sec = sectionAttrs("mx-auto max-w-4xl px-6 py-8", content.sectionStyle);
  const img = imageAttrs("h-auto w-full rounded-lg object-cover", content.imageStyle);
  const cap = textAttrs("mt-3 text-center text-sm text-muted-foreground", caption.style);
  return (
    <figure className={sec.className} style={sec.style}>
      {src ? (
        <img
          src={src}
          alt={content.alt || ""}
          width={content.width}
          height={content.height}
          className={img.className}
          style={img.style}
          loading="lazy"
        />
      ) : (
        <div className="flex h-48 w-full items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
          Select an image from your media library
        </div>
      )}
      {caption.value && (
        <figcaption className={cap.className} style={cap.style}>
          {caption.value}
        </figcaption>
      )}
    </figure>
  );
}
