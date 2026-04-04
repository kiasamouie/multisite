# Responsive Design Guide for Admin UI

## Overview

This guide establishes responsive design patterns for the admin dashboard and all admin pages. The goal is to ensure the platform works seamlessly across all screen sizes: mobile (320px+), tablet (768px+), and desktop (1024px+).

---

## Core Responsive Principles

### 1. Mobile-First Approach
- Design for mobile first (320px viewport)
- Progressively enhance for larger screens
- Use Tailwind's responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

### 2. Container Padding
```tsx
// Tight on mobile, generous on desktop
<div className="p-4 sm:p-6 md:p-8">
```

**Height breakpoints:**
- Mobile (< 640px): `p-3` or `p-4`
- Tablet (640px - 1024px): `p-4` or `p-6`
- Desktop (> 1024px): `p-6` or `p-8`

### 3. Width Management
```tsx
// Always include w-full for responsive containers
<div className="w-full space-y-6">
```

Prevents overflow and ensures stretching on all sizes.

### 4. Text Sizing
```tsx
// Smaller on mobile, larger on desktop
<h1 className="text-lg sm:text-xl md:text-2xl font-bold">
  Page Title
</h1>
```

**Standard sizes:**
- Body text: `text-sm` (mobile) or `text-base` (tablet+)
- Labels: `text-xs` (universal)
- Headings: Scale with breakpoints

### 5. Whitespace Scaling
```tsx
// Reduce gaps on mobile, expand on desktop
<div className="space-y-3 sm:space-y-4 md:space-y-6">
```

---

## Table Responsiveness

### Column Strategy

**Desktop (3+ columns):**
- All columns visible
- Full content displayed

**Tablet (2 columns):**
- Hide tertiary columns (Tenant, Created)
- Show primary data (Filename, Type, Size)
- Use side panel for details

**Mobile (1 primary column):**
- Show only essential column (Filename)
- Click to expand side panel for all details
- Type/Size shown as badges in side panel

### Implementation Pattern

```tsx
const columns = isSmallScreen 
  ? [
      { key: "filename", label: "File" },
      // Hide size, tenant on mobile - shown in details panel
    ]
  : isTablet
    ? [
        { key: "filename", label: "Filename" },
        { key: "metadata_type", label: "Type" },
        { key: "metadata_size", label: "Size" },
      ]
    : [
        { key: "filename", label: "Filename" },
        { key: "metadata_type", label: "Type" },
        { key: "metadata_size", label: "Size" },
        { key: "tenants", label: "Tenant" },
        { key: "created_at", label: "Created" },
      ];
```

### Text Truncation
```tsx
// Prevent horizontal scroll - truncate long content
<span className="truncate text-sm">
  Very long filename or text
</span>

// For codes/paths - reduce font size instead
<span className="text-xs break-all font-mono">
  /very/long/path/to/file
</span>
```

### Cell Content Protection
```tsx
// Use whitespace-nowrap on badges to prevent wrapping
<span className="px-2 py-1 rounded whitespace-nowrap">
  Badge Text
</span>

// For lists inside cells, stack vertically on mobile
<div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap">
  {items.map(item => ...)}
</div>
```

---

## Form Responsiveness

### Input Layout
```tsx
// Stack on mobile, side-by-side on tablet+
<div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
  <div className="w-full">
    <label>Field 1</label>
    <input className="w-full" />
  </div>
  <div className="w-full">
    <label>Field 2</label>
    <input className="w-full" />
  </div>
</div>
```

### Select/Dropdown
```tsx
// Always full-width on mobile
<select className="w-full rounded border px-3 py-2">
  <option>Option 1</option>
</select>
```

### Buttons
```tsx
// Stack vertically on mobile, horizontal on tablet+
<div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
  <button className="flex-1 ...">Save</button>
  <button className="flex-1 ...">Cancel</button>
</div>
```

### Modal/Side Panel
```tsx
// Full screen on mobile, sized on desktop
<div className="fixed inset-0 z-50 overflow-y-auto rounded-none sm:inset-auto sm:rounded-lg">
  {/* width: width="${width === 'sm' ? 'max-w-sm' : width === 'md' ? 'max-w-md' : 'max-w-2xl'}" */}
</div>
```

---

## Navigation & Layout

### Header/Toolbar
```tsx
// Responsive padding and font size
<header className="px-4 py-3 sm:px-6 sm:py-4">
  <h1 className="text-lg sm:text-xl font-semibold">Title</h1>
</header>
```

### Sidebar (Optional)
```tsx
// Hide on mobile, show on tablet+
<aside className="hidden w-64 border-r lg:block">
  {/* Navigation items */}
</aside>

// Mobile menu overlay
<nav className="fixed inset-0 z-40 bg-black/50 lg:hidden">
  {/* Mobile menu */}
</nav>
```

### Breadcrumb
```tsx
// Truncate on mobile, full on desktop
<nav className="flex gap-1 text-xs sm:text-sm">
  <span className="truncate">Admin</span>
  <span>/</span>
  <span className="truncate">Media</span>
</nav>
```

---

## Dark Mode

All responsive designs should include dark mode variants:

```tsx
// Always include dark: prefix for dark mode
<div className="rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
```

**Dark mode color mapping:**
- Light BG: `bg-white` → `dark:bg-gray-800`
- Light Gray BG: `bg-gray-50` → `dark:bg-gray-900/30`
- Light Border: `border-gray-200` → `dark:border-gray-700`
- Text: `text-gray-900` → `dark:text-gray-100`

---

## Common Responsive Patterns

### Badge/Tag (Responsive)
```tsx
<span className={`
  inline-block rounded-full px-2 py-1 text-xs font-medium 
  whitespace-nowrap
  bg-blue-100 text-blue-800 
  dark:bg-blue-900 dark:text-blue-200
