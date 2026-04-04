import type { TwoColumnBlockContent } from "../../types";

export function TwoColumnBlock({ content }: { content: TwoColumnBlockContent }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-12 md:grid-cols-2">
        <div
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content.leftHtml || "" }}
        />
        <div
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content.rightHtml || "" }}
        />
      </div>
    </section>
  );
}
