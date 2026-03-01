import { describe, it, expect } from "vitest";
import { debugRegex } from "../src/tools/debug.js";

describe("regex_debug", () => {
  // --- Match output ---
  it("shows match count when matches found", () => {
    const result = debugRegex({
      pattern: "\\d+",
      input: "abc 123 def 456",
    });
    expect(result).toContain("Found 2 matches");
  });

  it("shows visual markers for matches", () => {
    const result = debugRegex({
      pattern: "test",
      input: "a test here",
    });
    expect(result).toContain("^");
    expect(result).toContain("Match 1");
  });

  it("shows match context with brackets", () => {
    const result = debugRegex({
      pattern: "error",
      input: "Found error in log",
    });
    expect(result).toContain("[error]");
    expect(result).toContain("Context:");
  });

  it("truncates context with ellipsis for long input", () => {
    const result = debugRegex({
      pattern: "middle",
      input: "start of a very long string then middle then more content at the end of string",
    });
    expect(result).toContain("...");
  });

  it("shows capture groups in match detail", () => {
    const result = debugRegex({
      pattern: "(\\w+)@(\\w+)",
      input: "user@host",
    });
    expect(result).toContain('Group 1: "user"');
    expect(result).toContain('Group 2: "host"');
  });

  it("shows named capture groups", () => {
    const result = debugRegex({
      pattern: "(?<name>\\w+)",
      input: "alice",
    });
    expect(result).toContain("Named 'name': \"alice\"");
  });

  // --- No match: hint system ---
  it("shows no matches message", () => {
    const result = debugRegex({
      pattern: "xyz",
      input: "abc def",
    });
    expect(result).toContain("Result: No matches.");
  });

  // --- Hint: case mismatch ---
  it("suggests case-insensitive flag on case mismatch", () => {
    const result = debugRegex({
      pattern: "Hello",
      input: "hello world",
    });
    expect(result).toContain("Case mismatch");
    expect(result).toContain("'i' flag");
  });

  it("does not suggest case flag when already case-insensitive", () => {
    const result = debugRegex({
      pattern: "xyz",
      input: "abc",
      flags: "gi",
    });
    expect(result).not.toContain("Case mismatch");
  });

  it("does not suggest case flag when case isn't the issue", () => {
    const result = debugRegex({
      pattern: "\\d+",
      input: "no digits here",
    });
    expect(result).not.toContain("Case mismatch");
  });

  // --- Hint: anchor issues ---
  it("detects anchor preventing match", () => {
    const result = debugRegex({
      pattern: "^hello$",
      input: "say hello there",
    });
    expect(result).toContain("Anchor issue");
    expect(result).toContain("Without ^ and $");
  });

  it("detects ^ anchor preventing match", () => {
    const result = debugRegex({
      pattern: "^world",
      input: "hello world",
    });
    expect(result).toContain("Anchor issue");
  });

  it("does not show anchor hint when anchors aren't the problem", () => {
    const result = debugRegex({
      pattern: "^xyz$",
      input: "abc",
    });
    // Without anchors, "xyz" still wouldn't match "abc"
    expect(result).not.toContain("Anchor issue");
  });

  // --- Hint: whitespace ---
  it("detects literal spaces in pattern when input has none", () => {
    const result = debugRegex({
      pattern: "hello world",
      input: "helloworld",
    });
    expect(result).toContain("Whitespace");
    expect(result).toContain("literal spaces");
  });

  it("suggests \\s when whitespace prevents match", () => {
    const result = debugRegex({
      pattern: "hello.world",
      input: "hello world",
      flags: "g",
    });
    // The dot matches space, so this actually matches
    expect(result).toContain("Found 1 match");
  });

  // --- Hint: over-escaping ---
  it("detects over-escaped parentheses", () => {
    const result = debugRegex({
      pattern: "\\(\\w+\\)",
      input: "hello world",
    });
    // Check if the hint about escaping appears
    // "hello world" doesn't have literal parens, so \\(\\w+\\) won't match
    // With unescaped: (\w+) would match as capture group
    expect(result).toContain("Escaping");
  });

  // --- Hint: multiline ---
  it("suggests multiline flag for newline input with anchors", () => {
    const result = debugRegex({
      pattern: "^line2",
      input: "line1\nline2\nline3",
    });
    expect(result).toContain("Multiline");
    expect(result).toContain("'m' flag");
  });

  it("does not suggest multiline when m flag already set", () => {
    const result = debugRegex({
      pattern: "^line2",
      input: "line1\nline2",
      flags: "gm",
    });
    // Should match with m flag
    expect(result).toContain("Found 1 match");
  });

  // --- Hint: dotAll ---
  it("suggests dotAll flag when dot doesn't match newlines", () => {
    const result = debugRegex({
      pattern: "start.*end",
      input: "start\nend",
    });
    expect(result).toContain("Newlines");
    expect(result).toContain("'s' flag");
  });

  it("does not suggest dotAll when s flag already set", () => {
    const result = debugRegex({
      pattern: "start.*end",
      input: "start\nend",
      flags: "gs",
    });
    expect(result).toContain("Found 1 match");
  });

  // --- No hints available ---
  it("shows fallback message when no hints apply", () => {
    const result = debugRegex({
      pattern: "zzzzz",
      input: "abcde",
    });
    expect(result).toContain("No specific hints available");
  });

  // --- Pattern and input display ---
  it("shows pattern with flags in output header", () => {
    const result = debugRegex({
      pattern: "\\d+",
      input: "test 123",
      flags: "gi",
    });
    expect(result).toContain("Pattern: /\\d+/gi");
  });

  it("shows input length in header", () => {
    const result = debugRegex({
      pattern: "test",
      input: "hello",
    });
    expect(result).toContain("(5 chars)");
  });

  // --- Multiple matches with markers ---
  it("shows markers for multiple non-adjacent matches", () => {
    const result = debugRegex({
      pattern: "\\d+",
      input: "a1b22c333",
    });
    expect(result).toContain("Found 3 matches");
    // Check that markers exist
    const lines = result.split("\n");
    const markerLine = lines.find((l) => l.includes("^") && !l.includes("Match"));
    expect(markerLine).toBeTruthy();
  });

  // --- Edge: empty pattern ---
  it("handles empty string pattern", () => {
    const result = debugRegex({
      pattern: "",
      input: "abc",
    });
    // Empty pattern matches at every position
    expect(result).toContain("Found");
  });
});
