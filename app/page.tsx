import { PortfolioExperience } from "@/components/shared/portfolio-experience";
import { contactCta, projects, proofLinks, skillGraph } from "@/lib/portfolio";

export default function Home() {
  return (
    <PortfolioExperience
      projects={projects}
      skillGraph={skillGraph}
      proofLinks={proofLinks}
      contactCta={contactCta}
    />
  );
}
