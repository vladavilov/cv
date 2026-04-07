import { ArrowUpRight } from "lucide-react";

import type { ContactCtaContent } from "@/lib/types";

type ContactCtaProps = {
  content: ContactCtaContent;
};

export function ContactCta({ content }: ContactCtaProps) {
  return (
    <footer>
    <section id="contact" aria-labelledby="contact-heading" className="section-shell pb-16 md:pb-24">
      <div className="page-shell">
        <div className="rounded-lg border border-[#30302e] bg-[#30302e] p-5 md:p-6">
          <div className="space-y-3">
            <p className="section-kicker">Contact</p>
            <h2 id="contact-heading" className="section-heading text-xl md:text-3xl">
              Start a Conversation
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-[#87867f]">
              {content.statement}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {content.actions.map((action) => (
              <a
                key={action.id}
                href={action.href}
                target={action.href.startsWith("http") ? "_blank" : undefined}
                rel={action.href.startsWith("http") ? "noreferrer" : undefined}
                className="inline-flex items-center gap-2 rounded-lg bg-[#c96442] px-4 py-2 text-sm font-medium text-[#faf9f5] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-[#d97757]"
              >
                {action.label}
                {action.href.startsWith("http") ? (
                  <span className="sr-only">(opens in a new tab)</span>
                ) : null}
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
    </footer>
  );
}
