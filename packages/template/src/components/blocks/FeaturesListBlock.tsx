import type { FeaturesListBlockContent } from "../../types";

export function FeaturesListBlock({ content }: { content: FeaturesListBlockContent }) {
  const features = content.features || [];

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      {(content.title || content.subtitle) && (
        <div className="mb-12 text-center">
          {content.title && <h2 className="text-3xl font-bold">{content.title}</h2>}
          {content.subtitle && <p className="mt-4 text-lg text-muted-foreground">{content.subtitle}</p>}
        </div>
      )}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            {f.icon && (
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl text-primary">
                {f.icon}
              </div>
            )}
            <h3 className="text-lg font-bold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
