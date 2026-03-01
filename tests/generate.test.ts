import { describe, it, expect } from "vitest";
import { generateRegex } from "../src/tools/generate.js";

describe("regex_generate", () => {
  // --- Known pattern categories ---
  it("generates email pattern", () => {
    const result = generateRegex({ description: "email address" });
    expect(result).toContain("Best match");
    expect(result).toContain("@");
    expect(result).toContain("email");
  });

  it("generates URL pattern", () => {
    const result = generateRegex({ description: "url http link" });
    expect(result).toContain("Best match");
    expect(result).toContain("https?");
  });

  it("generates IPv4 pattern", () => {
    const result = generateRegex({ description: "ipv4 address" });
    expect(result).toContain("Best match");
    expect(result).toContain("25[0-5]");
  });

  it("generates phone number pattern", () => {
    const result = generateRegex({ description: "phone number" });
    expect(result).toContain("Best match");
    expect(result).toContain("phone");
  });

  it("generates ISO date pattern", () => {
    const result = generateRegex({ description: "yyyy-mm-dd date" });
    expect(result).toContain("Best match");
    expect(result).toContain("YYYY-MM-DD");
  });

  it("generates US date pattern", () => {
    const result = generateRegex({ description: "us date mm/dd/yyyy" });
    expect(result).toContain("MM/DD/YYYY");
  });

  it("generates time pattern", () => {
    const result = generateRegex({ description: "24 hour time hh:mm" });
    expect(result).toContain("Best match");
  });

  it("generates hex color pattern", () => {
    const result = generateRegex({ description: "hex color css" });
    expect(result).toContain("#");
  });

  it("generates UUID pattern", () => {
    const result = generateRegex({ description: "uuid" });
    expect(result).toContain("Best match");
    expect(result).toContain("UUID");
  });

  it("generates integer pattern", () => {
    const result = generateRegex({ description: "integer number" });
    expect(result).toContain("Best match");
  });

  it("generates decimal pattern", () => {
    const result = generateRegex({ description: "decimal float number" });
    expect(result).toContain("Best match");
  });

  it("generates credit card pattern", () => {
    const result = generateRegex({ description: "credit card number" });
    expect(result).toContain("Best match");
    expect(result).toContain("16-digit");
  });

  it("generates ZIP code pattern", () => {
    const result = generateRegex({ description: "zip code postal" });
    expect(result).toContain("Best match");
  });

  it("generates MAC address pattern", () => {
    const result = generateRegex({ description: "mac address" });
    expect(result).toContain("Best match");
    expect(result).toContain("MAC");
  });

  it("generates semver pattern", () => {
    const result = generateRegex({ description: "semver semantic version" });
    expect(result).toContain("Best match");
  });

  it("generates markdown link pattern", () => {
    const result = generateRegex({ description: "markdown link" });
    expect(result).toContain("Best match");
    expect(result).toContain("Markdown");
  });

  it("generates password validation pattern", () => {
    const result = generateRegex({ description: "strong password" });
    expect(result).toContain("Best match");
    expect(result).toContain("password");
  });

  it("generates HTML tag pattern with suggested flags", () => {
    const result = generateRegex({ description: "html tag" });
    expect(result).toContain("Best match");
    expect(result).toContain("Suggested flags:");
  });

  // --- Multiple results ---
  it("returns up to 3 alternatives when multiple match", () => {
    const result = generateRegex({ description: "date" });
    // "date" matches both ISO date and US date templates
    expect(result).toContain("Best match");
    expect(result).toContain("Alternative");
  });

  // --- No match ---
  it("shows fallback when no template matches", () => {
    const result = generateRegex({ description: "quantum flux capacitor regex" });
    expect(result).toContain("No matching pattern template");
    expect(result).toContain("Available categories:");
  });

  it("lists all available categories in fallback", () => {
    const result = generateRegex({ description: "xyznonexistent" });
    expect(result).toContain("email");
    expect(result).toContain("url");
    expect(result).toContain("uuid");
  });

  // --- Case insensitivity ---
  it("handles uppercase description", () => {
    const result = generateRegex({ description: "EMAIL ADDRESS" });
    expect(result).toContain("Best match");
  });

  it("handles mixed case", () => {
    const result = generateRegex({ description: "Phone Number" });
    expect(result).toContain("Best match");
  });

  // --- Generated patterns actually work ---
  it("generated email pattern matches valid email", () => {
    const result = generateRegex({ description: "email" });
    const patternLine = result.split("\n").find((l) => l.includes("Pattern:"));
    expect(patternLine).toBeTruthy();
    const pattern = patternLine!.replace(/.*Pattern:\s*/, "").trim();
    const regex = new RegExp(pattern);
    expect(regex.test("user@example.com")).toBe(true);
    expect(regex.test("invalid")).toBe(false);
  });

  it("generated UUID pattern matches valid UUID", () => {
    const result = generateRegex({ description: "uuid" });
    const patternLine = result.split("\n").find((l) => l.includes("Pattern:"));
    const pattern = patternLine!.replace(/.*Pattern:\s*/, "").trim();
    const regex = new RegExp(pattern);
    expect(regex.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(regex.test("not-a-uuid")).toBe(false);
  });

  it("generated IPv4 pattern matches valid IP", () => {
    const result = generateRegex({ description: "ipv4" });
    const patternLine = result.split("\n").find((l) => l.includes("Pattern:"));
    const pattern = patternLine!.replace(/.*Pattern:\s*/, "").trim();
    const regex = new RegExp(pattern);
    expect(regex.test("192.168.1.1")).toBe(true);
    expect(regex.test("999.999.999.999")).toBe(false);
  });

  // --- Note disclaimer ---
  it("includes disclaimer note", () => {
    const result = generateRegex({ description: "email" });
    expect(result).toContain("Note:");
    expect(result).toContain("Test with your actual data");
  });
});
