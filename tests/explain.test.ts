import { describe, it, expect } from "vitest";
import { explainRegex } from "../src/tools/explain.js";
import { tokenize, formatExplanation } from "../src/utils/parser.js";

describe("regex_explain", () => {
  it("returns empty pattern message for empty string", () => {
    const result = explainRegex({ pattern: "" });
    expect(result).toContain("Empty pattern");
  });

  it("explains a simple literal pattern", () => {
    const result = explainRegex({ pattern: "hello" });
    expect(result).toContain("literal 'h'");
    expect(result).toContain("literal 'e'");
  });

  it("includes pattern header in output", () => {
    const result = explainRegex({ pattern: "abc" });
    expect(result).toContain("Pattern: abc");
    expect(result).toContain("Breakdown:");
  });
});

describe("tokenize", () => {
  // --- Escape sequences ---
  it("tokenizes \\d as digit", () => {
    const tokens = tokenize("\\d");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].description).toContain("digit");
  });

  it("tokenizes \\w as word character", () => {
    const tokens = tokenize("\\w");
    expect(tokens[0].description).toContain("word character");
  });

  it("tokenizes \\s as whitespace", () => {
    const tokens = tokenize("\\s");
    expect(tokens[0].description).toContain("whitespace");
  });

  it("tokenizes \\D, \\W, \\S as negated classes", () => {
    expect(tokenize("\\D")[0].description).toContain("non-digit");
    expect(tokenize("\\W")[0].description).toContain("non-word");
    expect(tokenize("\\S")[0].description).toContain("non-whitespace");
  });

  it("tokenizes \\b as word boundary", () => {
    const tokens = tokenize("\\b");
    expect(tokens[0].description).toContain("word boundary");
  });

  it("tokenizes \\n, \\r, \\t", () => {
    expect(tokenize("\\n")[0].description).toContain("newline");
    expect(tokenize("\\r")[0].description).toContain("carriage return");
    expect(tokenize("\\t")[0].description).toContain("tab");
  });

  it("tokenizes unicode escape \\u0041", () => {
    const tokens = tokenize("\\u0041");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].description).toContain("unicode");
    expect(tokens[0].description).toContain("0041");
  });

  it("tokenizes hex escape \\x41", () => {
    const tokens = tokenize("\\x41");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].description).toContain("hex");
  });

  it("tokenizes backreference \\1", () => {
    const tokens = tokenize("\\1");
    expect(tokens[0].description).toContain("backreference");
    expect(tokens[0].description).toContain("group 1");
  });

  it("tokenizes escaped literal \\.", () => {
    const tokens = tokenize("\\.");
    expect(tokens[0].description).toContain("literal '.'");
  });

  it("tokenizes escaped special chars \\( \\) \\[", () => {
    expect(tokenize("\\(")[0].description).toContain("literal '('");
    expect(tokenize("\\)")[0].description).toContain("literal ')'");
    expect(tokenize("\\[")[0].description).toContain("literal '['");
  });

  // --- Character classes ---
  it("tokenizes simple character class [abc]", () => {
    const tokens = tokenize("[abc]");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].description).toContain("any character in [abc]");
  });

  it("tokenizes negated character class [^abc]", () => {
    const tokens = tokenize("[^abc]");
    expect(tokens[0].description).toContain("NOT in [abc]");
  });

  it("tokenizes character class with range [a-z]", () => {
    const tokens = tokenize("[a-z]");
    expect(tokens[0].description).toContain("[a-z]");
  });

  it("handles escape inside character class [\\d\\w]", () => {
    const tokens = tokenize("[\\d\\w]");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].raw).toBe("[\\d\\w]");
  });

  it("handles unclosed character class gracefully", () => {
    // Should not crash
    const tokens = tokenize("[abc");
    expect(tokens.length).toBeGreaterThan(0);
  });

  // --- Groups ---
  it("tokenizes capturing group", () => {
    const tokens = tokenize("(abc)");
    expect(tokens[0].description).toBe("start capture group");
    expect(tokens[tokens.length - 1].description).toBe("end group");
  });

  it("tokenizes non-capturing group (?:...)", () => {
    const tokens = tokenize("(?:abc)");
    expect(tokens[0].description).toBe("start non-capturing group");
  });

  it("tokenizes positive lookahead (?=...)", () => {
    const tokens = tokenize("(?=abc)");
    expect(tokens[0].description).toBe("start positive lookahead");
  });

  it("tokenizes negative lookahead (?!...)", () => {
    const tokens = tokenize("(?!abc)");
    expect(tokens[0].description).toBe("start negative lookahead");
  });

  it("tokenizes positive lookbehind (?<=...)", () => {
    const tokens = tokenize("(?<=abc)");
    expect(tokens[0].description).toBe("start positive lookbehind");
  });

  it("tokenizes negative lookbehind (?<!...)", () => {
    const tokens = tokenize("(?<!abc)");
    expect(tokens[0].description).toBe("start negative lookbehind");
  });

  it("tokenizes named capture group (?<name>...)", () => {
    const tokens = tokenize("(?<year>\\d{4})");
    expect(tokens[0].description).toContain("named capture group");
    expect(tokens[0].description).toContain("'year'");
  });

  // --- Depth tracking ---
  it("increments depth inside groups", () => {
    const tokens = tokenize("(a(b)c)");
    // ( -> depth 0, a -> depth 1, ( -> depth 1, b -> depth 2, ) -> depth 1, c -> depth 1, ) -> depth 0
    const openOuter = tokens[0]; // (
    const inner = tokens[2]; // inner (
    const b = tokens[3]; // b
    expect(openOuter.depth).toBe(0);
    expect(inner.depth).toBe(1);
    expect(b.depth).toBe(2);
  });

  it("handles nested non-capturing groups depth", () => {
    const tokens = tokenize("(?:a(?:b))");
    const outerOpen = tokens.find((t) => t.raw === "(?:" && t.depth === 0);
    expect(outerOpen).toBeTruthy();
    const innerTokens = tokens.filter((t) => t.depth === 2);
    expect(innerTokens.length).toBeGreaterThan(0);
  });

  it("depth never goes negative", () => {
    // Extra closing paren
    const tokens = tokenize("a)b)");
    tokens.forEach((t) => expect(t.depth).toBeGreaterThanOrEqual(0));
  });

  // --- Quantifiers ---
  it("tokenizes * as zero or more", () => {
    const tokens = tokenize("a*");
    expect(tokens[1].description).toContain("zero or more");
  });

  it("tokenizes + as one or more", () => {
    const tokens = tokenize("a+");
    expect(tokens[1].description).toContain("one or more");
  });

  it("tokenizes ? as optional", () => {
    const tokens = tokenize("a?");
    expect(tokens[1].description).toContain("optional");
  });

  it("tokenizes lazy quantifier *?", () => {
    const tokens = tokenize("a*?");
    expect(tokens[2].description).toContain("lazy");
  });

  it("tokenizes lazy quantifier +?", () => {
    const tokens = tokenize("a+?");
    expect(tokens[2].description).toContain("lazy");
  });

  it("tokenizes lazy quantifier ??", () => {
    const tokens = tokenize("a??");
    expect(tokens[2].description).toContain("lazy");
  });

  it("tokenizes exact quantifier {3}", () => {
    const tokens = tokenize("a{3}");
    expect(tokens[1].description).toContain("exactly 3 times");
  });

  it("tokenizes range quantifier {2,5}", () => {
    const tokens = tokenize("a{2,5}");
    expect(tokens[1].description).toContain("between 2 and 5");
  });

  it("tokenizes open-ended quantifier {2,}", () => {
    const tokens = tokenize("a{2,}");
    expect(tokens[1].description).toContain("2 or more");
  });

  it("tokenizes lazy range quantifier {2,5}?", () => {
    const tokens = tokenize("a{2,5}?");
    const lazyToken = tokens.find((t) => t.description.includes("lazy"));
    expect(lazyToken).toBeTruthy();
  });

  // --- Anchors and special ---
  it("tokenizes ^ as start of string", () => {
    expect(tokenize("^")[0].description).toBe("start of string");
  });

  it("tokenizes $ as end of string", () => {
    expect(tokenize("$")[0].description).toBe("end of string");
  });

  it("tokenizes . as any character", () => {
    expect(tokenize(".")[0].description).toContain("any character");
  });

  it("tokenizes | as OR", () => {
    expect(tokenize("|")[0].description).toBe("OR");
  });

  // --- Complex patterns ---
  it("tokenizes email pattern correctly", () => {
    const tokens = tokenize("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    expect(tokens.length).toBeGreaterThan(5);
    // Should contain char classes, +, literal @, escaped dot, quantifier
    const atToken = tokens.find((t) => t.description === "literal '@'");
    expect(atToken).toBeTruthy();
  });

  it("tokenizes URL pattern without crashing", () => {
    const tokens = tokenize("https?://[\\w.-]+(?:\\.[a-zA-Z]{2,})");
    expect(tokens.length).toBeGreaterThan(10);
  });
});

describe("formatExplanation", () => {
  it("indents based on depth", () => {
    const tokens = tokenize("(a)");
    const output = formatExplanation(tokens);
    const lines = output.split("\n");
    // Inner 'a' should have more indentation than outer '(' and ')'
    const aLine = lines.find((l) => l.includes("literal 'a'"));
    const openLine = lines.find((l) => l.includes("start capture group"));
    expect(aLine).toBeTruthy();
    expect(openLine).toBeTruthy();
    // 'a' at depth 1 should have more leading spaces
    const aIndent = aLine!.match(/^(\s*)/)?.[1].length ?? 0;
    const openIndent = openLine!.match(/^(\s*)/)?.[1].length ?? 0;
    expect(aIndent).toBeGreaterThan(openIndent);
  });

  it("aligns descriptions with arrow separator", () => {
    const tokens = tokenize("ab");
    const output = formatExplanation(tokens);
    expect(output).toContain("→");
  });
});
