import type { Page } from "../types";
import { BasicPageTemplate } from "./templates/BasicPageTemplate";
import { BlogTemplate } from "./templates/BlogTemplate";
import { ContactFormTemplate } from "./templates/ContactFormTemplate";

type FeatureTemplateComponent = React.ComponentType<{ page: Page }>;

const registry = new Map<string, FeatureTemplateComponent>([
  ["basic_pages", BasicPageTemplate],
  ["blog", BlogTemplate],
  ["contact_form", ContactFormTemplate],
]);

export const FEATURE_TEMPLATE_REGISTRY = {
  get(featureKey: string): FeatureTemplateComponent | undefined {
    return registry.get(featureKey);
  },
  has(featureKey: string): boolean {
    return registry.has(featureKey);
  },
  allKeys(): string[] {
    return Array.from(registry.keys());
  },
};
