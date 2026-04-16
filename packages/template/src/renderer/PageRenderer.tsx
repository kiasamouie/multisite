import type { Page } from "../types";
import { SectionRenderer } from "./SectionRenderer";
import { PageMediaProvider, PageFlagsProvider } from "./PageContext";

interface PageRendererProps {
  page: Page;
}

export function PageRenderer({ page }: PageRendererProps) {
  const sortedSections = [...page.sections].sort((a, b) => a.position - b.position);

  return (
    <PageMediaProvider assets={page.media_associations ?? []}>
      <PageFlagsProvider flags={page.feature_flags ?? {}}>
        <main>
          {sortedSections.map((section) => (
            <SectionRenderer key={section.id} section={section} />
          ))}
        </main>
      </PageFlagsProvider>
    </PageMediaProvider>
  );
}
