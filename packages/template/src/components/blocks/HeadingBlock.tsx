import type { HeadingBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs } from "../../lib/styled-block";

export function HeadingBlock({ content }: { content: HeadingBlockContent }) {
  const level = content.level || 2;
  const sizeMap: Record<number, string> = {
    1: "text-5xl font-extrabold",
    2: "text-4xl font-bold",
    3: "text-3xl font-semibold",
    4: "text-2xl font-semibold",
  };

  const t = readStyledText(content.text);
  // Legacy `alignment` field acts as a default when the heading style
  // hasn't set its own `align`. New content uses the Style panel.
  const styleWithAlign = t.style?.align
    ? t.style
    : { ...(t.style ?? {}), align: content.alignment };
  const sec = sectionAttrs(`mx-auto max-w-4xl px-6 py-8`, content.sectionStyle);
  const heading = headingAttrs(sizeMap[level] || sizeMap[2], styleWithAlign);

  return (
    <section className={sec.className} style={sec.style}>
      {level === 1 && <h1 className={heading.className} style={heading.style}>{t.value}</h1>}
      {level === 2 && <h2 className={heading.className} style={heading.style}>{t.value}</h2>}
      {level === 3 && <h3 className={heading.className} style={heading.style}>{t.value}</h3>}
      {level === 4 && <h4 className={heading.className} style={heading.style}>{t.value}</h4>}
      {level > 4 && <h5 className={heading.className} style={heading.style}>{t.value}</h5>}
    </section>
  );
}
