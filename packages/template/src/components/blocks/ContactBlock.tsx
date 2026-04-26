import type { ContactBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs, textAttrs } from "../../lib/styled-block";

interface ContactBlockProps {
  content: ContactBlockContent;
}

export function ContactBlock({ content }: ContactBlockProps) {
  const title = readStyledText(content.title);
  const subtitle = readStyledText(content.subtitle);
  const sec = sectionAttrs("bg-muted/50 px-4 py-16", content.sectionStyle);
  const heading = headingAttrs("mb-4 text-3xl font-bold", title.style);
  const sub = textAttrs("mb-8 text-muted-foreground", subtitle.style);
  return (
    <section className={sec.className} style={sec.style}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className={heading.className} style={heading.style}>{title.value}</h2>
        {subtitle.value && (
          <p className={sub.className} style={sub.style}>{subtitle.value}</p>
        )}
        <div className="mb-8 flex flex-col gap-2 text-sm text-muted-foreground">
          {content.email && <p>Email: {content.email}</p>}
          {content.phone && <p>Phone: {content.phone}</p>}
        </div>
        {content.showForm && (
          <form
            className="space-y-4 text-left"
            action="/api/contact"
            method="POST"
          >
            <div>
              <label htmlFor="contact-name" className="mb-1 block text-sm font-medium">Name</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-1 block text-sm font-medium">Email</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="mb-1 block text-sm font-medium">Message</label>
              <textarea
                id="contact-message"
                name="message"
                rows={4}
                required
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
