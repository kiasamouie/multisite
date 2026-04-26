import type { AboutBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs, textAttrs, imageAttrs } from "../../lib/styled-block";

function resolveImageUrl(content: AboutBlockContent): string | undefined {
  if (content.imageId) return `/api/media/${content.imageId}/img`;
  return content.imageUrl || undefined;
}

interface AboutBlockProps {
  content: AboutBlockContent;
}

export function AboutBlock({ content }: AboutBlockProps) {
  const imgUrl = resolveImageUrl(content);
  const title = readStyledText(content.title);
  const body = readStyledText(content.content);
  const sec = sectionAttrs("px-4 py-16", content.sectionStyle);
  const heading = headingAttrs("mb-4 text-3xl font-bold", title.style);
  const txt = textAttrs("", body.style);
  const img = imageAttrs("h-full w-full overflow-hidden rounded-xl object-cover", content.imageStyle);
  return (
    <section className={sec.className} style={sec.style}>
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center">
        <div>
          <h2 className={heading.className} style={heading.style}>{title.value}</h2>
          <div className="prose prose-lg text-muted-foreground">
            <p className={txt.className} style={txt.style}>{body.value}</p>
          </div>
        </div>
        {imgUrl && (
          <img
            src={imgUrl}
            alt={title.value}
            className={img.className}
            style={img.style}
          />
        )}
      </div>
    </section>
  );
}
