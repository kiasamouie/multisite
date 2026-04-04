import type { BlogGridBlockContent } from "../../types";

export function BlogGridBlock({ content }: { content: BlogGridBlockContent }) {
  const posts = content.posts || [];

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      {content.title && <h2 className="mb-10 text-center text-3xl font-bold">{content.title}</h2>}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => (
          <a
            key={i}
            href={p.href}
            className="group overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-lg"
          >
            {p.imageUrl && (
              <img
                src={p.imageUrl}
                alt={p.title}
                className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            )}
            <div className="p-5">
              {(p.date || p.author) && (
                <p className="mb-2 text-xs text-muted-foreground">
                  {p.date && p.date}
                  {p.date && p.author && " · "}
                  {p.author && p.author}
                </p>
              )}
              <h3 className="text-lg font-bold group-hover:text-primary">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
