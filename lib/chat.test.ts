import { describe, expect, it } from "vitest";

import { chatRequestSchema, isLikelyPortfolioQuestion } from "./chat";

describe("chatRequestSchema", () => {
  it("rejects invalid project shapes", () => {
    const result = chatRequestSchema.safeParse({
      prompt: "Show me portfolio work",
      projects: { title: "Not an array" },
    });

    expect(result.success).toBe(false);
  });

  it("accepts the client request shape", () => {
    const result = chatRequestSchema.safeParse({
      prompt: "Show me agentic AI work",
      activeFilter: "LangGraph",
      matchedSkills: ["LangGraph"],
      projects: [
        {
          title: "Agentic AI Requirements Engineering System",
          company: "Freelance",
          summary: "Built a multi-agent system.",
          logic: "Intent routing and orchestration.",
          activeSkills: ["LangGraph"],
          stack: ["TypeScript"],
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});

describe("isLikelyPortfolioQuestion", () => {
  it("rejects clearly off-topic prompts in degraded mode", () => {
    expect(
      isLikelyPortfolioQuestion({
        prompt: "What is the capital of France?",
      }),
    ).toBe(false);
  });

  it("does not treat substring matches as portfolio intent", () => {
    expect(
      isLikelyPortfolioQuestion({
        prompt: "Explain javascript closures and the average case complexity of quicksort.",
      }),
    ).toBe(false);
  });

  it("accepts portfolio prompts from query keywords", () => {
    expect(
      isLikelyPortfolioQuestion({
        prompt: "Show me agentic systems and RAG work",
      }),
    ).toBe(true);
  });

  it("accepts prompts when client matching already found portfolio context", () => {
    expect(
      isLikelyPortfolioQuestion({
        prompt: "Tell me more",
        matchedSkills: ["LangGraph"],
      }),
    ).toBe(true);
  });
});
