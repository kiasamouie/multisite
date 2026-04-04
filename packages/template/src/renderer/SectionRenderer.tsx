import type { Section } from "../types";
import { BlockRenderer } from "./BlockRenderer";

interface SectionRendererProps {
  section: Section;
}

export function SectionRenderer({ section }: SectionRendererProps) {
  const sortedBlocks = [...section.blocks].sort((a, b) => a.position - b.position);

  return (
    <div data-section-type={section.type} data-section-id={section.id}>
      {sortedBlocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}
