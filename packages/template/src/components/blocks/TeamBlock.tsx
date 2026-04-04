import type { TeamBlockContent } from "../../types";

export function TeamBlock({ content }: { content: TeamBlockContent }) {
  const members = content.members || [];

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      {content.title && <h2 className="mb-10 text-center text-3xl font-bold">{content.title}</h2>}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 text-center">
            {m.imageUrl ? (
              <img src={m.imageUrl} alt={m.name} className="mx-auto mb-4 h-24 w-24 rounded-full object-cover" loading="lazy" />
            ) : (
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {m.name.charAt(0)}
              </div>
            )}
            <h3 className="text-lg font-bold">{m.name}</h3>
            <p className="text-sm text-primary">{m.role}</p>
            {m.bio && <p className="mt-3 text-sm text-muted-foreground">{m.bio}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
