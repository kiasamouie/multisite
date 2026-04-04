import type { RichTextBlockContent } from "../../types";

export function RichTextBlock({ content }: { content: RichTextBlockContent }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <div
        className="prose prose-lg dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content.html || "" }}
      />
    </section>
  );
}
