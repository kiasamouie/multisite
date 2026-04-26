/**
 * Block styling helpers — thin wrappers around `resolveContentStyle` so
 * block components can apply user-provided styles in one line.
 *
 *   <section {...sectionAttrs("px-4 py-16", content.sectionStyle)}>
 *
 *   const t = readStyledText(content.title);
 *   <h2 {...headingAttrs("mb-4 text-3xl font-bold", t.style)}>{t.value}</h2>
 *
 * The helpers always merge the caller's base classes with whatever the
 * user picked in the editor. If the user picks nothing the output is
 * identical to the previous hard-coded markup.
 */
import type { CSSProperties } from "react";
import { cn } from "@repo/ui/cn";
import { resolveContentStyle, type ContentStyle } from "./content-style";

// User-provided classes go LAST so `tailwind-merge` lets them win
// against the block's hard-coded defaults (e.g. user `max-w-2xl`
// replaces the block's `max-w-6xl`, user `py-8` replaces `py-16`).
function merge(base: string, extra: string): string {
  return cn(base, extra);
}

export function sectionAttrs(
  base: string,
  style: ContentStyle | undefined,
): { className: string; style: CSSProperties } {
  const r = resolveContentStyle("section", style);
  return { className: merge(base, r.className), style: r.style };
}

export function headingAttrs(
  base: string,
  style: ContentStyle | undefined,
): { className: string; style: CSSProperties } {
  const r = resolveContentStyle("heading", style);
  return { className: merge(base, r.className), style: r.style };
}

export function textAttrs(
  base: string,
  style: ContentStyle | undefined,
): { className: string; style: CSSProperties } {
  const r = resolveContentStyle("text", style);
  return { className: merge(base, r.className), style: r.style };
}

export function imageAttrs(
  base: string,
  style: ContentStyle | undefined,
): { className: string; style: CSSProperties; aspectPadding?: string } {
  const r = resolveContentStyle("image", style);
  return {
    className: merge(base, r.className),
    style: r.style,
    aspectPadding: r.aspectPadding,
  };
}

export function buttonAttrs(
  base: string,
  style: ContentStyle | undefined,
): { className: string; style: CSSProperties } {
  const r = resolveContentStyle("button", style);
  return { className: merge(base, r.className), style: r.style };
}
