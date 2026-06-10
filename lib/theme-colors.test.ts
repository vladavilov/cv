import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { themeColorFallbacks, tokenToCssVariable } from "./theme-colors";

/**
 * Guards against drift between the hex fallbacks in `lib/theme-colors.ts`
 * and the canonical token definitions in `app/globals.css` `:root`.
 */
function parseRootVariables(): Record<string, string> {
  const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");
  const rootBlock = /:root\s*\{([^}]*)\}/.exec(css)?.[1];

  if (!rootBlock) {
    throw new Error("Could not find a :root block in app/globals.css");
  }

  const variables: Record<string, string> = {};

  for (const match of rootBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    variables[match[1]] = match[2].trim().toLowerCase();
  }

  return variables;
}

describe("theme color fallbacks", () => {
  const rootVariables = parseRootVariables();

  it.each(
    (Object.keys(themeColorFallbacks) as Array<keyof typeof themeColorFallbacks>).map(
      (token) => [token, tokenToCssVariable[token]] as const,
    ),
  )("fallback for %s matches globals.css %s", (token, cssVariable) => {
    expect(rootVariables[cssVariable]).toBeDefined();
    expect(themeColorFallbacks[token].toLowerCase()).toBe(rootVariables[cssVariable]);
  });
});
