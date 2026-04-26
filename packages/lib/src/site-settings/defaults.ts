import type { SettingsByNamespace, SettingsNamespace } from "./types";

/**
 * Sane defaults returned when a namespace has no row yet. Keeps panel UIs
 * working without null-checks everywhere.
 */
export const SETTINGS_DEFAULTS: { [K in SettingsNamespace]: SettingsByNamespace[K] } = {
  theme: {
    mode: "light",
    palette: {},
    font: {},
  },
  navigation: {
    smoothScroll: true,
    anchorFallbackToPage: true,
  },
  header: {},
  footer: {},
  seo: {
    metaTitlePattern: "{pageTitle} — {siteName}",
    robotsAllow: true,
    sitemapEnabled: true,
  },
  advanced: {},
};

export function getDefaults<K extends SettingsNamespace>(
  ns: K,
): SettingsByNamespace[K] {
  return SETTINGS_DEFAULTS[ns];
}
