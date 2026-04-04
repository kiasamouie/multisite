import type { HeadingBlockContent } from "../../types";

export function HeadingBlock({ content }: { content: HeadingBlockContent }) {
  const alignment = content.alignment || "left";
  const alignClass = alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : "text-left";

  const level = content.level || 2;
  const sizeMap: Record<number, string> = {
    1: "text-5xl font-extrabold",
    2: "text-4xl font-bold",
    3: "text-3xl font-semibold",
    4: "text-2xl font-semibold",
  };

  const className = `${sizeMap[level] || sizeMap[2]}`;

  return (
    <section className={`mx-auto max-w-4xl px-6 py-8 ${alignClass}`}>
      {level === 1 && <h1 className={className}>{content.text}</h1>}
      {level === 2 && <h2 className={className}>{content.text}</h2>}
      {level === 3 && <h3 className={className}>{content.text}</h3>}
      {level === 4 && <h4 className={className}>{content.text}</h4>}
      {level > 4 && <h5 className={className}>{content.text}</h5>}
    </section>
  );
}
