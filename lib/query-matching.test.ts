import { describe, expect, it } from "vitest";

import { getProjectsByMatchedOrder, sortProjectsForDisplay } from "./query-matching";
import type { Project } from "./types";

function createProject(
  id: string,
  options: Partial<Project> = {},
): Project {
  return {
    id,
    title: id,
    company: "Example Co",
    period: "2024",
    summary: "Example summary",
    logic: "Example logic",
    metrics: {},
    stack: ["TypeScript"],
    activeSkills: ["TypeScript"],
    trace: ["Search"],
    responsibilities: ["Build"],
    featured: false,
    ...options,
  };
}

describe("getProjectsByMatchedOrder", () => {
  it("preserves ranked match order from matched ids", () => {
    const projects = [
      createProject("alpha"),
      createProject("beta"),
      createProject("gamma"),
    ];

    expect(getProjectsByMatchedOrder(projects, ["gamma", "alpha"]).map((project) => project.id)).toEqual(
      ["gamma", "alpha"],
    );
  });
});

describe("sortProjectsForDisplay", () => {
  it("preserves relevance order within featured and supporting groups", () => {
    const projects = [
      createProject("featured-first", { featured: true }),
      createProject("supporting-first"),
      createProject("featured-second", { featured: true }),
      createProject("supporting-second"),
    ];

    const sorted = sortProjectsForDisplay(
      projects,
      ["supporting-second", "featured-second", "featured-first", "supporting-first"],
      null,
    );

    expect(sorted.filter((project) => project.featured).map((project) => project.id)).toEqual([
      "featured-second",
      "featured-first",
    ]);
    expect(sorted.filter((project) => !project.featured).map((project) => project.id)).toEqual([
      "supporting-second",
      "supporting-first",
    ]);
  });

  it("keeps active-filter-only matches behind ranked query matches", () => {
    const projects = [
      createProject("ranked", { activeSkills: ["LangGraph"] }),
      createProject("filter-only", { activeSkills: ["LangGraph"] }),
      createProject("unmatched"),
    ];

    const sorted = sortProjectsForDisplay(projects, ["ranked"], "LangGraph");

    expect(sorted.map((project) => project.id)).toEqual(["ranked", "filter-only", "unmatched"]);
  });
});
