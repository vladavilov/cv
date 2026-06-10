import { ExternalLink } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { ButtonLink } from "@/components/ui/button";
import type { ProofLink } from "@/lib/types";

type ProofLinksPanelProps = {
  proofLinks: ProofLink[];
};

export function ProofLinksPanel({ proofLinks }: ProofLinksPanelProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="proofs" aria-labelledby="proofs-heading" className="section-shell">
      <div className="page-shell space-y-8">
        <div className="space-y-3">
          <p className="section-kicker">Proofs</p>
          <h2 id="proofs-heading" className="section-heading">
            External proof, one click away.
          </h2>
          <p className="section-copy">
            References, profiles, and repositories without leaving the page.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {proofLinks.map((proof, index) => (
            <motion.div
              key={proof.id}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.28,
                ease: "easeOut",
                delay: shouldReduceMotion ? 0 : index * 0.06,
              }}
              className="flex flex-col rounded-lg border border-border bg-card p-5"
            >
              <h3 className="font-[family-name:var(--font-heading)] text-lg font-medium text-foreground">
                {proof.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {proof.note}
              </p>
              <ButtonLink
                variant="outline"
                size="sm"
                className="mt-4 self-start"
                href={proof.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                View {proof.label}
                <span className="sr-only">(opens in a new tab)</span>
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </ButtonLink>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
