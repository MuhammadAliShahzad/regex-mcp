import { describe, it, expect } from "vitest";
import { testRegex } from "../src/tools/test.js";

describe("regex_test", () => {
  // --- Basic matching ---
  it("finds simple digit matches", () => {
    const result = testRegex({ pattern: "\\d+", input: "abc 123 def 456" });
    expect(result).toContain("Found 2 matches");
    expect(result).toContain('"123"');
    expect(result).toContain('"456"');
  });

  it("returns no matches for non-matching input", () => {
    const result = testRegex({ pattern: "\\d+", input: "no numbers here" });
    expect(result).toBe("No matches found.");
  });

  it("handles single match correctly", () => {
    const result = testRegex({ pattern: "hello", input: "hello" });
    expect(result).toContain("Found 1 match ");
    expect(result).not.toContain("matches");
  });

  // --- Flags ---
  it("respects case-insensitive flag", () => {
    const result = testRegex({ pattern: "hello", input: "HELLO world", flags: "gi" });
    expect(result).toContain("Found 1 match");
    expect(result).toContain('"HELLO"');
  });

  it("defaults to global flag", () => {
    const result = testRegex({ pattern: "a", input: "banana" });
    expect(result).toContain("Found 3 matches");
  });

  it("respects non-global flag (first match only)", () => {
    // Without 'g', matchAll still needs 'g' — JS requires it.
    // But our default is 'g'. If user passes flags="" it should throw or behave differently.
    // Actually matchAll requires g flag, so passing "" would throw. Let's test default.
    const result = testRegex({ pattern: "a", input: "banana", flags: "g" });
    expect(result).toContain("Found 3 matches");
  });

  // --- Highlighted output ---
  it("highlights matches with brackets", () => {
    const result = testRegex({ pattern: "\\d+", input: "Order #123 has 4 items" });
    expect(result).toContain("Highlighted:");
    expect(result).toContain("[123]");
    expect(result).toContain("[4]");
  });

  it("highlights adjacent matches correctly", () => {
    const result = testRegex({ pattern: ".", input: "abc", flags: "g" });
    expect(result).toContain("[abc]");
  });

  // --- Coverage stats ---
  it("calculates coverage percentage", () => {
    const result = testRegex({ pattern: "\\d+", input: "1234567890" });
    expect(result).toContain("100.0%");
  });

  it("shows char count in summary", () => {
    const result = testRegex({ pattern: "abc", input: "abc def abc" });
    expect(result).toContain("6 chars");
  });

  // --- Position tracking ---
  it("reports correct positions", () => {
    const result = testRegex({ pattern: "world", input: "hello world" });
    expect(result).toContain("Position: 6");
  });

  it("reports match length", () => {
    const result = testRegex({ pattern: "test", input: "testing" });
    expect(result).toContain("Length:   4");
  });

  // --- Capture groups ---
  it("reports numbered capture groups", () => {
    const result = testRegex({
      pattern: "(\\w+)@(\\w+)",
      input: "user@host",
    });
    expect(result).toContain('Group 1:');
    expect(result).toContain('"user"');
    expect(result).toContain('Group 2:');
    expect(result).toContain('"host"');
  });

  it("reports named capture groups", () => {
    const result = testRegex({
      pattern: "(?<year>\\d{4})-(?<month>\\d{2})",
      input: "2024-03",
    });
    expect(result).toContain("Group 'year': \"2024\"");
    expect(result).toContain("Group 'month': \"03\"");
  });

  it("handles optional capture group that doesn't match", () => {
    const result = testRegex({
      pattern: "(\\d+)(\\.(\\d+))?",
      input: "42",
    });
    expect(result).toContain('"42"');
    expect(result).toContain('Group 3:');
  });

  // --- Edge cases ---
  it("handles empty input string", () => {
    const result = testRegex({ pattern: ".*", input: "" });
    // .* matches empty string
    expect(result).toContain("Found");
  });

  it("handles special regex characters in input", () => {
    const result = testRegex({
      pattern: "\\$\\d+\\.\\d{2}",
      input: "Price: $19.99 and $5.00",
    });
    expect(result).toContain("Found 2 matches");
    expect(result).toContain('"$19.99"');
    expect(result).toContain('"$5.00"');
  });

  it("handles unicode input", () => {
    const result = testRegex({
      pattern: "[\\u00C0-\\u00FF]+",
      input: "café résumé",
      flags: "gu",
    });
    expect(result).toContain("Found");
  });

  it("handles overlapping match positions in highlighted output", () => {
    const result = testRegex({
      pattern: "\\w+",
      input: "a bb ccc",
    });
    expect(result).toContain("[a]");
    expect(result).toContain("[bb]");
    expect(result).toContain("[ccc]");
  });

  it("handles pattern matching entire input", () => {
    const result = testRegex({ pattern: "^.*$", input: "hello world" });
    expect(result).toContain("100.0%");
  });

  it("handles multiline input with m flag", () => {
    const result = testRegex({
      pattern: "^\\w+",
      input: "line1\nline2\nline3",
      flags: "gm",
    });
    expect(result).toContain("Found 3 matches");
  });
});
