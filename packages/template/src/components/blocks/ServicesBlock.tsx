import type { ServicesBlockContent } from "../../types";

interface ServicesBlockProps {
  content: ServicesBlockContent;
}

export function ServicesBlock({ content }: ServicesBlockProps) {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold">{content.title}</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {content.services.map((service, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
              {service.icon && (
                <div className="mb-4 text-3xl">{service.icon}</div>
              )}
              <h3 className="mb-2 text-xl font-semibold">{service.name}</h3>
              <p className="text-muted-foreground">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
