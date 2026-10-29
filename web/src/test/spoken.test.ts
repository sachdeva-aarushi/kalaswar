import { describe, expect, it } from "vitest";
import { detectSpokenLang, stripSpokenIds } from "@/lib/spoken";

describe("stripSpokenIds", () => {
  it("removes order references from spoken replies", () => {
    expect(stripSpokenIds("Your order KSW-1053 is ready")).toBe("Your order is ready");
  });

  it("removes product UUIDs from spoken replies", () => {
    expect(stripSpokenIds("Published 55555555-0000-0000-0000-000000000001 for you")).toBe(
      "Published for you",
    );
  });

  it("keeps plain speech untouched", () => {
    const hindi = "आपका ऑर्डर तैयार है, ₹1,450 मिले हैं।";
    expect(stripSpokenIds(hindi)).toBe(hindi);
  });
});

describe("detectSpokenLang", () => {
  it("answers in Hindi even when the interface is English", () => {
    expect(detectSpokenLang("आपकी कमाई ₹7,130 हुई है।", "en")).toBe("hi");
  });

  it("uses the Marathi voice when the interface is Marathi", () => {
    expect(detectSpokenLang("तुमचे ऑर्डर तयार आहे.", "mr")).toBe("mr");
  });

  it("stays English for Latin text", () => {
    expect(detectSpokenLang("You have two orders ready.", "en")).toBe("en");
  });
});
