import type { RichTextBlockContent } from "../../types";
import { sectionAttrs } from "../../lib/styled-block";

export function RichTextBlock({ content }: { content: RichTextBlockContent }) {
  const sec = sectionAttrs("mx-auto max-w-3xl px-6 py-12", content.sectionStyle);
  return (
    <section className={sec.className} style={sec.style}>
      <div
        className="prose prose-lg dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content.html || "" }}
      />
    </section>
  );
}
