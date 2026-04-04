import type { NewsletterBlockContent } from "../../types";

export function NewsletterBlock({ content }: { content: NewsletterBlockContent }) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16 text-center">
      {content.title && <h2 className="text-3xl font-bold">{content.title}</h2>}
      {content.subtitle && <p className="mt-3 text-muted-foreground">{content.subtitle}</p>}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
      >
        <input
          type="email"
          placeholder={content.placeholder || "Enter your email"}
          required
          className="w-full max-w-sm rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary sm:w-auto sm:flex-1"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
        >
          {content.buttonText || "Subscribe"}
        </button>
      </form>
    </section>
  );
}
