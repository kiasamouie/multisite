"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TenantBranding, SiteHeaderConfig } from "@repo/lib/tenant/context";
import type { HeaderSlotItem, NavPageRef } from "@repo/template/types";
import { styleSlotItem, resolveSlotGroupTextStyle } from "@repo/template/lib/slot-style";
import { composeBackground } from "./_compose-bg";

interface SiteNavProps {
  tenantName: string;
  branding: TenantBranding;
  headerConfig?: SiteHeaderConfig;
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
    // When no explicit custom background, fall back to the tenant primary.
    if (variant === "default" && !item.buttonBg) {
      extraButtonStyle.backgroundColor = "var(--tenant-primary)";
    }
    if (variant !== "default" && !item.buttonFg) {
      extraButtonStyle.color = "var(--tenant-primary)";
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

export function SiteNav({ tenantName, branding, headerConfig }: SiteNavProps) {
  const leftItems: HeaderSlotItem[] = headerConfig?.leftItems ?? [];
  const rightItems: HeaderSlotItem[] = headerConfig?.rightItems ?? [];
  const navPages: NavPageRef[] = headerConfig?.navPages ?? [];
  const navAnchorStyle = resolveSlotGroupTextStyle(headerConfig?.navPagesTextStyle);

  const isSticky = headerConfig?.sticky ?? true;
  const hasBorder = headerConfig?.borderBottom ?? true;
  const blur = headerConfig?.backdropBlur ?? true;
  const scrollTransparency = (headerConfig?.scrollTransparency ?? false) && isSticky;
  const customBg = composeBackground(
    headerConfig?.backgroundColor,
    headerConfig?.backgroundOpacity,
  );
  const solidBg = customBg ?? "#ffffff";

  // Scroll-driven transparency: header fades from fully transparent at the
  // top of the page to its configured solid background after the user
  // scrolls past a small threshold. Only active when both `sticky` and
  // `scrollTransparency` are enabled.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!scrollTransparency) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollTransparency]);

  const transparentMode = scrollTransparency && !scrolled;

  // If there is no configured header yet, fall back to a simple branded header.
  const hasAnyConfig =
    leftItems.length > 0 || rightItems.length > 0 || navPages.length > 0;

  return (
    <header
      className={[
        isSticky ? "sticky top-0 z-50" : "",
        hasBorder && !transparentMode ? "border-b" : "",
        blur && !transparentMode ? "backdrop-blur" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        // Header has its OWN colour from the Puck block config. It does NOT
        // auto-inherit the tenant theme background so the chrome stays
        // distinct from the page body. Configure via the site_header block
        // "section style" → background fields.
        background: transparentMode ? "transparent" : solidBg,
        transition:
          "background-color 300ms ease, background 300ms ease, border-color 300ms ease, backdrop-filter 300ms ease",
      }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-3">
          {hasAnyConfig ? (
            leftItems.map((item, i) => (
              <SlotItem key={`l-${i}`} item={item} />
            ))
          ) : (
            <Link href="/" className="flex items-center gap-2">
              {branding.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logo_url}
                  alt={tenantName}
                  className="h-8 w-auto"
                />
              ) : (
                <span
                  className="text-xl font-bold"
                  style={{ color: "var(--tenant-primary)" }}
                >
                  {tenantName}
                </span>
              )}
            </Link>
          )}
        </div>

        {navPages.length > 0 && (
          <ul className="hidden items-center gap-6 md:flex">
            {navPages.map((p, i) => {
              const isExternal =
                p.kind === "external" ||
                (typeof p.href === "string" && /^https?:\/\//.test(p.href));
              return (
                <li key={`${p.id ?? "x"}-${p.sectionId ?? "x"}-${p.href}-${i}`}>
                  <Link
                    href={p.href}
                    className="text-sm font-medium text-gray-600 transition hover:text-[var(--tenant-primary)]"
                    style={navAnchorStyle}
                    {...(isExternal
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {p.title}
                  </Link>
                </li>
              );
            })}
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
