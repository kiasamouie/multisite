/**
 * Parser: Stitch screen → ParsedPage.
 *
 * For each section in a Stitch screen, look up STITCH_BLOCK_MAP, translate
 * Stitch field names into our block content keys, and collect any image
 * references that need to be downloaded later.
 *
 * Unmapped sections fall back to "rich_text" and are surfaced as warnings
 * so we know to extend STITCH_BLOCK_MAP / BLOCK_REGISTRY for next time.
 */

import { STITCH_BLOCK_MAP } from "../config/stitchBlockMap";
import type {
  ParsedBlock,
  ParsedPage,
  StitchScreen,
  StitchSection,
  UnmappedComponent,
} from "./types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

function isLikelyUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function translateSection(
  section: StitchSection,
  position: number,
  pageSlug: string
): { block: ParsedBlock; warning?: UnmappedComponent } {
  const mapping = STITCH_BLOCK_MAP[section.type];

  if (!mapping) {
    const block: ParsedBlock = {
      type: "rich_text",
      position,
      content: {
        html: `<!-- Unmapped Stitch section: ${section.type} -->\n<pre>${JSON.stringify(
          section.props,
          null,
          2
        )}</pre>`,
      },
    };
    const warning: UnmappedComponent = {
      stitchType: section.type,
      page: pageSlug,
      position,
      fallback: "rich_text",
      suggestion: `Add "${section.type}" to STITCH_BLOCK_MAP and create a matching block in BLOCK_REGISTRY (see add-block-type prompt).`,
    };
    return { block, warning };
  }

  const content: Record<string, unknown> = {};
  const imageRefs: ParsedBlock["imageRefs"] = [];

  for (const [stitchKey, ourKey] of Object.entries(mapping.contentMapping)) {
    if (stitchKey in section.props) {
      content[ourKey] = section.props[stitchKey];
    }
  }

  for (const imageKey of mapping.imageFields) {
    const candidate = content[imageKey];
    if (isLikelyUrl(candidate)) {
      imageRefs.push({ contentKey: imageKey, remoteUrl: candidate });
    }
  }

  const block: ParsedBlock = {
    type: mapping.blockType,
    position,
    content,
    ...(imageRefs.length > 0 ? { imageRefs } : {}),
  };

  return { block };
}

export function parseStitchScreen(screen: StitchScreen): ParsedPage {
  const slug = screen.slug ?? slugify(screen.name);
  const warnings: UnmappedComponent[] = [];
  const blocks: ParsedBlock[] = [];

  screen.sections.forEach((section, idx) => {
    const { block, warning } = translateSection(section, idx, slug);
    blocks.push(block);
    if (warning) warnings.push(warning);
  });

  return {
    slug,
    title: screen.name,
    blocks,
    warnings,
  };
}

/** Collects every imageRef across a parsed page (helper for the downloader). */
export function collectImageUrls(page: ParsedPage): string[] {
  const urls = new Set<string>();
  for (const block of page.blocks) {
    for (const ref of block.imageRefs ?? []) {
      urls.add(ref.remoteUrl);
    }
  }
  return Array.from(urls);
}
