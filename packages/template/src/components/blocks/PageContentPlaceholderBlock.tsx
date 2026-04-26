"use client";

/**
 * Visual-only placeholder used inside the Header & Footer Puck editor.
 *
 * It does NOT exist on real pages — it exists solely to push the
 * `site_footer` block to the bottom of the editor canvas so tenants
 * can preview both blocks at the actual top/bottom positions they
 * will render on the live site.
 *
 * The block has no editable fields and is locked from drag/duplicate/
 * delete/insert by the Puck config.
 */
export function PageContentPlaceholderBlock() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        background:
          "repeating-linear-gradient(135deg, rgb(243 244 246), rgb(243 244 246) 12px, rgb(249 250 251) 12px, rgb(249 250 251) 24px)",
        color: "rgb(107 114 128)",
        fontSize: "0.875rem",
        textAlign: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 600, color: "rgb(75 85 99)", marginBottom: "0.25rem" }}>
          Page content
        </div>
        <div style={{ fontSize: "0.75rem" }}>
          Each page&rsquo;s content is rendered here on the live site.
          <br />
          The header above and footer below appear on every page.
        </div>
      </div>
    </div>
  );
}
