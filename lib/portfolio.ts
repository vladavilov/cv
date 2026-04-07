import cvData from "@/data/cv.json";
import skillsData from "@/data/skills.json";
import { contactCta, proofLinks } from "@/data/site";
import type { Project, SkillGraph } from "@/lib/types";

type CvData = {
  projects: Project[];
};

function invariant(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function isIntegerBetween(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max;
}

const cv = cvData as unknown as CvData;
const skillGraph = skillsData as unknown as SkillGraph;

const skillIds = new Set(skillGraph.nodes.map((node) => node.id));
const skillLabels = new Set(skillGraph.nodes.map((node) => node.label));

for (const node of skillGraph.nodes) {
  invariant(
    isIntegerBetween(node.val, 1, 10),
    `Skill node "${node.label}" must have an integer val between 1 and 10.`,
  );
}

for (const link of skillGraph.links) {
  invariant(
    skillIds.has(link.source) && skillIds.has(link.target),
    `Skill link "${link.source}" -> "${link.target}" references an unknown node.`,
  );
}

for (const project of cv.projects) {
  invariant(
    project.activeSkills.every((skill) => skillLabels.has(skill)),
    `Project "${project.title}" references an active skill missing from skills.json.`,
  );
}

export const projects = cv.projects;
export { skillGraph, proofLinks, contactCta };

export const portfolioStats = {
  projectCount: projects.length,
  featuredCount: projects.filter((project) => project.featured).length,
  skillCount: skillGraph.nodes.length,
  proofCount: proofLinks.length,
};
