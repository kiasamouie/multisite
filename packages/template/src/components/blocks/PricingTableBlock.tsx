import type { PricingTableBlockContent } from "../../types";
import { readStyledText } from "../../lib/content-style";
import { sectionAttrs, headingAttrs, textAttrs } from "../../lib/styled-block";

export function PricingTableBlock({ content }: { content: PricingTableBlockContent }) {
  const tiers = content.tiers || [];
  const title = readStyledText(content.title);
  const subtitle = readStyledText(content.subtitle);
  const sec = sectionAttrs("mx-auto max-w-6xl px-6 py-16", content.sectionStyle);
  const heading = headingAttrs("text-4xl font-bold", title.style);
  const sub = textAttrs("mt-4 text-lg text-muted-foreground", subtitle.style);

  return (
    <section className={sec.className} style={sec.style}>
      {title.value && (
        <div className="mb-12 text-center">
          <h2 className={heading.className} style={heading.style}>{title.value}</h2>
          {subtitle.value && <p className={sub.className} style={sub.style}>{subtitle.value}</p>}
        </div>
      )}
      <div className="grid gap-8 md:grid-cols-3">
        {tiers.map((tier, i) => (
          <div
            key={i}
            className={`relative flex flex-col rounded-2xl border p-8 ${
              tier.highlighted
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border bg-card"
            }`}
          >
            {tier.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                Most Popular
              </span>
            )}
            <h3 className="text-xl font-bold">{tier.name}</h3>
            <div className="mt-4">
              <span className="text-4xl font-extrabold">{tier.price}</span>
              {tier.period && <span className="text-muted-foreground">/{tier.period}</span>}
            </div>
            <ul className="mt-8 flex-1 space-y-3">
              {(tier.features || []).map((f, j) => (
                <li key={j} className="flex items-center gap-2 text-sm">
                  <svg className="h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={tier.ctaLink || "#"}
              className={`mt-8 block rounded-lg py-3 text-center text-sm font-bold transition ${
                tier.highlighted
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {tier.ctaText || "Get Started"}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
