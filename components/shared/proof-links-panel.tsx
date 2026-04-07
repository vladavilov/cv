import { ExternalLink } from "lucide-react";

import type { ProofLink } from "@/lib/types";

type ProofLinksPanelProps = {
  proofLinks: ProofLink[];
};

export function ProofLinksPanel({ proofLinks }: ProofLinksPanelProps) {
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
          {proofLinks.map((proof) => (
            <div
              key={proof.id}
              className="flex flex-col rounded-lg border border-[#30302e] bg-[#30302e] p-5"
            >
              <h3 className="font-[family-name:var(--font-heading)] text-lg font-medium text-foreground">
                {proof.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#87867f]">
                {proof.note}
              </p>
              <a
                href={proof.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 self-start rounded-lg border border-[#3d3d3a] bg-[#141413] px-3 py-1.5 text-sm text-[#b0aea5] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-[#3d3d3a] hover:text-foreground"
              >
                View {proof.label}
                <span className="sr-only">(opens in a new tab)</span>
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
