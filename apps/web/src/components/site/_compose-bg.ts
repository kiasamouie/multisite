/**
 * Compute a CSS background value combining a hex colour with an opacity (0-100).
 *
 * - Empty/undefined colour → returns `undefined` (caller should fall back to
 *   `var(--tenant-bg, #fff)` or similar).
 * - Opacity of 0 → returns `"transparent"`.
 * - Opacity ≥ 100 (or undefined) → returns the colour as-is.
 * - Hex colour (#rgb, #rrggbb) + partial opacity → returns `rgba(r, g, b, a)`.
 * - Non-hex colour with opacity → falls back to the colour as-is (browser
 *   may not be able to honour opacity for keywords like `red`).
 */
export function composeBackground(
  color: string | undefined,
  opacity: number | undefined,
): string | undefined {
  const trimmed = color?.trim();
  const hasColor = !!trimmed;
  const op = opacity ?? 100;

  if (!hasColor && op >= 100) return undefined;
  if (op <= 0) return "transparent";
  if (!hasColor) {
    // No explicit colour but partial opacity: tint the tenant bg variable.
    // Browsers can't multiply opacity on a CSS var directly; the cleanest
    // fallback is to return undefined and let CSS handle it.
    return undefined;
  }
  if (op >= 100) return trimmed;

  // Try to parse hex.
  const hex = trimmed!.startsWith("#") ? trimmed!.slice(1) : trimmed!;
  let r: number, g: number, b: number;
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    r = parseInt(hex[0]! + hex[0]!, 16);
    g = parseInt(hex[1]! + hex[1]!, 16);
    b = parseInt(hex[2]! + hex[2]!, 16);
  } else if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else {
    // Unrecognised format — give up on opacity, return colour verbatim.
    return trimmed;
  }
  const a = Math.max(0, Math.min(1, op / 100));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
