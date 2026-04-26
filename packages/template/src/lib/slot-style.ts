/**
 * Shared style helpers for header/footer slot items.
 * Translates the declarative style fields on `HeaderSlotItem` into
 * a Tailwind class string + inline style object applied to the rendered
 * element (span/img/button anchor).
 *
 * Used by both the Puck block previews (NavbarBlock, SiteFooterBlock)
 * and the public-facing SiteNav / SiteFooter components.
 */

import type { CSSProperties } from "react";
import type { HeaderSlotItem } from "../types";
import type { ContentStyle } from "./content-style";

const TEXT_SIZE_CLASS: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

const TEXT_WEIGHT_CLASS: Record<string, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const ROUNDED_CLASS: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

const BUTTON_SIZE_CLASS: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  default: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export interface SlotItemStyle {
  textClass: string;
  imageClass: string;
  buttonClass: string;
  textStyle: CSSProperties;
  imageStyle: CSSProperties;
  buttonStyle: CSSProperties;
  wrapperStyle: CSSProperties;
}

/**
 * Map ContentStyle weight (incl. `extrabold`) into the slot-item weight set.
 */
function mapWeight(
  w?: ContentStyle["weight"],
): HeaderSlotItem["textWeight"] | undefined {
  if (!w) return undefined;
  if (w === "extrabold") return "bold";
  return w;
}

/**
 * Merge group-level defaults (e.g. `content.itemTextStyle` from the
 * header/footer block) into a slot item. Per-item fields always win.
 */
function mergeDefaults(
  item: HeaderSlotItem,
  defaults?: ContentStyle,
): HeaderSlotItem {
  if (!defaults) return item;
  return {
    ...item,
    textSizePx: item.textSizePx ?? defaults.fontSizePx,
    textWeight: item.textWeight ?? mapWeight(defaults.weight),
    textColor: item.textColor ?? defaults.color,
    italic: item.italic ?? defaults.italic,
    fontFamily: item.fontFamily ?? defaults.fontFamily,
    lineHeight: item.lineHeight ?? defaults.lineHeight,
    letterSpacingEm: item.letterSpacingEm ?? defaults.letterSpacingEm,
    textTransform: item.textTransform ?? defaults.textTransform,
    textDecoration: item.textDecoration ?? defaults.textDecoration,
  };
}

/**
 * Derive class names and inline styles for a slot item.
 * Callers apply `textClass`+`textStyle` to the `<span>` for text kind,
 * `imageClass`+`imageStyle` to the `<img>` for image kind, and
 * `buttonClass`+`buttonStyle` to the button anchor for button kind.
 * `wrapperStyle` is applied to the outer link/element (handles marginX).
 *
 * `defaults` is an optional group-level ContentStyle (e.g. the header
 * block's `itemTextStyle`) whose typography values are used when the
 * matching field on the item itself is unset.
 */
