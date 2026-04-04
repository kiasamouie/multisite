import type { StatsBlockContent } from "../../types";

export function StatsBlock({ content }: { content: StatsBlockContent }) {
  const stats = content.stats || [];

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      {content.title && <h2 className="mb-10 text-center text-3xl font-bold">{content.title}</h2>}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl font-extrabold text-primary">
              {s.value}
              {s.suffix && <span className="text-2xl">{s.suffix}</span>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
