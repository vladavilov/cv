import { groq } from "@ai-sdk/groq";
import { generateObject, streamText } from "ai";
import { z } from "zod";

import { buildCvSearchPrompt, INTENT_SYSTEM_PROMPT } from "@/lib/ai";
import {
  chatRequestSchema,
  isLikelyPortfolioQuestion,
  type ChatRequest,
} from "@/lib/chat";
import { createFallbackResponse } from "@/lib/fallback-responses";
import { projects as portfolioProjects } from "@/lib/portfolio";
import { getProjectsByMatchedOrder, matchProjects } from "@/lib/query-matching";

export const maxDuration = 30;

const INTENT_MODEL = "openai/gpt-oss-120b";
const CV_SEARCH_MODEL = "llama-3.3-70b-versatile";

const intentSchema = z.object({
  intent: z.enum(["CV_PERSON_QUESTION", "OTHER"]),
});

const REJECTION_MESSAGE =
  "Intent analysis shows that this question is not related to Vladyslav Avilov's CV. It is better to use general-purpose models for such questions — this is the place to explore CV information, skills, and career history.";

function textStreamResponse(text: string) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return new Response("Request body must be valid JSON.", { status: 400 });
  }

  const parsedBody = chatRequestSchema.safeParse(rawBody);

  if (!parsedBody.success) {
    return new Response("Request body is invalid.", { status: 400 });
  }

  const body = parsedBody.data as ChatRequest;
  const prompt = body.prompt.trim();

  if (!prompt) {
    return new Response("Prompt is required.", { status: 400 });
  }

  const matchResult = matchProjects(prompt, portfolioProjects);
  const rankedProjects = getProjectsByMatchedOrder(portfolioProjects, matchResult.matchedProjectIds);
  const fallback = createFallbackResponse({
    prompt,
    activeFilter: matchResult.matchedSkills[0] ?? null,
    matchedSkills: matchResult.matchedSkills,
    projects: rankedProjects.map((project) => ({
      title: project.title,
      summary: project.summary,
    })),
  });
  const shouldRejectWithoutAi = !isLikelyPortfolioQuestion({
    prompt,
    activeFilter: matchResult.matchedSkills[0] ?? null,
    matchedSkills: matchResult.matchedSkills,
    projects: rankedProjects,
  });

  if (!process.env.GROQ_API_KEY) {
    return textStreamResponse(shouldRejectWithoutAi ? REJECTION_MESSAGE : fallback);
  }

  try {
    const intentResult = await generateObject({
      model: groq(INTENT_MODEL),
      schema: intentSchema,
      system: INTENT_SYSTEM_PROMPT,
      prompt,
      temperature: 0,
    });

    if (intentResult.object.intent !== "CV_PERSON_QUESTION") {
      return textStreamResponse(REJECTION_MESSAGE);
    }

    const cvPrompt = buildCvSearchPrompt(prompt);
    const result = streamText({
      model: groq(CV_SEARCH_MODEL),
      temperature: 0.3,
      maxOutputTokens: 512,
      system: cvPrompt.system,
      prompt: cvPrompt.user,
    });

    return result.toTextStreamResponse();
  } catch {
    return textStreamResponse(shouldRejectWithoutAi ? REJECTION_MESSAGE : fallback);
  }
}
