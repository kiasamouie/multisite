import type { TestimonialsBlockContent } from "../../types";

interface TestimonialsBlockProps {
  content: TestimonialsBlockContent;
}

export function TestimonialsBlock({ content }: TestimonialsBlockProps) {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold">{content.title}</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {content.testimonials.map((t, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
              <p className="mb-4 italic text-muted-foreground">&ldquo;{t.content}&rdquo;</p>
              <div className="flex items-center gap-3">
                {t.avatarUrl && (
                  <img
                    src={t.avatarUrl}
                    alt={t.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  {t.role && (
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
