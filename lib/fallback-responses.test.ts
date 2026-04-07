import { describe, expect, it } from "vitest";

import { createFallbackResponse } from "./fallback-responses";

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
