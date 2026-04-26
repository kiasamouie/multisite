import { readFileSync, writeFileSync } from "fs";

function patch(filePath, oldFilter, newFilter) {
  const content = readFileSync(filePath, "utf8");
  if (!content.includes(oldFilter)) {
    console.error("NOT FOUND in", filePath);
    process.exit(1);
  }
  writeFileSync(filePath, content.replace(oldFilter, newFilter));
  console.log("patched", filePath);
}

const root = "apps/web/src/app/admin";

// ── Subscriptions ──────────────────────────────────────────────────────────
patch(
  `${root}/subscriptions/page.tsx`,
  `filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by Stripe subscription ID\u2026" }}`,
  `filter={{
          search,
          onSearchChange: setSearch,
          searchPlaceholder: "Search by Stripe subscription ID\u2026",
          filters: [
            {
              type: "chips" as const,
              inline: true,
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "trialing",   label: "Trialing",   color: { bg: "hsl(var(--secondary)/0.1)",  text: "hsl(var(--secondary))",  border: "hsl(var(--secondary)/0.2)" } },
                { value: "active",     label: "Active",     color: { bg: "hsl(var(--success)/0.1)",    text: "hsl(var(--success))",    border: "hsl(var(--success)/0.2)" } },
                { value: "past_due",   label: "Past Due",   color: { bg: "hsl(var(--warning)/0.1)",    text: "hsl(var(--warning))",    border: "hsl(var(--warning)/0.2)" } },
                { value: "incomplete", label: "Incomplete" },
                { value: "cancelled",  label: "Cancelled" },
              ],
            },
          ],
          hasFilters: search !== "" || statusFilter !== "",
          onClear: () => { setSearch(""); setStatusFilter(""); },
        }}`
);

// ── Blog ───────────────────────────────────────────────────────────────────
patch(
  `${root}/content/blog/page.tsx`,
  `filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by title\u2026" }}`,
  `filter={{
          search,
          onSearchChange: setSearch,
          searchPlaceholder: "Search by title\u2026",
          filters: [
            {
              type: "chips" as const,
              inline: true,
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "published", label: "Published", color: { bg: "hsl(var(--success)/0.1)", text: "hsl(var(--success))", border: "hsl(var(--success)/0.2)" } },
                { value: "draft",     label: "Draft" },
              ],
            },
          ],
          hasFilters: search !== "" || statusFilter !== "",
          onClear: () => { setSearch(""); setStatusFilter(""); },
        }}`
);

// ── Events ─────────────────────────────────────────────────────────────────
patch(
  `${root}/content/events/page.tsx`,
  `filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by name\u2026" }}`,
  `filter={{
          search,
          onSearchChange: setSearch,
          searchPlaceholder: "Search by name\u2026",
          filters: [
            {
              type: "chips" as const,
              inline: true,
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "active",   label: "Active",   color: { bg: "hsl(var(--success)/0.1)", text: "hsl(var(--success))", border: "hsl(var(--success)/0.2)" } },
                { value: "inactive", label: "Inactive" },
              ],
            },
          ],
          hasFilters: search !== "" || statusFilter !== "",
          onClear: () => { setSearch(""); setStatusFilter(""); },
        }}`
);

// ── Portfolio ──────────────────────────────────────────────────────────────
patch(
  `${root}/content/portfolio/page.tsx`,
  `filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by title\u2026" }}`,
  `filter={{
          search,
          onSearchChange: setSearch,
          searchPlaceholder: "Search by title\u2026",
          filters: [
            {
              type: "chips" as const,
              inline: true,
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "active",   label: "Active",   color: { bg: "hsl(var(--success)/0.1)", text: "hsl(var(--success))", border: "hsl(var(--success)/0.2)" } },
                { value: "inactive", label: "Inactive" },
              ],
            },
          ],
          hasFilters: search !== "" || statusFilter !== "",
          onClear: () => { setSearch(""); setStatusFilter(""); },
        }}`
);

// ── Team ───────────────────────────────────────────────────────────────────
patch(
  `${root}/content/team/page.tsx`,
  `filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by name\u2026" }}`,
  `filter={{
          search,
          onSearchChange: setSearch,
          searchPlaceholder: "Search by name\u2026",
          filters: [
            {
              type: "chips" as const,
              inline: true,
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "active",   label: "Active",   color: { bg: "hsl(var(--success)/0.1)", text: "hsl(var(--success))", border: "hsl(var(--success)/0.2)" } },
                { value: "inactive", label: "Inactive" },
              ],
            },
          ],
          hasFilters: search !== "" || statusFilter !== "",
          onClear: () => { setSearch(""); setStatusFilter(""); },
        }}`
);

// ── Testimonials ───────────────────────────────────────────────────────────
patch(
  `${root}/content/testimonials/page.tsx`,
  `filter={{ search, onSearchChange: setSearch, searchPlaceholder: "Search by name\u2026" }}`,
  `filter={{
          search,
          onSearchChange: setSearch,
          searchPlaceholder: "Search by name\u2026",
          filters: [
            {
              type: "chips" as const,
              inline: true,
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "active",   label: "Active",   color: { bg: "hsl(var(--success)/0.1)", text: "hsl(var(--success))", border: "hsl(var(--success)/0.2)" } },
                { value: "inactive", label: "Inactive" },
              ],
            },
          ],
          hasFilters: search !== "" || statusFilter !== "",
          onClear: () => { setSearch(""); setStatusFilter(""); },
        }}`
);
