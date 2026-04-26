import Link from "next/link";
import type { SiteFooterConfig } from "@repo/lib/tenant/context";
import type { HeaderSlotItem } from "@repo/template/types";
import { styleSlotItem } from "@repo/template/lib/slot-style";
import { composeBackground } from "./_compose-bg";

interface SiteFooterProps {
  tenantName: string;
  footerConfig?: SiteFooterConfig;
}

function SlotItem({ item }: { item: HeaderSlotItem }) {
  const { kind, text, imageId, href } = item;
  const s = styleSlotItem(item);

  if (kind === "image" && imageId) {
    // eslint-disable-next-line @next/next/no-img-element
    const img = (
      <img
        src={`/api/media/${imageId}/img`}
        alt={item.imageAlt || text || ""}
        className={s.imageClass}
        style={s.imageStyle}
      />
    );
    return href ? (
      <Link href={href} style={s.wrapperStyle}>
        {img}
      </Link>
    ) : (
      <span style={s.wrapperStyle}>{img}</span>
    );
  }

  if (kind === "button" && text) {
    const variant = item.variant ?? "default";
    const extraButtonStyle = { ...s.buttonStyle };
    if (variant === "default" && !item.buttonBg) {
      // Default to the tenant primary color so footer buttons inherit the
      // selected theme. Falls back to gray-900 if no tenant theme is set.
      extraButtonStyle.backgroundColor = "var(--tenant-primary, rgb(17 24 39))";
    }
    if (variant !== "default" && !item.buttonFg) {
      extraButtonStyle.color = "rgb(55 65 81)"; // gray-700
    }
    return (
      <Link
        href={href || "#"}
        className={s.buttonClass}
        style={{ ...s.wrapperStyle, ...extraButtonStyle }}
      >
        {text}
      </Link>
    );
  }

  if (kind === "text" && text) {
    const span = (
      <span className={s.textClass} style={s.textStyle}>
        {text}
      </span>
    );
    return href ? (
      <Link href={href} style={s.wrapperStyle}>
        {span}
      </Link>
    ) : (
      <span style={s.wrapperStyle}>{span}</span>
    );
  }

  return null;
}

export function SiteFooter({ tenantName, footerConfig }: SiteFooterProps) {
  const year = new Date().getFullYear();
  const leftItems = footerConfig?.leftItems ?? [];
  const centerItems = footerConfig?.centerItems ?? [];
  const rightItems = footerConfig?.rightItems ?? [];
  const hasAnyConfig =
    leftItems.length > 0 ||
    centerItems.length > 0 ||
    rightItems.length > 0;
  const borderTop = footerConfig?.borderTop ?? true;
  const customBg = composeBackground(
    footerConfig?.backgroundColor,
    footerConfig?.backgroundOpacity,
  );
  // Footer has its OWN colour from the Puck block config. It does NOT
  // auto-inherit the tenant theme background so the chrome stays distinct
  // from the page body. Configure via the site_footer block "section
  // style" → background fields.
  const footerStyle = { background: customBg ?? "#ffffff" };

  if (!hasAnyConfig) {
    return (
      <footer className="border-t" style={footerStyle}>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              &copy; {year} {tenantName}. All rights reserved.
            </p>
            <p className="text-xs text-gray-400">
              Powered by{" "}
              <Link href="/" className="underline hover:text-gray-600">
                Multisite
              </Link>
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={borderTop ? "border-t" : ""}
      style={footerStyle}
    >
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
