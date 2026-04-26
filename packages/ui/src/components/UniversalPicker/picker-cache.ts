/**
 * Module-level in-memory cache for `UniversalPicker` data sources.
 *
 * Why: every time a Puck field re-mounts (block switch, slot card collapse,
 * style panel toggle, …) the picker effect would otherwise refetch from the
 * network. Cache hits make those re-mounts free; the user only re-fetches
 * when they explicitly click the picker's refresh (↻) button.
 *
 * Lifetime: the module is shared across all picker instances in the page,
 * and lives until full reload — perfect for a Puck editor session.
 */
import type { PickerItem } from "./UniversalPicker";

const cache = new Map<string, PickerItem[]>();

export function getCached(key: string | undefined): PickerItem[] | undefined {
  if (!key) return undefined;
  return cache.get(key);
}

export function setCached(
  key: string | undefined,
  items: PickerItem[],
): void {
  if (!key) return;
  cache.set(key, items);
}

export function invalidateCached(key: string | undefined): void {
  if (!key) return;
  cache.delete(key);
}
