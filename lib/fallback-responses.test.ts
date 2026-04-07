import { describe, expect, it } from "vitest";

import { createFallbackResponse, getChatFallbackFromRequest } from "./fallback-responses";

describe("createFallbackResponse", () => {
  it("uses ranked project order for strongest examples", () => {
    const response = createFallbackResponse({
      prompt: "Show me agentic work",
      projects: [
        { title: "Top Match", summary: "First" },
        { title: "Second Match", summary: "Second" },
        { title: "Third Match", summary: "Third" },
      ],
    });

    expect(response).toContain("The strongest examples are Top Match and Second Match.");
  });
});

describe("getChatFallbackFromRequest", () => {
  it("maps ChatRequest projects to ranked strongest examples", () => {
    const text = getChatFallbackFromRequest({
      prompt: "RAG work",
      activeFilter: "RAG",
      matchedSkills: ["RAG"],
      projects: [
        {
          title: "First",
          company: "A",
          summary: "s",
          logic: "l",
          activeSkills: ["RAG"],
          stack: [],
        },
        {
          title: "Second",
          company: "B",
          summary: "s",
          logic: "l",
          activeSkills: ["RAG"],
          stack: [],
        },
      ],
    });

    expect(text).toContain("The strongest examples are First and Second.");
  });
});
