# UI Components Library Instructions

**Scope:** `packages/ui/src/**`

Use this guide when creating or modifying UI components, shadcn/ui integration, and design system tokens.

---

## 📋 Mandatory Reading

**Before working on components, read:**
1. [FRONTEND_STACK_GUIDE.md](../../documentation/FRONTEND_STACK_GUIDE.md) — Styling rules and patterns
2. `packages/ui/src/globals.css` — Design tokens

---

## 🎯 Critical Rules

### Rule 1: Components Must Be Reusable Across All Admin Screens

Every component in `packages/ui/` is exported and imported throughout the app. Changes affect the entire admin interface.

```typescript
// ✅ GOOD: Generic, reusable component
export function DataView({ items, columns, onEdit, onDelete }) {
  // Works for any resource (pages, media, users, etc.)
  // Consistent UI/UX across all admin screens
}

// ❌ BAD: Specific to one feature
export function PagesDataView({ pages, onEditPage, onDeletePage }) {
  // Can't reuse for other resources
  // Copy-paste maintenance nightmare
}
```

**Rule:** If you build a component that works only for one feature, it goes in `apps/web/src/components/`, not in `packages/ui/`.

---

### Rule 2: Design Tokens Come from globals.css

**ALWAYS use CSS variables, never hardcode colors.**

```typescript
// ✅ DO THIS (uses CSS variables)
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Click me
</button>

// ❌ DON'T DO THIS (hardcoded)
<button className="bg-blue-600 text-white hover:bg-blue-700">
  Click me
</button>
```

**Available CSS Variables** (in `packages/ui/src/globals.css`):
```css
:root {
  --primary: 220 90% 56%;
  --secondary: 200 80% 60%;
  --destructive: 0 84% 60%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 14% 34%;
  --accent: 38 92% 50%;
  --foreground: 215 28% 17%;
  --background: 0 0% 100%;
  /* ... and more */
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: 215 28% 6%;
    --foreground: 213 31% 91%;
    /* ... dark mode overrides */
  }
}
```

**Usage:**
```typescript
<div className="bg-[var(--primary)] text-[var(--primary-foreground)]">
  {/* Automatically respects light/dark mode */}
</div>
```

**Tailwind v4 Important:** Use `var()` function, not bare variable names:
```typescript
// ✅ CORRECT (v4)
className="w-[var(--custom-width)]"

// ❌ WRONG (v3)
className="w-[--custom-width]"
```

---

### Rule 3: Admin Components Use Consistent Patterns

All admin screens follow these patterns:

#### Pattern 1: DataView (Listing)
```typescript
import { DataView } from "@/components/admin";

<DataView
  items={items}
  columns={[
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
  ]}
  onEdit={(item) => setSelected(item)}
  onDelete={(item) => handleDelete(item.id)}
  onRefresh={() => refetchData()}
/>
```

**Features:**
- Pagination built-in
- Search/filter support
- Sortable columns
- Bulk actions (optional)
- Responsive (mobile-friendly)

#### Pattern 2: CrudModal (Create/Edit/View)
```typescript
import { CrudModal } from "@/components/admin";

<CrudModal
  isOpen={isOpen}
  item={selectedItem} // null = create, item = edit
  fields={[
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email" },
  ]}
  onSave={async (data) => {
    // Handle create or update
  }}
  onClose={() => setSelectedItem(null)}
/>
```

**Features:**
- Single modal for create + edit + view
- Automatic form generation
- Validation built-in
- Loading states
- Error handling

#### Pattern 3: PageHeader (Title + Actions)
```typescript
import { PageHeader } from "@/components/admin";

<PageHeader
  title="Pages"
  description="Manage your website pages"
  action={{
    label: "New Page",
    onClick: () => setIsCreateOpen(true),
  }}
/>
```

---

### Rule 4: shadcn/ui Components Are Read-Only

shadcn/ui primitives in `packages/ui/src/components/ui/` should not be modified. They're managed by the shadcn/ui CLI.

```bash
# Add new shadcn component
pnpm dlx shadcn-ui@latest add button
# This creates /packages/ui/src/components/ui/button.tsx

# Don't modify button.tsx manually
# Instead, override in CSS variables or create wrapper
```

**To customize a shadcn component:**

```typescript
// ✅ DO THIS: Create wrapper component
// packages/ui/src/components/admin/CustomButton.tsx
import { Button } from "@/components/ui/button";

export function CustomButton({ variant = "default", ...props }) {
  // Add custom logic on top of shadcn button
  return <Button variant={variant} {...props} />;
}

// ❌ DON'T DO THIS: Modify shadcn source
// Don't edit: packages/ui/src/components/ui/button.tsx
```

---

### Rule 5: Component Exports Go Through Index Files

**Always use barrel exports (index.ts) for clean imports.**

```typescript
// ✅ DO THIS
import { DataView, CrudModal } from "@/components/admin";

// ❌ DON'T DO THIS
import { DataView } from "@/components/admin/DataView";
import { CrudModal } from "@/components/admin/CrudModal";
```