export function styleSlotItem(
  rawItem: HeaderSlotItem,
  defaults?: ContentStyle,
): SlotItemStyle {
  const item = mergeDefaults(rawItem, defaults);
  const usePxText = typeof item.textSizePx === "number" && item.textSizePx > 0;
  const textClass = [
    usePxText
      ? ""
      : TEXT_SIZE_CLASS[item.textSize ?? "base"] ?? TEXT_SIZE_CLASS.base,
    TEXT_WEIGHT_CLASS[item.textWeight ?? "medium"] ?? TEXT_WEIGHT_CLASS.medium,
    item.italic ? "italic" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const textStyle: CSSProperties = {};
  if (item.textColor) textStyle.color = item.textColor;
  if (usePxText) textStyle.fontSize = `${item.textSizePx}px`;
  if (item.fontFamily) textStyle.fontFamily = item.fontFamily;
  if (typeof item.lineHeight === "number" && item.lineHeight > 0) {
    textStyle.lineHeight = item.lineHeight;
  }
  if (typeof item.letterSpacingEm === "number") {
    textStyle.letterSpacing = `${item.letterSpacingEm}em`;
  }
  if (item.textTransform && item.textTransform !== "none") {
    textStyle.textTransform = item.textTransform;
  }
  if (item.textDecoration && item.textDecoration !== "none") {
    textStyle.textDecoration = item.textDecoration;
  }

  const usePxRounded =
    typeof item.imageRoundedPx === "number" && item.imageRoundedPx >= 0;
  const imageRounded = usePxRounded
    ? ""
    : ROUNDED_CLASS[item.imageRounded ?? "none"] ?? ROUNDED_CLASS.none;
  const imageClass = `${imageRounded} w-auto object-contain`.trim();
  const imageStyle: CSSProperties = {};
  if (typeof item.imageHeight === "number" && item.imageHeight > 0) {
    imageStyle.height = `${item.imageHeight}px`;
  } else {
    imageStyle.height = "32px";
  }
  if (usePxRounded) imageStyle.borderRadius = `${item.imageRoundedPx}px`;

  const buttonClass = [
    "inline-flex items-center font-medium shadow-sm transition",
    BUTTON_SIZE_CLASS[item.buttonSize ?? "default"] ??
      BUTTON_SIZE_CLASS.default,
    item.variant === "outline"
      ? "border border-current rounded-md"
      : item.variant === "ghost"
        ? "rounded-md"
        : "rounded-md",
  ].join(" ");

  const buttonStyle: CSSProperties = {};
  if (item.buttonFg) buttonStyle.color = item.buttonFg;
  if (item.variant === "default") {
    buttonStyle.backgroundColor = item.buttonBg ?? "rgb(37 99 235)"; // blue-600
    if (!item.buttonFg) buttonStyle.color = "#ffffff";
  }
  // Typography also applies to button labels.
  if (item.fontFamily) buttonStyle.fontFamily = item.fontFamily;
  if (typeof item.lineHeight === "number" && item.lineHeight > 0) {
    buttonStyle.lineHeight = item.lineHeight;
  }
  if (typeof item.letterSpacingEm === "number") {
    buttonStyle.letterSpacing = `${item.letterSpacingEm}em`;
  }
  if (item.textTransform && item.textTransform !== "none") {
    buttonStyle.textTransform = item.textTransform;
  }
  if (item.textDecoration && item.textDecoration !== "none") {
    buttonStyle.textDecoration = item.textDecoration;
  }
  if (usePxText) buttonStyle.fontSize = `${item.textSizePx}px`;
  if (item.italic) buttonStyle.fontStyle = "italic";

  const wrapperStyle: CSSProperties = {};
  if (typeof item.marginX === "number" && item.marginX > 0) {
    wrapperStyle.marginLeft = `${item.marginX}px`;
    wrapperStyle.marginRight = `${item.marginX}px`;
  }

  return {
    textClass,
    imageClass,
    buttonClass,
    textStyle,
    imageStyle,
    buttonStyle,
    wrapperStyle,
  };
}

/**
 * Resolve a group-level ContentStyle into an inline style for plain text
 * elements that don't have per-item overrides (e.g. the auto-generated
 * navPages anchors in the header). Returns `undefined` when nothing
 * meaningful is set so callers can keep their default Tailwind classes.
 */
export function resolveSlotGroupTextStyle(
  defaults?: ContentStyle,
): CSSProperties | undefined {
  if (!defaults) return undefined;
  const s: CSSProperties = {};
  if (defaults.color) s.color = defaults.color;
  if (typeof defaults.fontSizePx === "number" && defaults.fontSizePx > 0) {
    s.fontSize = `${defaults.fontSizePx}px`;
  }
  if (defaults.weight) {
    const map: Record<string, number> = {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    };
    if (map[defaults.weight]) s.fontWeight = map[defaults.weight];
  }
  if (defaults.italic) s.fontStyle = "italic";
  if (defaults.fontFamily) s.fontFamily = defaults.fontFamily;
  if (typeof defaults.lineHeight === "number" && defaults.lineHeight > 0) {
    s.lineHeight = defaults.lineHeight;
  }
  if (typeof defaults.letterSpacingEm === "number") {
    s.letterSpacing = `${defaults.letterSpacingEm}em`;
  }
  if (defaults.textTransform && defaults.textTransform !== "none") {
    s.textTransform = defaults.textTransform;
  }
  if (defaults.textDecoration && defaults.textDecoration !== "none") {
    s.textDecoration = defaults.textDecoration;
  }
  return Object.keys(s).length > 0 ? s : undefined;
}
