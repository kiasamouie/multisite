import type { OpeningHoursBlockContent } from "../../types";

export function OpeningHoursBlock({ content }: { content: OpeningHoursBlockContent }) {
  const hours = content.hours || [];

  return (
    <section className="mx-auto max-w-md px-6 py-12">
      {content.title && <h2 className="mb-8 text-center text-2xl font-bold">{content.title}</h2>}
      <div className="space-y-3">
        {hours.map((h, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <span className="font-medium">{h.day}</span>
            {h.closed ? (
              <span className="text-sm text-muted-foreground">Closed</span>
            ) : (
              <span className="text-sm">
                {h.open} – {h.close}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
