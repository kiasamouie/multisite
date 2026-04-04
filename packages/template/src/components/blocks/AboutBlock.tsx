import type { AboutBlockContent } from "../../types";

interface AboutBlockProps {
  content: AboutBlockContent;
}

export function AboutBlock({ content }: AboutBlockProps) {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="mb-4 text-3xl font-bold">{content.title}</h2>
          <div className="prose prose-lg text-muted-foreground">
            <p>{content.content}</p>
          </div>
        </div>
        {content.imageUrl && (
          <div className="overflow-hidden rounded-xl">
            <img
              src={content.imageUrl}
              alt={content.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}
