import { z } from "zod";

const intentSchema = z.object({
  intent: z.enum(["CV_PERSON_QUESTION", "OTHER"]),
});

export type ParsedModelIntent = z.infer<typeof intentSchema>;

/** Parse JSON from the intent classifier; strips common ```json fences and tolerates stray whitespace. */
export function parseModelIntentJson(raw: string): ParsedModelIntent | null {
  const trimmed = raw.trim();
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    const parsed: unknown = JSON.parse(stripped);
    const result = intentSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
