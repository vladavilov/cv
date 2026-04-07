import type { Project } from "@/lib/types";

type SkillKeyword = {
  skill: string;
  label: string;
  tokens: string[];
  prompt: string;
};

export type QueryMatchResult = {
  matchedSkills: string[];
  matchedProjectIds: string[];
  response: string;
};

const skillKeywords: SkillKeyword[] = [
  {
    skill: "LangGraph",
    label: "Agentic Systems",
    tokens: ["agentic", "langgraph", "langchain", "orchestration", "multi-agent", "ensemble"],
    prompt: "agentic AI and orchestration work",
  },
  {
    skill: "RAG",
    label: "RAG & Knowledge Graphs",
    tokens: ["rag", "retrieval", "knowledge graph", "neo4j", "vector", "embeddings", "graphrag"],
    prompt: "RAG and knowledge graph work",
  },
  {
    skill: "Fine-tuning",
    label: "Fine-tuning & LLMs",
    tokens: ["fine-tuning", "fine tune", "llm", "model", "training", "lora"],
    prompt: "fine-tuning and LLM work",
  },
  {
    skill: "Java",
    label: "Java & Spring",
    tokens: ["java", "spring", "spring boot", "hibernate", "jvm"],
    prompt: "Java and Spring Boot systems",
  },
  {
    skill: "Kafka",
    label: "Event-Driven",
    tokens: ["kafka", "event-driven", "streaming", "avro", "grpc", "fix protocol"],
    prompt: "event-driven and messaging systems",
  },
  {
    skill: "Microservices",
    label: "Architecture",
    tokens: ["microservices", "architecture", "platform", "cloud-native", "soa", "api"],
    prompt: "architecture and platform engineering",
  },
  {
    skill: "TypeScript",
    label: "TypeScript & React",
    tokens: ["typescript", "react", "nextjs", "next.js", "frontend", "ui"],
    prompt: "TypeScript and frontend systems",
  },
  {
    skill: "Docker",
    label: "DevOps & CI/CD",
    tokens: ["docker", "devops", "ci/cd", "cicd", "gitlab", "pipeline", "deployment"],
    prompt: "DevOps and CI/CD automation",
  },
  {
    skill: "Python",
    label: "Python",
    tokens: ["python", "fastapi", "flask"],
    prompt: "Python-based systems",
  },
];

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function includesToken(haystack: string, token: string) {
  return haystack.includes(token.toLowerCase());
}

export function matchProjects(query: string, projects: Project[]): QueryMatchResult {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return {
      matchedSkills: [],
      matchedProjectIds: [],
      response: "Ask about trading platforms, agentic AI, RAG, Java, or architecture to filter the experience.",
    };
  }

  const matchedSkills = skillKeywords
    .filter(({ tokens, skill }) => {
      return (
        includesToken(normalizedQuery, normalize(skill)) ||
        tokens.some((token) => includesToken(normalizedQuery, token))
      );
    })
    .map(({ skill }) => skill);

  const scoredProjects = projects
    .map((project) => {
      const haystack = normalize(
        [
          project.title,
          project.summary,
          project.logic,
          project.company,
          ...project.stack,
          ...project.activeSkills,
          ...project.trace,
          ...project.responsibilities,
        ].join(" "),
      );

      let score = 0;

      for (const word of normalizedQuery.split(/\s+/)) {
        if (word.length < 2) {
          continue;
        }

        if (includesToken(haystack, word)) {
          score += 1;
        }
      }

      for (const skill of matchedSkills) {
        if (project.activeSkills.includes(skill)) {
          score += 3;
        }
      }

      return { id: project.id, score };
    })
    .filter((project) => project.score > 0)
    .sort((left, right) => right.score - left.score);

  const matchedProjectIds = scoredProjects.map((project) => project.id);
  const leadingSkills = matchedSkills.length > 0 ? matchedSkills : ["relevant experience"];

  if (matchedProjectIds.length === 0) {
    return {
      matchedSkills,
      matchedProjectIds,
      response:
        "No precise match yet — the strongest themes are trading platforms, agentic AI systems, RAG, and enterprise architecture.",
    };
  }

  const featuredMatches = projects.filter(
    (project) => matchedProjectIds.includes(project.id) && project.featured,
  );

  const response =
    featuredMatches.length > 0
      ? `Highlighted ${featuredMatches.length} flagship role${featuredMatches.length > 1 ? "s" : ""} around ${leadingSkills.join(", ")} with supporting experience in view.`
      : `Surfaced ${matchedProjectIds.length} matching role${matchedProjectIds.length > 1 ? "s" : ""} around ${leadingSkills.join(", ")}.`;

  return {
    matchedSkills,
    matchedProjectIds,
    response,
  };
}

export function getProjectsByMatchedOrder(projects: Project[], matchedProjectIds: string[]) {
  const projectsById = new Map(projects.map((project) => [project.id, project]));

  return matchedProjectIds.flatMap((id) => {
    const project = projectsById.get(id);
    return project ? [project] : [];
  });
}

export function sortProjectsForDisplay(
  projects: Project[],
  matchedProjectIds: string[],
  activeFilter: string | null,
) {
  const highlightSet = new Set(matchedProjectIds);

  if (activeFilter) {
    projects
      .filter((project) => project.activeSkills.includes(activeFilter))
      .forEach((project) => highlightSet.add(project.id));
  }

  const rankMap = new Map(matchedProjectIds.map((id, index) => [id, index]));
  const sourceOrder = new Map(projects.map((project, index) => [project.id, index]));

  return [...projects].sort((left, right) => {
    const leftHighlighted = highlightSet.has(left.id) ? 1 : 0;
    const rightHighlighted = highlightSet.has(right.id) ? 1 : 0;

    if (leftHighlighted !== rightHighlighted) {
      return rightHighlighted - leftHighlighted;
    }

    const leftRank = rankMap.get(left.id) ?? Number.POSITIVE_INFINITY;
    const rightRank = rankMap.get(right.id) ?? Number.POSITIVE_INFINITY;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    if (left.featured !== right.featured) {
      return left.featured ? -1 : 1;
    }

    return (sourceOrder.get(left.id) ?? 0) - (sourceOrder.get(right.id) ?? 0);
  });
}

export function getPromptSuggestions() {
  return skillKeywords.slice(0, 7).map(({ label, prompt, skill }) => ({
    label,
    query: `Show me ${prompt}`,
    skill,
  }));
}
