import type { NewsletterBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs, textAttrs } from "../../lib/styled-block";

export function NewsletterBlock({ content }: { content: NewsletterBlockContent }) {
  const title = readStyledText(content.title);
  const subtitle = readStyledText(content.subtitle);
  const sec = sectionAttrs("mx-auto max-w-2xl px-6 py-16 text-center", content.sectionStyle);
  const heading = headingAttrs("text-3xl font-bold", title.style);
  const sub = textAttrs("mt-3 text-muted-foreground", subtitle.style);
  return (
    <section className={sec.className} style={sec.style}>
      {title.value && <h2 className={heading.className} style={heading.style}>{title.value}</h2>}
      {subtitle.value && <p className={sub.className} style={sub.style}>{subtitle.value}</p>}
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
