import type { TwoColumnBlockContent } from "../../types";
import { sectionAttrs } from "../../lib/styled-block";

export function TwoColumnBlock({ content }: { content: TwoColumnBlockContent }) {
  const sec = sectionAttrs("mx-auto max-w-6xl px-6 py-12", content.sectionStyle);
  return (
    <section className={sec.className} style={sec.style}>
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
