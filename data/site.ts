import type { ContactCtaContent, ProofLink } from "@/lib/types";

export const proofLinks: ProofLink[] = [
  {
    id: "linkedin-recommendations",
    label: "Recommendations",
    href: "https://www.linkedin.com/in/vladislavavilov/details/recommendations/?detailScreenTabIndex=0",
    note: "Professional recommendations from colleagues and managers.",
  },
  {
    id: "github-profile",
    label: "GitHub",
    href: "https://github.com/vladavilov/",
    note: "Open-source projects, experiments, and code samples.",
  },
];

export const contactCta: ContactCtaContent = {
  statement:
    "15+ years building trading platforms, agentic AI systems, and engineering teams. Open to architectural leadership and AI-driven product roles.",
  actions: [
    {
      id: "email",
      label: "Email",
      href: "mailto:vlad.avilov@gmail.com",
    },
    {
      id: "github",
      label: "GitHub",
      href: "https://github.com/vladavilov/",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/vladislavavilov",
    },
  ],
};
