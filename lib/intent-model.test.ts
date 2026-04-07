import { describe, expect, it } from "vitest";

import { parseModelIntentJson } from "./intent-model";

describe("parseModelIntentJson", () => {
  it("parses plain JSON", () => {
    expect(parseModelIntentJson('{"intent":"CV_PERSON_QUESTION"}')).toEqual({
      intent: "CV_PERSON_QUESTION",
    });
  });

  it("strips markdown json fences", () => {
    expect(
      parseModelIntentJson('```json\n{"intent":"OTHER"}\n```'),
    ).toEqual({ intent: "OTHER" });
  });

  it("returns null for invalid JSON", () => {
    expect(parseModelIntentJson("not json")).toBeNull();
  });

  it("returns null for wrong shape", () => {
    expect(parseModelIntentJson('{"intent":"MAYBE"}')).toBeNull();
  });
});
