export type ProjectMetrics = Record<string, string>;

export type Project = {
  id: string;
  title: string;
  company: string;
  period: string;
  summary: string;
  logic: string;
  metrics: ProjectMetrics;
  stack: string[];
  activeSkills: string[];
  trace: string[];
  responsibilities: string[];
  featured: boolean;
};

export type SkillNodeCategory =
  | "AI & ML"
  | "Languages"
  | "Frontend"
  | "Backend"
  | "DevOps";

export type SkillNode = {
  id: string;
  label: string;
  category: SkillNodeCategory;
  val: number;
};

export type SkillLink = {
  source: string;
  target: string;
};

export type SkillGraph = {
  nodes: SkillNode[];
  links: SkillLink[];
};

export type ProofLink = {
  id: string;
  label: string;
  href: string;
  note: string;
};

export type ContactLink = {
  id: string;
  label: string;
  href: string;
};

export type ContactCtaContent = {
  statement: string;
  actions: ContactLink[];
};
