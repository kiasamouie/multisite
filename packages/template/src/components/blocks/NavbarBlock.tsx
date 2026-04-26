"use client";

import type { SiteHeaderBlockContent, HeaderSlotItem } from "../../types";
import { styleSlotItem, resolveSlotGroupTextStyle } from "../../lib/slot-style";
import { sectionAttrs } from "../../lib/styled-block";

interface NavbarBlockProps {
  content: SiteHeaderBlockContent;
}

/**
 * Renders a single slot item — text, image, or button.
 * Shared between the Puck editor preview and the public SiteNav.
 * All style fields on the item (size, weight, colour, rounding,
 * margin, button bg/fg, etc.) are applied via `styleSlotItem`.
 */
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
 * Puck editor preview for the site header block.
 * Layout: `[leftItems] [navPages] [rightItems]` — the page-list sits
 * between the two user-controlled slots (nav bar only).
 */
export function NavbarBlock({ content }: NavbarBlockProps) {
  const leftItems = Array.isArray(content.leftItems) ? content.leftItems : [];
  const rightItems = Array.isArray(content.rightItems) ? content.rightItems : [];
  const navPages = Array.isArray(content.navPages) ? content.navPages : [];
  const sticky = content.sticky !== false && String(content.sticky) !== "false";
  const borderBottom =
    content.borderBottom !== false && String(content.borderBottom) !== "false";

  const sec = sectionAttrs(
    [
      sticky ? "sticky top-0 z-50" : "",
      borderBottom ? "border-b border-gray-200" : "",
      "bg-white",
    ]
      .filter(Boolean)
      .join(" "),
    content.sectionStyle,
  );

  const navAnchorStyle = resolveSlotGroupTextStyle(content.navPagesTextStyle);

  return (
    <header {...sec}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-3">
          {leftItems.map((item, i) => (
            <SlotItem key={`l-${i}`} item={item} />
          ))}
        </div>

        {navPages.length > 0 && (
          <ul className="hidden items-center gap-6 md:flex">
            {navPages.map((p, i) => (
              <li key={`${p.id ?? "x"}-${p.sectionId ?? "x"}-${p.href}-${i}`}>
                <a
                  href={p.href}
                  onClick={(e) => e.preventDefault()}
                  className="text-sm font-medium text-gray-600 transition hover:text-blue-600"
                  style={navAnchorStyle}
                >
                  {p.title}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3">
          {rightItems.map((item, i) => (
            <SlotItem key={`r-${i}`} item={item} />
          ))}
        </div>
      </nav>
    </header>
  );
}
