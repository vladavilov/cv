import Groq from "groq-sdk";
import { z } from "zod";

import { buildCvSearchPrompt, INTENT_SYSTEM_PROMPT } from "@/lib/ai";
import { chatRequestSchema, type ChatRequest } from "@/lib/chat";

export const maxDuration = 30;

const INTENT_MODEL = "openai/gpt-oss-20b";
const CV_SEARCH_MODEL = "openai/gpt-oss-120b";

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
  const requestId = crypto.randomUUID().slice(0, 8);
  const start = Date.now();
  const log = (step: string, data?: Record<string, unknown>) =>
    console.log(JSON.stringify({ requestId, step, ms: Date.now() - start, ...data }));

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    log("parse_error", { reason: "invalid JSON" });
    return new Response("Request body must be valid JSON.", { status: 400 });
  }

  log("raw_body", { rawBody });

  const parsedBody = chatRequestSchema.safeParse(rawBody);

  if (!parsedBody.success) {
    log("validation_error", { issues: parsedBody.error.issues });
    return new Response("Request body is invalid.", { status: 400 });
  }

  const body = parsedBody.data as ChatRequest;
  const prompt = body.prompt.trim();

  log("parsed_input", { prompt, promptLength: prompt.length });

  if (!prompt) {
    log("empty_prompt");
    return new Response("Prompt is required.", { status: 400 });
  }

  if (!process.env.GROQ_API_KEY) {
    log("missing_api_key");
    return new Response("AI search is temporarily unavailable.", { status: 503 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    log("intent_start", { model: INTENT_MODEL });

    const intentCompletion = await groq.chat.completions.create({
      model: INTENT_MODEL,
      messages: [
        { role: "system", content: INTENT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_completion_tokens: 128,
      top_p: 1,
      stream: false,
      reasoning_effort: "medium",
      response_format: { type: "json_object" },
      stop: null,
    });

    const intentRaw = intentCompletion.choices[0]?.message?.content ?? "";
    log("intent_raw", {
      model: INTENT_MODEL,
      content: intentRaw,
      usage: intentCompletion.usage,
    });

    const intentParsed = intentSchema.safeParse(JSON.parse(intentRaw));

    if (!intentParsed.success) {
      log("intent_parse_error", { content: intentRaw, issues: intentParsed.error.issues });
      return new Response("Something went wrong — please try again.", { status: 502 });
    }

    const intent = intentParsed.data.intent;
    log("intent_result", { intent });

    if (intent !== "CV_PERSON_QUESTION") {
      log("rejected", { intent });
      return textStreamResponse(REJECTION_MESSAGE);
    }

    const cvPrompt = buildCvSearchPrompt(prompt);
    log("cv_search_start", {
      model: CV_SEARCH_MODEL,
      systemLength: cvPrompt.system.length,
      userPrompt: cvPrompt.user,
    });

    const stream = await groq.chat.completions.create({
      model: CV_SEARCH_MODEL,
      messages: [
        { role: "system", content: cvPrompt.system },
        { role: "user", content: cvPrompt.user },
      ],
      temperature: 0.3,
      max_completion_tokens: 4096,
      top_p: 1,
      stream: true,
      reasoning_effort: "high",
      stop: null,
    });

    const encoder = new TextEncoder();
    let totalText = "";

    const readable = new ReadableStream({
      async pull(controller) {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;

          if (delta) {
            totalText += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }

        log("cv_search_done", {
          model: CV_SEARCH_MODEL,
          responseLength: totalText.length,
        });
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    log("error", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
    });
    return new Response("Something went wrong — please try again.", { status: 502 });
  }
}