`}>
  Badge Text
</span>
```

### List Item (Responsive)
```tsx
<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border-b last:border-b-0">
  <div className="flex-1 min-w-0">
    <h3 className="truncate font-medium">Title</h3>
    <p className="text-xs text-muted-foreground">Subtitle</p>
  </div>
  <div className="flex gap-2 mt-2 sm:mt-0">
    {/* Actions */}
  </div>
</div>
```

### Section Container (Responsive)
```tsx
<section className="w-full rounded border border-border bg-card p-4 sm:p-6">
  <h2 className="text-sm sm:text-base font-semibold mb-4">
    Section Title
  </h2>
  <div className="space-y-3">
    {/* Content */}
  </div>
</section>
```

### Grid Layout (Responsive)
```tsx
<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
  {items.map(item => (
    <div key={item.id} className="rounded border p-3 sm:p-4">
      {/* Card content */}
    </div>
  ))}
</div>
```

---

## Typography Scaling

### Heading Hierarchy
```tsx
// H1: Page title
<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
  Main Title
</h1>

// H2: Section title
<h2 className="text-xl sm:text-2xl font-semibold">
  Section Title
</h2>

// H3: Subsection
<h3 className="text-lg sm:text-xl font-semibold">
  Subsection
</h3>

// Body: Standard text
<p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
  Body text
</p>

// Label: Form labels
<label className="text-xs font-medium text-gray-600 dark:text-gray-400">
  Label Text
</label>
```

---

## Touch Target Size

On mobile, ensure interactive elements are at least 44x44px (11.6mm):

```tsx
// Good: Touch-friendly button
<button className="px-4 py-3 sm:px-3 sm:py-2 rounded">
  Button
</button>

// Good: Touch-friendly checkbox
<input type="checkbox" className="w-5 h-5 sm:w-4 sm:h-4" />

// Avoid: Too small
<button className="px-1 py-0.5 text-xs">
  Button
</button>
```

---

## Media Upload Component (Reference)

Example of fully responsive upload component:

```tsx
<div className="w-full space-y-4">
  {/* Upload Zone - responsive padding */}
  <div className="w-full rounded border-2 border-dashed p-4 text-center sm:p-6">
    <label htmlFor="media-upload" className="cursor-pointer block">
      <p className="text-sm font-medium text-gray-700">
        Drop file or click
      </p>
      <p className="mt-1 text-xs text-gray-500">Max 100MB</p>
    </label>
  </div>

  {/* Options Section - responsive padding */}
  <div className="w-full rounded border border-gray-200 bg-gray-50 p-3 sm:p-4">
    <h4 className="mb-3 text-sm font-medium">Options</h4>
    
    {/* Form fields - responsive on mobile */}
    <div className="w-full space-y-3">
      <select className="w-full rounded border px-3 py-2 text-sm">
        <option>Option 1</option>
      </select>
      
      {/* List - scrollable on mobile */}
      <div className="w-full flex max-h-40 flex-col overflow-y-auto">
        {items.map(item => (
          <label key={item.id} className="flex items-center gap-2 px-2 py-2 border-b last:border-b-0 hover:bg-gray-100">
            <input type="checkbox" />
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm">{item.title}</div>
              <div className="truncate text-xs text-gray-500">/{item.slug}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  </div>
</div>
```

---

## Testing Responsive Design

### Device Sizes to Test
- **Mobile**: 375px (iPhone SE), 414px (iPhone 12)
- **Tablet**: 768px (iPad), 1024px (iPad Pro)
- **Desktop**: 1280px (Standard), 1920px (Wide)

### Testing Tools
- Chrome DevTools (F12)
- Firefox Responsive Design Mode
- Safari Responsive Design Mode
- Physical device testing

### Checklist
- [ ] No content obscured or cut off
- [ ] No horizontal scrolling needed
- [ ] Touch targets at least 44x44px on mobile
- [ ] Text readable without zooming
- [ ] Forms fill full width on mobile
- [ ] Buttons don't wrap or truncate
- [ ] Images scale properly
- [ ] Dark mode support verified
- [ ] Orientation changes handled (portrait/landscape)

---

## Common Pitfalls to Avoid

### ❌ Fixed widths
```tsx
// Bad - breaks on small screens
<div className="w-1200">...</div>
```

### ✅ Use width utilities
```tsx
// Good - responsive
<div className="w-full max-w-7xl">...</div>
```

### ❌ Overflow hidden without scroll
```tsx
// Bad - content cut off on mobile
<div className="w-96 overflow-hidden">...</div>
```

### ✅ Allow scrolling where needed
```tsx
// Good - scrollable container
<div className="w-full overflow-x-auto"><table>...</table></div>
```

### ❌ No dark mode
```tsx
// Bad - light-only colors
<div className="bg-gray-50 text-gray-900">...</div>
```

### ✅ Always include dark mode
```tsx
// Good - dark mode variants
<div className="bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">...</div>
```

### ❌ Fixed font sizes
```tsx
// Bad - too small on mobile
<h1 className="text-4xl">Title</h1>
```

### ✅ Responsive typography
```tsx
// Good - scales with screen
<h1 className="text-2xl sm:text-3xl md:text-4xl">Title</h1>
```

---

## Next Steps

1. **Audit existing pages** - Check all admin pages for responsive issues
2. **Update Resource component** - Expose breakpoint awareness to column definitions
3. **Create reusable patterns** - Build component library for common responsive layouts
4. **Mobile testing** - Test all pages on actual devices
5. **Document patterns** - Add to this guide as new patterns emerge

---

## Resources

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Mobile-First CSS](https://www.mobileapproaches.com/css-mobile-first)
- [Touch Target Size Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Viewport Meta Tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)
