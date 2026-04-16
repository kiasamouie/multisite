import type { Section, Block } from "@repo/template/types";

/**
 * Puck data types (matching @measured/puck Data shape).
 * Defined locally to avoid importing puck in server-side code.
 */
export interface PuckData {
  content: Array<{
    type: string;
    props: Record<string, unknown> & { id: string };
  }>;
  root: Record<string, unknown>;
}

export interface DbSection {
  type: string;
  position: number;
  blocks: Array<{
    type: string;
    content: Record<string, unknown>;
    position: number;
  }>;
}

/**
 * Convert DB sections+blocks → Puck Data format.
 * Flattens all blocks across sections into a single content array,
 * sorted by section position then block position.
 */
export function dbToPuck(sections: Section[]): PuckData {
  const allBlocks: (Block & { _sectionPos: number })[] = [];

  for (const section of sections) {
    for (const block of section.blocks) {
      allBlocks.push({ ...block, _sectionPos: section.position });
    }
  }

  allBlocks.sort((a, b) => a._sectionPos - b._sectionPos || a.position - b.position);

  return {
    content: allBlocks.map((block) => ({
      type: block.type,
      props: { id: String(block.id), ...block.content },
    })),
    root: {},
  };
}

/**
 * Convert Puck Data → DB-insertable sections+blocks.
 * Creates a single "default" section containing all blocks in order.
 */
export function puckToDb(data: PuckData): DbSection[] {
  return [
    {
      type: "default",
      position: 0,
      blocks: data.content.map((item, index) => {
        // Strip Puck's injected `id` from props to get clean block content
        const { id: _id, ...content } = item.props;
        return {
          type: item.type,
          content,
          position: index,
        };
      }),
    },
  ];
}
