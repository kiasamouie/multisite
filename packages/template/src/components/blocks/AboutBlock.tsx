import type { AboutBlockContent } from "../../types";

function resolveImageUrl(content: AboutBlockContent): string | undefined {
  if (content.imageId) return `/api/media/${content.imageId}/img`;
  return content.imageUrl || undefined;
}

interface AboutBlockProps {
  content: AboutBlockContent;
}

export function AboutBlock({ content }: AboutBlockProps) {
  const imgUrl = resolveImageUrl(content);
  return (
    <section className="px-4 py-16">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="mb-4 text-3xl font-bold">{content.title}</h2>
          <div className="prose prose-lg text-muted-foreground">
            <p>{content.content}</p>
          </div>
        </div>
        {imgUrl && (
          <div className="overflow-hidden rounded-xl">
            <img
              src={imgUrl}
              alt={content.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}
