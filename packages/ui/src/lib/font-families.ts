/**
 * Curated font-family stacks shared by all style editors.
 *
 * Fonts are loaded via `next/font/google` in the app's root layout
 * (`apps/web/src/app/layout.tsx`) and exposed as CSS custom properties
 * on `<body>` (e.g. `--font-inter`). We reference those variables first
 * with literal-name + generic-family fallbacks for robustness.
 */

export interface FontFamilyOption {
  value: string;
  label: string;
  category: "Sans-serif" | "Serif" | "Display" | "Monospace";
}

export const FONT_FAMILIES: FontFamilyOption[] = [
  { value: 'var(--font-manrope), "Manrope", ui-sans-serif, system-ui, sans-serif', label: "Manrope (default)", category: "Sans-serif" },
  { value: 'var(--font-inter), "Inter", ui-sans-serif, system-ui, sans-serif', label: "Inter", category: "Sans-serif" },
  { value: 'var(--font-roboto), "Roboto", ui-sans-serif, system-ui, sans-serif', label: "Roboto", category: "Sans-serif" },
  { value: 'var(--font-poppins), "Poppins", ui-sans-serif, system-ui, sans-serif', label: "Poppins", category: "Sans-serif" },
  { value: 'var(--font-montserrat), "Montserrat", ui-sans-serif, system-ui, sans-serif', label: "Montserrat", category: "Sans-serif" },
  { value: 'var(--font-lora), "Lora", ui-serif, Georgia, serif', label: "Lora", category: "Serif" },
  { value: 'var(--font-playfair), "Playfair Display", ui-serif, Georgia, serif', label: "Playfair Display", category: "Serif" },
  { value: 'var(--font-merriweather), "Merriweather", ui-serif, Georgia, serif', label: "Merriweather", category: "Serif" },
  { value: 'var(--font-oswald), "Oswald", ui-sans-serif, system-ui, sans-serif', label: "Oswald", category: "Display" },
  { value: 'var(--font-bebas), "Bebas Neue", ui-sans-serif, system-ui, sans-serif', label: "Bebas Neue", category: "Display" },
  { value: 'var(--font-jetbrains), "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace', label: "JetBrains Mono", category: "Monospace" },
];
