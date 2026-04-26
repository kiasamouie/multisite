"use client";

import type { SiteFooterBlockContent, HeaderSlotItem } from "../../types";
import { styleSlotItem } from "../../lib/slot-style";
import { sectionAttrs } from "../../lib/styled-block";

interface SiteFooterBlockProps {
  content: SiteFooterBlockContent;
}

function SlotItem({ item }: { item: HeaderSlotItem }) {
  const { kind, text, imageId, href } = item;
  const s = styleSlotItem(item);

  if (kind === "image" && imageId) {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/media/${imageId}/img`}
        alt={item.imageAlt || text || ""}
        className={s.imageClass}
        style={s.imageStyle}
      />
    );
    return href ? (
      <a href={href} onClick={(e) => e.preventDefault()} style={s.wrapperStyle}>
        {img}
      </a>
    ) : (
      <span style={s.wrapperStyle}>{img}</span>
    );
  }

  if (kind === "button" && text) {
    const variant = item.variant ?? "default";
    const extraButtonStyle = { ...s.buttonStyle };
    if (variant !== "default" && !item.buttonFg) {
      extraButtonStyle.color = "rgb(17 24 39)";
    }
    return (
      <a
        href={href || "#"}
        onClick={(e) => e.preventDefault()}
        className={s.buttonClass}
        style={{ ...s.wrapperStyle, ...extraButtonStyle }}
      >
        {text}
      </a>
    );
  }

  if (kind === "text" && text) {
    const span = (
      <span className={s.textClass} style={s.textStyle}>
        {text}
      </span>
    );
    return href ? (
      <a href={href} onClick={(e) => e.preventDefault()} style={s.wrapperStyle}>
        {span}
      </a>
    ) : (
      <span style={s.wrapperStyle}>{span}</span>
    );
  }

  return null;
}

/**
 * Puck editor preview for the site footer block.
 * Three independent columns: left / center / right.
 * Unlike the header, the footer has NO page-list slot — tenants add
 * any page links they want as button / text slot items.
 */
export function SiteFooterBlock({ content }: SiteFooterBlockProps) {
  const leftItems = Array.isArray(content.leftItems) ? content.leftItems : [];
  const centerItems = Array.isArray(content.centerItems)
    ? content.centerItems
    : [];
  const rightItems = Array.isArray(content.rightItems)
    ? content.rightItems
    : [];
  const borderTop =
    content.borderTop !== false && String(content.borderTop) !== "false";

  const sec = sectionAttrs(
    [borderTop ? "border-t border-gray-200" : "", "bg-white"]
      .filter(Boolean)
      .join(" "),
    content.sectionStyle,
  );

  return (
    <footer {...sec}>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
          <div className="flex flex-wrap items-center gap-3 md:justify-start">
            {leftItems.map((item, i) => (
              <SlotItem key={`fl-${i}`} item={item} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-center">
            {centerItems.map((item, i) => (
              <SlotItem key={`fc-${i}`} item={item} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {rightItems.map((item, i) => (
              <SlotItem key={`fr-${i}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
