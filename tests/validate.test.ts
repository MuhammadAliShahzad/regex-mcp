import { describe, it, expect } from "vitest";
import { validateRegex } from "../src/tools/validate.js";

describe("regex_validate", () => {
  // --- Valid patterns ---
  it("accepts a simple valid pattern", () => {
    const result = validateRegex({ pattern: "\\d+" });
    expect(result).toContain("Valid regex pattern.");
  });

  it("accepts complex valid pattern", () => {
    const result = validateRegex({
      pattern: "^(?:[a-zA-Z0-9._%+-]+)@(?:[a-zA-Z0-9.-]+)\\.[a-zA-Z]{2,}$",
    });
    expect(result).toContain("Valid regex pattern.");
  });

  // --- Invalid patterns ---
  it("rejects unclosed bracket", () => {
    const result = validateRegex({ pattern: "[abc" });
    expect(result).toContain("Invalid pattern");
  });

  it("rejects unclosed group", () => {
    const result = validateRegex({ pattern: "(abc" });
    expect(result).toContain("Invalid pattern");
  });

  it("rejects invalid quantifier", () => {
    const result = validateRegex({ pattern: "+" });
    expect(result).toContain("Invalid pattern");
  });

  it("rejects lone backslash at end", () => {
    const result = validateRegex({ pattern: "abc\\" });
    expect(result).toContain("Invalid pattern");
  });

  // --- Flag validation ---
  it("accepts valid flags", () => {
    const result = validateRegex({ pattern: "test", flags: "gi" });
    expect(result).toContain("Valid regex pattern.");
    expect(result).toContain("g — global");
    expect(result).toContain("i — case-insensitive");
  });

  it("rejects invalid flag", () => {
    const result = validateRegex({ pattern: "test", flags: "x" });
    expect(result).toContain("Invalid flag");
    expect(result).toContain("x");
  });

  it("rejects multiple invalid flags", () => {
    const result = validateRegex({ pattern: "test", flags: "xz" });
    expect(result).toContain("Invalid flags");
    expect(result).toContain("x");
    expect(result).toContain("z");
  });

  it("rejects duplicate flags", () => {
    const result = validateRegex({ pattern: "test", flags: "gg" });
    expect(result).toContain("Duplicate flag");
  });

  it("shows all valid flags when invalid flag given", () => {
    const result = validateRegex({ pattern: "test", flags: "x" });
    expect(result).toContain("Valid flags:");
    expect(result).toContain("g —");
    expect(result).toContain("i —");
  });

  it("shows no flag section when no flags provided", () => {
    const result = validateRegex({ pattern: "test" });
    expect(result).not.toContain("Flags:");
  });

  // --- Pitfall: unescaped dot ---
  it("warns about unescaped dot", () => {
    const result = validateRegex({ pattern: "foo.bar" });
    expect(result).toContain("Unescaped '.'");
  });

  it("does not warn about escaped dot", () => {
    const result = validateRegex({ pattern: "foo\\.bar" });
    expect(result).not.toContain("Unescaped '.'");
  });

  it("does not warn about dot inside character class", () => {
    const result = validateRegex({ pattern: "[.]" });
    expect(result).not.toContain("Unescaped '.'");
  });

  it("does not warn about dot followed by quantifier", () => {
    const result = validateRegex({ pattern: ".*" });
    // .* has its own greedy warning, not the unescaped dot one
    expect(result).not.toContain("Unescaped '.' matches ANY");
  });

  // --- Pitfall: greedy quantifiers ---
  it("warns about greedy .*", () => {
    const result = validateRegex({ pattern: "a.*b" });
    expect(result).toContain("'.*' is greedy");
  });

  it("does not warn about non-greedy .*?", () => {
    const result = validateRegex({ pattern: "a.*?b" });
    expect(result).not.toContain("'.*' is greedy");
  });

  it("warns about greedy .+", () => {
    const result = validateRegex({ pattern: "a.+b" });
    expect(result).toContain("'.+' is greedy");
  });

  it("does not warn about non-greedy .+?", () => {
    const result = validateRegex({ pattern: "a.+?b" });
    expect(result).not.toContain("'.+' is greedy");
  });

  // --- Pitfall: case boundary in character ranges ---
  it("warns about cross-case range [a-Z]", () => {
    // Note: [a-Z] is actually invalid in most engines, but our test checks the heuristic
    const result = validateRegex({ pattern: "[a-Z]" });
    // This might be invalid or trigger the warning depending on engine
    expect(result).toMatch(/Invalid pattern|Character range crosses case/);
  });

  // --- Pitfall: anchors with global flag ---
  it("warns about ^ with global flag", () => {
    const result = validateRegex({ pattern: "^test", flags: "g" });
    expect(result).toContain("Using anchors");
    expect(result).toContain("multiline");
  });

  it("warns about $ with global flag", () => {
    const result = validateRegex({ pattern: "test$", flags: "g" });
    expect(result).toContain("Using anchors");
  });

  it("does not warn about anchors without global flag", () => {
    const result = validateRegex({ pattern: "^test$" });
    expect(result).not.toContain("Using anchors");
  });

  // --- Pitfall: quantifier after lookahead ---
  it("warns about quantifier after lookahead", () => {
    const result = validateRegex({ pattern: "(?=foo)+" });
    expect(result).toContain("Quantifier after lookahead");
  });

  it("warns about quantifier after negative lookahead", () => {
    const result = validateRegex({ pattern: "(?!bar)*" });
    expect(result).toContain("Quantifier after lookahead");
  });

  // --- Pitfall: unbalanced parentheses ---
  it("does not warn about escaped parens", () => {
    const result = validateRegex({ pattern: "\\(test\\)" });
    expect(result).not.toContain("Unbalanced parentheses");
  });

  it("warns about actually unbalanced parens", () => {
    // (test — missing closing paren. This is also an invalid regex.
    const result = validateRegex({ pattern: "(test" });
    expect(result).toMatch(/Invalid pattern|Unbalanced parentheses/);
  });

  // --- Pitfall: \\b with spaces ---
  it("warns about \\b with literal spaces", () => {
    const result = validateRegex({ pattern: "\\bfoo bar\\b" });
    expect(result).toContain("\\b is a word boundary");
  });

  it("does not warn about \\b without spaces", () => {
    const result = validateRegex({ pattern: "\\bfoo\\b" });
    expect(result).not.toContain("\\b is a word boundary");
  });

  // --- Pitfall: min > max quantifier ---
  it("warns about {5,2} quantifier", () => {
    // Note: {5,2} is actually a syntax error in JS, so it'll be caught as invalid
    const result = validateRegex({ pattern: "a{5,2}" });
    expect(result).toMatch(/Invalid pattern|min > max/);
  });

  // === NEW: ReDoS / catastrophic backtracking ===

  it("detects nested quantifiers (a+)+", () => {
    const result = validateRegex({ pattern: "(a+)+" });
    expect(result).toContain("ReDoS");
    expect(result).toContain("nested quantifiers");
  });

  it("detects nested quantifiers (.*)+", () => {
    const result = validateRegex({ pattern: "(.*)+", flags: "g" });
    expect(result).toContain("ReDoS");
  });

  it("detects nested quantifiers (\\w+)*", () => {
    const result = validateRegex({ pattern: "(\\w+)*" });
    expect(result).toContain("catastrophic backtracking");
  });

  it("does not flag simple quantified group without inner quantifier", () => {
    const result = validateRegex({ pattern: "(abc)+" });
    expect(result).not.toContain("ReDoS");
    expect(result).not.toContain("nested quantifiers");
  });

  it("detects (a+)+$ — classic ReDoS pattern", () => {
    const result = validateRegex({ pattern: "(a+)+$", flags: "g" });
    expect(result).toContain("ReDoS");
  });

  // --- Overlapping alternatives ---
  it("detects overlapping alternatives (a|ab)+", () => {
    const result = validateRegex({ pattern: "(a|ab)+" });
    expect(result).toContain("Overlapping alternatives");
  });

  it("does not flag non-overlapping alternatives (a|b)+", () => {
    const result = validateRegex({ pattern: "(a|b)+" });
    expect(result).not.toContain("Overlapping alternatives");
  });

  it("detects overlapping (foo|foobar)*", () => {
    const result = validateRegex({ pattern: "(foo|foobar)*" });
    expect(result).toContain("Overlapping alternatives");
  });

  // --- Empty match + global flag ---
  it("warns about empty match pattern with global flag", () => {
    const result = validateRegex({ pattern: "a*", flags: "g" });
    expect(result).toContain("empty strings");
    expect(result).toContain("global flag");
  });

  it("warns about \\s* with global flag", () => {
    const result = validateRegex({ pattern: "\\s*", flags: "g" });
    expect(result).toContain("empty strings");
  });

  it("does not warn about empty match without global flag", () => {
    const result = validateRegex({ pattern: "a*" });
    expect(result).not.toContain("empty strings");
  });

  it("does not warn about non-empty match pattern with global", () => {
    const result = validateRegex({ pattern: "a+", flags: "g" });
    expect(result).not.toContain("empty strings");
  });

  // --- Star height > 1 (deeply nested quantifiers) ---
  it("detects star height > 1: ((a+)+)", () => {
    const result = validateRegex({ pattern: "((a+)+)" });
    expect(result).toContain("star height");
  });

  it("detects deeply nested ((\\d+\\.)+\\d+)+", () => {
    const result = validateRegex({ pattern: "((\\d+\\.)+\\d+)+" });
    expect(result).toContain("star height");
  });

  it("does not flag simple (a+) without outer quantifier", () => {
    const result = validateRegex({ pattern: "(a+)" });
    expect(result).not.toContain("star height");
  });

  // --- Redundant character class ---
  it("detects redundant chars in [aab-z]", () => {
    const result = validateRegex({ pattern: "[aab-z]" });
    expect(result).toContain("Redundant duplicate");
  });

  it("does not flag [a-z] (no duplicates)", () => {
    const result = validateRegex({ pattern: "[a-z]" });
    expect(result).not.toContain("Redundant duplicate");
  });

  // --- Multiple warnings at once ---
  it("reports multiple warnings for complex bad pattern", () => {
    const result = validateRegex({ pattern: "^(.*)+$", flags: "g" });
    expect(result).toContain("Warnings");
    // Should catch: greedy .*, anchors+global, nested quantifiers, and possibly ReDoS
    const warningCount = result.match(/Warnings \((\d+)\)/);
    expect(warningCount).toBeTruthy();
    expect(parseInt(warningCount![1])).toBeGreaterThanOrEqual(3);
  });

  // --- No warnings for clean patterns ---
  it("reports no warnings for well-written email regex", () => {
    const result = validateRegex({
      pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    });
    expect(result).not.toContain("Warnings");
  });
});
