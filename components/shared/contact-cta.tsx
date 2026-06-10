import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { ButtonLink } from "@/components/ui/button";
import type { ContactCtaContent } from "@/lib/types";

type ContactCtaProps = {
  content: ContactCtaContent;
};

export function ContactCta({ content }: ContactCtaProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <footer>
    <section id="contact" aria-labelledby="contact-heading" className="section-shell pb-16 md:pb-24">
      <div className="page-shell">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: "easeOut" }}
          className="rounded-lg border border-border bg-card p-5 md:p-6"
        >
          <div className="space-y-3">
            <p className="section-kicker">Contact</p>
            <h2 id="contact-heading" className="section-heading text-xl md:text-3xl">
              Start a Conversation
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {content.statement}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {content.actions.map((action) => (
              <ButtonLink
                key={action.id}
                href={action.href}
                target={action.href.startsWith("http") ? "_blank" : undefined}
                rel={action.href.startsWith("http") ? "noreferrer" : undefined}
              >
                {action.label}
                {action.href.startsWith("http") ? (
                  <span className="sr-only">(opens in a new tab)</span>
                ) : null}
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </ButtonLink>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
    </footer>
  );
}
