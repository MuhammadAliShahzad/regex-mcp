import { describe, it, expect } from "vitest";
import { replaceRegex } from "../src/tools/replace.js";

describe("regex_replace", () => {
  // --- Basic replacement ---
  it("replaces simple match", () => {
    const result = replaceRegex({
      pattern: "world",
      input: "hello world",
      replacement: "there",
    });
    expect(result).toContain("Replacements: 1");
    expect(result).toContain("Before:");
    expect(result).toContain("hello world");
    expect(result).toContain("After:");
    expect(result).toContain("hello there");
  });

  it("replaces all matches with global flag", () => {
    const result = replaceRegex({
      pattern: "a",
      input: "banana",
      replacement: "o",
    });
    expect(result).toContain("Replacements: 3");
    expect(result).toContain("bonono");
  });

  // --- Capture group references ---
  it("supports $1 $2 capture group replacement", () => {
    const result = replaceRegex({
      pattern: "(\\w+), (\\w+)",
      input: "Doe, John",
      replacement: "$2 $1",
    });
    expect(result).toContain("John Doe");
  });

  it("supports named group replacement", () => {
    const result = replaceRegex({
      pattern: "(?<last>\\w+), (?<first>\\w+)",
      input: "Smith, Jane",
      replacement: "$<first> $<last>",
    });
    expect(result).toContain("Jane Smith");
  });

  // --- No matches ---
  it("shows 0 replacements when no match", () => {
    const result = replaceRegex({
      pattern: "xyz",
      input: "hello world",
      replacement: "abc",
    });
    expect(result).toContain("Replacements: 0");
    expect(result).toContain("hello world");
  });

  // --- Flags ---
  it("respects case-insensitive flag", () => {
    const result = replaceRegex({
      pattern: "hello",
      input: "HELLO world",
      replacement: "hi",
      flags: "gi",
    });
    expect(result).toContain("Replacements: 1");
    expect(result).toContain("hi world");
  });

  it("defaults to global flag", () => {
    const result = replaceRegex({
      pattern: "o",
      input: "foo boo",
      replacement: "0",
    });
    expect(result).toContain("Replacements: 4");
    expect(result).toContain("f00 b00");
  });

  // --- Special replacement characters ---
  it("handles $& (entire match) in replacement", () => {
    const result = replaceRegex({
      pattern: "\\d+",
      input: "item 42",
      replacement: "[$&]",
    });
    expect(result).toContain("[42]");
  });

  it("handles $` and $' (before/after match)", () => {
    const result = replaceRegex({
      pattern: "middle",
      input: "start middle end",
      replacement: "X",
    });
    expect(result).toContain("start X end");
  });

  // --- Edge cases ---
  it("handles empty replacement", () => {
    const result = replaceRegex({
      pattern: "\\s+",
      input: "hello world",
      replacement: "",
    });
    expect(result).toContain("helloworld");
  });

  it("handles replacement with special regex chars", () => {
    const result = replaceRegex({
      pattern: "test",
      input: "test input",
      replacement: "[replaced]",
    });
    expect(result).toContain("[replaced] input");
  });

  it("handles multiline replacement", () => {
    const result = replaceRegex({
      pattern: "^line",
      input: "line1\nline2\nline3",
      replacement: "row",
      flags: "gm",
    });
    expect(result).toContain("Replacements: 3");
    expect(result).toContain("row1");
    expect(result).toContain("row2");
    expect(result).toContain("row3");
  });

  it("shows before and after sections", () => {
    const result = replaceRegex({
      pattern: "old",
      input: "old text",
      replacement: "new",
    });
    const lines = result.split("\n");
    const beforeIdx = lines.findIndex((l) => l === "Before:");
    const afterIdx = lines.findIndex((l) => l === "After:");
    expect(beforeIdx).toBeGreaterThan(-1);
    expect(afterIdx).toBeGreaterThan(beforeIdx);
  });
});
