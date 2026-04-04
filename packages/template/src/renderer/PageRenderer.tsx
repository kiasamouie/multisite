import type { Page } from "../types";
import { SectionRenderer } from "./SectionRenderer";
import { PageMediaProvider, PageFlagsProvider } from "./PageContext";
import { FEATURE_TEMPLATE_REGISTRY } from "../features/registry";

interface PageRendererProps {
  page: Page;
}

export function PageRenderer({ page }: PageRendererProps) {
  // Check for a feature template first
  const TemplateComponent =
    page.page_type === "template" && page.feature_key
      ? FEATURE_TEMPLATE_REGISTRY.get(page.feature_key)
      : undefined;

  const sortedSections = [...page.sections].sort((a, b) => a.position - b.position);

  console.log("📄 PageRenderer:", {
    page_id: page.id,
    media_associations: page.media_associations?.length ?? 0,
    sections: sortedSections.length,
    media_items: page.media_associations?.map(m => ({ id: m.id, usage_type: m.usage_type, filename: m.filename })),
  });

  return (
    <PageMediaProvider assets={page.media_associations ?? []}>
      <PageFlagsProvider flags={page.feature_flags ?? {}}>
        {TemplateComponent ? (
          <TemplateComponent page={page} />
        ) : (
          <main>
            {sortedSections.map((section) => (
              <SectionRenderer key={section.id} section={section} />
            ))}
          </main>
        )}
      </PageFlagsProvider>
    </PageMediaProvider>
  );
}
