import { z } from "zod";

const chatProjectSchema = z.object({
  title: z.string(),
  company: z.string(),
  summary: z.string(),
  logic: z.string(),
  activeSkills: z.array(z.string()),
  stack: z.array(z.string()),
});

export const chatRequestSchema = z.object({
  prompt: z.string(),
  activeFilter: z.string().nullable().optional(),
  matchedSkills: z.array(z.string()).optional(),
  projects: z.array(chatProjectSchema).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

const portfolioKeywords = [
  "agentic",
  "architecture",
  "architect",
  "avilov",
  "career",
  "cv",
  "docker",
  "engineer",
  "engineering",
  "experience",
  "financial",
  "fine-tuning",
  "java",
  "kafka",
  "langgraph",
  "luxoft",
  "microservices",
  "next.js",
  "nextjs",
  "portfolio",
  "project",
  "projects",
  "python",
  "rag",
  "react",
  "resume",
  "role",
  "roles",
  "skill",
  "skills",
  "spring",
  "stack",
  "trading",
  "typescript",
  "ubs",
  "vlad",
  "vladyslav",
];

const portfolioPhrases = [
  "agentic ai",
  "financial markets",
  "fine tuning",
  "fine-tuning",
  "knowledge graph",
  "next.js",
  "nextjs",
  "software engineering",
  "trading platforms",
];

const firstPersonPortfolioPattern =
  /\b(your|you|his)\b.*\b(career|cv|experience|portfolio|project|projects|role|roles|skill|skills|work)\b|\b(career|cv|experience|portfolio|project|projects|role|roles|skill|skills|work)\b.*\b(your|you|his)\b/i;

export function isLikelyPortfolioQuestion({
  prompt,
  activeFilter,
  matchedSkills = [],
  projects = [],
}: Pick<ChatRequest, "prompt" | "activeFilter" | "matchedSkills" | "projects">) {
  if (activeFilter || matchedSkills.length > 0 || projects.length > 0) {
    return true;
  }

  const normalizedPrompt = prompt.trim().toLowerCase();
  const promptTokens = new Set(normalizedPrompt.match(/[a-z0-9]+(?:\.[a-z0-9]+)*/g) ?? []);

  if (!normalizedPrompt) {
    return false;
  }

  if (firstPersonPortfolioPattern.test(normalizedPrompt)) {
    return true;
  }

  if (portfolioKeywords.some((keyword) => promptTokens.has(keyword))) {
    return true;
  }

  return portfolioPhrases.some((phrase) => normalizedPrompt.includes(phrase));
}
