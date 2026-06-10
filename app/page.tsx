import { PortfolioExperience } from "@/components/shared/portfolio-experience";
import { contactCta, projects, proofLinks, skillGraph } from "@/lib/portfolio";

export default function Home() {
  // useSearchParams is isolated behind a leaf Suspense boundary inside
  // PortfolioExperience (SearchParamsSync), so the page itself prerenders
  // with full static content. See ADR-008.
  return (
    <PortfolioExperience
      projects={projects}
      skillGraph={skillGraph}
      proofLinks={proofLinks}
      contactCta={contactCta}
    />
  );
}
