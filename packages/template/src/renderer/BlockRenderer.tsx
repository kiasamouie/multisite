import type { Block } from "../types";
import { BLOCK_REGISTRY } from "../blocks/registry";

interface BlockRendererProps {
  block: Block;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  // site_header / site_footer blocks are rendered globally by layout.tsx
  // via SiteNav and SiteFooter. Suppress inline rendering so they don't
  // appear duplicated on each page.
  if (
    block.type === "site_header" ||
    block.type === "site_footer" ||
    block.type === "page_content_placeholder"
  )
    return null;

  const Component = BLOCK_REGISTRY.getComponent(block.type);

  if (!Component) {
    if (process.env.NODE_ENV === "development") {
      return (
        <div className="border-2 border-dashed border-yellow-400 bg-yellow-50 p-4 text-center text-sm text-yellow-700">
          Unknown block type: <strong>{block.type}</strong>
        </div>
      );
    }
    return null;
  }

  return <Component content={block.content} />;
}
