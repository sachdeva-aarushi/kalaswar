import { describe, expect, it } from "vitest";

import { CONSENT_TYPES, canShowMakerName, canReuseForMarketing, consentGranted, makerCredit } from "@/lib/story";
import type { StoryConsent } from "@/lib/types";

const consent = (type: string, granted: boolean): StoryConsent => ({
  id: "c-" + type,
  story_id: "s1",
  consent_type: type as StoryConsent["consent_type"],
  granted,
  updated_by: "Maker",
  updated_at: "2026-01-01T00:00:00Z",
});

describe("craft story consent honesty rules", () => {
  it("never shows the maker's name without explicit consent", () => {
    expect(canShowMakerName([], "Sunita")).toBe(false);
  });

  it("does not show a name when consent exists but no name is recorded", () => {
    expect(canShowMakerName([consent("maker_name", true)], null)).toBe(false);
    expect(canShowMakerName([consent("maker_name", true)], "  ")).toBe(false);
  });

  it("shows the maker's name only with consent and a recorded name", () => {
    expect(canShowMakerName([consent("maker_name", true)], "Sunita")).toBe(true);
    expect(canShowMakerName([consent("maker_name", false)], "Sunita")).toBe(false);
  });

  it("a withdrawn consent stops attribution immediately", () => {
    const consents = [consent("maker_name", true)];
    expect(canShowMakerName(consents, "Sunita")).toBe(true);
    const withdrawn = [consent("maker_name", false)];
    expect(canShowMakerName(withdrawn, "Sunita")).toBe(false);
  });

  it("credits the collective when the maker withholds their name", () => {
    expect(makerCredit([consent("maker_name", false)], "Sunita", "Kouna Collective")).toBe(
      "Kouna Collective",
    );
    expect(makerCredit([], null, "Kouna Collective")).toBe("Kouna Collective");
    expect(makerCredit([], "Sunita", null)).toBeNull();
  });

  it("reads granted flags per consent type only", () => {
    const consents = [consent("maker_name", true), consent("marketing_reuse", false)];
    expect(consentGranted(consents, "maker_name")).toBe(true);
    expect(canReuseForMarketing(consents)).toBe(false);
  });

  it("exposes exactly the six consent types from the schema", () => {
    expect(CONSENT_TYPES).toHaveLength(6);
    expect(CONSENT_TYPES).toContain("cultural_notes");
    expect(CONSENT_TYPES).toContain("voice_transcript");
  });
});
