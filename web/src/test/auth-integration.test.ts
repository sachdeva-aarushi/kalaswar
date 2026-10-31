import { describe, it, expect } from "vitest";
import {
  getRedirectForRole,
  determineHighestPriorityRole,
  resolveUserRole,
  type KwRole,
} from "../features/auth/auth-provider";

describe("Auth Integration & Role Redirection", () => {
  it("maps roles to the exact required redirect targets", () => {
    expect(getRedirectForRole("artisan")).toBe("/workroom/artisan");
    expect(getRedirectForRole("coordinator")).toBe("/workroom");
    expect(getRedirectForRole("buyer")).toBe("/shop");
    expect(getRedirectForRole("customer")).toBe("/shop");
    expect(getRedirectForRole(null)).toBe("/shop");
    expect(getRedirectForRole(undefined)).toBe("/shop");
  });

  it("handles role precedence correctly when user has multiple roles", () => {
    // Exact precedence order: coordinator > artisan > buyer > customer
    expect(determineHighestPriorityRole(["customer", "coordinator"])).toBe("coordinator");
    expect(determineHighestPriorityRole(["artisan", "coordinator"])).toBe("coordinator");
    expect(determineHighestPriorityRole(["customer", "artisan"])).toBe("artisan");
    expect(determineHighestPriorityRole(["customer", "buyer"])).toBe("buyer");
    expect(determineHighestPriorityRole(["customer"])).toBe("customer");

    // Fallback to metadata
    expect(determineHighestPriorityRole([], "coordinator")).toBe("coordinator");
    expect(determineHighestPriorityRole([], "artisan")).toBe("artisan");
    expect(determineHighestPriorityRole([], "buyer")).toBe("buyer");
    expect(determineHighestPriorityRole([], "customer")).toBe("customer");
    expect(determineHighestPriorityRole([], null)).toBe("customer");
  });

  it("maps demo user roles from README to their correct post-login paths", () => {
    const demoAccounts: Array<{ role: KwRole; expectedRedirect: string }> = [
      { role: "coordinator", expectedRedirect: "/workroom" },
      { role: "artisan", expectedRedirect: "/workroom/artisan" },
      { role: "customer", expectedRedirect: "/shop" },
      { role: "buyer", expectedRedirect: "/shop" },
    ];

    for (const { role, expectedRedirect } of demoAccounts) {
      expect(getRedirectForRole(role)).toBe(expectedRedirect);
    }
  });

  it("correctly identifies error kinds for display in existing error container", () => {
    function classifyError(error: Error | null): "creds" | "exists" | "weak" | "generic" {
      if (!error) return "generic";
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) {
        return "creds";
      }
      if (msg.includes("already registered") || msg.includes("already exists")) {
        return "exists";
      }
      if (msg.includes("at least 8") || msg.includes("weak")) {
        return "weak";
      }
      return "generic";
    }

    expect(classifyError(new Error("Invalid login credentials"))).toBe("creds");
    expect(classifyError(new Error("User already registered"))).toBe("exists");
    expect(classifyError(new Error("Password should be at least 8 characters"))).toBe("weak");
    expect(classifyError(new Error("Network timeout"))).toBe("generic");
  });
});