**Structure:**
```
packages/ui/src/components/
├── ui/
│   ├── button.tsx
│   ├── input.tsx
│   └── index.ts ← Exports all primitives
├── admin/
│   ├── DataView.tsx
│   ├── CrudModal.tsx
│   ├── layout/
│   │   └── DashboardLayout.tsx
│   └── index.ts ← Exports all admin components
└── index.ts ← Main barrel export
```

Main export file (`packages/ui/src/index.ts`):
```typescript
// Primitives
export * from "@/components/ui";

// Admin components
export * from "@/components/admin";
```

---

### Rule 6: Styling Consistency

All components must:

1. **Respect Dark Mode**
   ```typescript
   <div className="bg-white dark:bg-slate-950">
     {/* Automatically switches */}
   </div>
   ```

2. **Use Responsive Classes**
   ```typescript
   <div className="p-4 md:p-6 lg:p-8">
     {/* Padding changes at breakpoints */}
   </div>
   ```

3. **Support All States**
   - Default
   - Hover
   - Active/Selected
   - Disabled
   - Loading
   - Error

   ```typescript
   <button
     className={`
       bg-primary hover:bg-primary/90 active:bg-primary/80
       disabled:opacity-50 disabled:cursor-not-allowed
       ${loading && "animate-pulse"}
     `}
   />
   ```

---

## 📦 Component Organization

```
packages/ui/src/
├── components/
│   ├── ui/                              # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   └── index.ts
│   ├── admin/                           # Custom admin components
│   │   ├── DataView.tsx                 # Table/list component
│   │   ├── CrudModal.tsx                # Create/edit/view modal
│   │   ├── ConfirmDialog.tsx            # Confirmation dialog
│   │   ├── InfoCard.tsx                 # Info display card
│   │   ├── StatusBadge.tsx              # Status indicator
│   │   ├── Filter.tsx                   # Search/filter input
│   │   ├── PageHeader.tsx               # Page title + actions
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx      # Admin layout wrapper
│   │   │   └── AppSidebar.tsx           # Sidebar navigation
│   │   ├── theme/
│   │   │   └── ThemeToggle.tsx          # Light/dark toggle
│   │   └── index.ts
│   └── index.ts
├── globals.css                          # Design tokens + animations
├── components.json                      # shadcn/ui config
├── tsconfig.json
└── package.json
```

---

## 🎨 Design System Tokens

Located in `packages/ui/src/globals.css`:

### Colors
```css
:root {
  --primary: 220 90% 56%;          /* Blue */
  --secondary: 200 80% 60%;        /* Light blue */
  --destructive: 0 84% 60%;        /* Red */
  --muted: 210 40% 96%;            /* Gray */
  --accent: 38 92% 50%;            /* Orange */
}
```

### Spacing
```css
/* Using Tailwind spacing scale */
/* p-1 = 0.25rem, p-2 = 0.5rem, p-4 = 1rem, etc. */
```

### Animations
```css
@keyframes in {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: in 150ms ease;
}
```

---

## 🚫 Anti-Patterns (NEVER Do These)

| Anti-Pattern | Why | Fix |
|---|---|---|
| Hardcoded colors | Breaks dark mode, branding | Use CSS variables |
| Feature-specific components in packages/ui | Can't reuse | Put in `apps/web/components/` |
| Modifying shadcn/ui source | Updates lost | Create wrapper instead |
| No dark mode support | Half the users affected | Add `dark:` classes |
| Inconsistent button styles | Confusing UI | Use shadcn Button for all |
| No responsive design | Mobile breaks | Add md/lg breakpoints |
| Barrel exports skipped | Hard to import | Always use index.ts |

---

## 📋 Checklist: Adding a New Component

- [ ] Component is reusable (not feature-specific)
- [ ] Created in correct folder (`admin/` or `ui/`)
- [ ] Added to barrel export in `index.ts`
- [ ] Uses CSS variables (no hardcoded colors)
- [ ] Supports dark mode (dark: classes)
- [ ] Responsive (sm:, md:, lg: breakpoints)
- [ ] All states handled (hover, disabled, loading, error)
- [ ] TypeScript types defined
- [ ] Tested in Storybook or dev env
- [ ] Ran `pnpm lint` and `pnpm build`

---

## 🔄 Common Tasks

### Add New shadcn/ui Component
```bash
# Add to packages/ui
cd packages/ui
pnpm dlx shadcn-ui@latest add input
# Creates: src/components/ui/input.tsx
# Exports automatically
```

### Create Custom Admin Component
```typescript
// packages/ui/src/components/admin/MyComponent.tsx
import { Button } from "@/components/ui";

export function MyComponent({ title, items }) {
  return (
    <div className="p-4 rounded-lg bg-card border">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {/* Component content */}
    </div>
  );
}
```

### Update Barrel Export
```typescript
// packages/ui/src/components/admin/index.ts
export { DataView } from "./DataView";
export { CrudModal } from "./CrudModal";
export { MyComponent } from "./MyComponent";  // ← Add new export
```

---

## 📚 Related Documentation

- [FRONTEND_STACK_GUIDE.md](../../documentation/FRONTEND_STACK_GUIDE.md) — Component patterns
- `packages/ui/src/globals.css` — Design tokens
- `packages/ui/components.json` — shadcn/ui config
