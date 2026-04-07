import type { ChatRequest } from "@/lib/chat";

type FallbackResponseArgs = {
  prompt: string;
  activeFilter?: string | null;
  matchedSkills?: string[];
  projects?: Array<{
    title: string;
    summary: string;
  }>;
};

/** Deterministic copy for degraded API paths; uses ranked `projects` from the client when present. */
export function getChatFallbackFromRequest(
  body: Pick<ChatRequest, "prompt" | "activeFilter" | "matchedSkills" | "projects">,
): string {
  const projects =
    body.projects?.map((project) => ({
      title: project.title,
      summary: project.summary,
    })) ?? [];

  return createFallbackResponse({
    prompt: body.prompt,
    activeFilter: body.activeFilter ?? null,
    matchedSkills: body.matchedSkills ?? [],
    projects,
  });
}

export function createFallbackResponse({
  prompt,
  activeFilter,
  matchedSkills = [],
  projects = [],
}: FallbackResponseArgs) {
  const lead = activeFilter
    ? `I prioritized the portfolio around ${activeFilter}.`
    : "I prioritized the closest portfolio matches.";

  const projectLead =
    projects.length > 0
      ? `The strongest examples are ${projects
          .slice(0, 2)
          .map((project) => project.title)
          .join(" and ")}.`
      : "The clearest themes remain agentic systems, fine-tuning, RAG, and UI systems.";

  const skillLead =
    matchedSkills.length > 0
      ? `Matched skills: ${matchedSkills.join(", ")}.`
      : "Ask with a specific skill or outcome to tighten the match further.";

  return [lead, projectLead, skillLead, `Prompt: ${prompt}.`].join(" ");
}
