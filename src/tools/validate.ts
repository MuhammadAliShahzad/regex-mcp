const VALID_FLAGS: Record<string, string> = {
  g: "global — find all matches",
  i: "case-insensitive",
  m: "multiline — ^ and $ match line boundaries",
  s: "dotAll — . matches newlines",
  u: "unicode — full unicode support",
  y: "sticky — match from lastIndex only",
  d: "indices — include match indices",
  v: "unicodeSets — extended unicode character classes",
};

interface Pitfall {
  test: (pattern: string, flags: string) => boolean;
  message: string;
}

const PITFALLS: Pitfall[] = [
  {
    test: (p) => /(?<!\\)\.(?![*+?{])/.test(p) && !p.includes("["),
    message:
      "Unescaped '.' matches ANY character. Did you mean a literal dot? Use '\\.' instead.",
  },
  {
    test: (p) => p.includes(".*") && !p.includes(".*?"),
    message:
      "'.*' is greedy — it matches as much as possible. Consider '.*?' for non-greedy matching.",
  },
  {
    test: (p) => p.includes(".+") && !p.includes(".+?"),
    message:
      "'.+' is greedy — it matches as much as possible. Consider '.+?' for non-greedy matching.",
  },
  {
    test: (p) => /\[.*-.*\]/.test(p) && /\[.*[a-z]-[A-Z]/.test(p),
    message:
      "Character range crosses case boundary (e.g. [a-Z]). This may not work as expected. Use [a-zA-Z] instead.",
  },
  {
    test: (p, f) => (p.startsWith("^") || p.endsWith("$")) && f.includes("g"),
    message:
      "Using anchors (^/$) with global flag (g). If matching per-line, add the multiline flag (m).",
  },
  {
    test: (p) => /\(\?(?:=|!).*\).*[*+]/.test(p),
    message:
      "Quantifier after lookahead — lookaheads are zero-width and don't consume characters. The quantifier applies to what follows, not the lookahead.",
  },
  {
    test: (p) => {
      // Strip escaped parens before counting
      const stripped = p.replace(/\\./g, "");
      const groups = (stripped.match(/\(/g) || []).length;
      const closed = (stripped.match(/\)/g) || []).length;
      return groups !== closed;
    },
    message: "Unbalanced parentheses — number of '(' and ')' don't match.",
  },
  {
    test: (p) => /\\b.*\\b/.test(p) && p.includes(" "),
    message:
      "\\b is a word boundary (zero-width). It won't match spaces — it asserts between word and non-word characters.",
  },
  {
    test: (p) => /\[[^\]]*\\[1-9][^\]]*\]/.test(p),
    message:
      "Backreference inside character class — backreferences (\\1) don't work inside []. They're treated as literals.",
  },
  {
    test: (p) =>
      /\{(\d+),(\d+)\}/.test(p) &&
      (() => {
        const m = p.match(/\{(\d+),(\d+)\}/);
        return m ? parseInt(m[1]) > parseInt(m[2]) : false;
      })(),
    message:
      "Quantifier {min,max} has min > max. This will cause an error in most engines.",
  },
  // --- ReDoS / catastrophic backtracking ---
  {
    test: (p) => {
      // Nested quantifiers: (X+)+, (X*)+, (X+)*, (X*){2,}, etc.
      // Match a group containing +, *, or {n,} that is itself quantified
      return /\([^)]*[+*][^)]*\)[+*]/.test(p) || /\([^)]*[+*][^)]*\)\{\d+,\}?/.test(p);
    },
    message:
      "Potential ReDoS: nested quantifiers (e.g. (a+)+, (.*)+). This can cause catastrophic backtracking — exponential time on non-matching inputs.",
  },
  {
    test: (p) => {
      // Overlapping alternatives in quantified group: (a|ab)+, (.*|.+)+
      const m = p.match(/\(([^)]+\|[^)]+)\)[+*]/);
      if (!m) return false;
      const alts = m[1].split("|").map((a) => a.trim());
      return alts.some((a, i) =>
        alts.some((b, j) => i !== j && (a.startsWith(b) || b.startsWith(a)))
      );
    },
    message:
      "Overlapping alternatives in quantified group (e.g. (a|ab)+). One branch is a prefix of another, causing backtracking on failure.",
  },
  {
    test: (p, f) => {
      if (!f.includes("g")) return false;
      try {
        return new RegExp(p, f).test("");
      } catch {
        return false;
      }
    },
    message:
      "Pattern matches empty strings with global flag. This can cause infinite loops in some regex APIs (e.g. older String.prototype.replace).",
  },
  {
    test: (p) => {
      // Detect star-height > 1: quantified group containing another quantified group
      // e.g. ((a+b)+c)+ or ((\d+\.)+\d+)+
      let depth = 0;
      let quantAtDepth: Record<number, boolean> = {};
      for (let i = 0; i < p.length; i++) {
        if (p[i] === "\\") { i++; continue; }
        if (p[i] === "(") { depth++; continue; }
        if (p[i] === ")") {
          if (i + 1 < p.length && /[+*]/.test(p[i + 1])) {
            if (quantAtDepth[depth]) return true;
            quantAtDepth[depth - 1] = true;
          }
          delete quantAtDepth[depth];
          depth = Math.max(0, depth - 1);
          continue;
        }
        if (/[+*]/.test(p[i]) && p[i - 1] !== "\\") {
          quantAtDepth[depth] = true;
        }
      }
      return false;
    },
    message:
      "Deeply nested quantifiers detected (star height > 1). Patterns like ((a+)+) have exponential worst-case complexity.",
  },
  {
    test: (p) => {
      // Redundant characters in character class: [aa], [0-90-9]
      const classMatch = p.match(/\[(\^?)([^\]]+)\]/g);
      if (!classMatch) return false;
      return classMatch.some((cls) => {
        const inner = cls.slice(1, -1).replace(/^\^/, "");
        // Strip escape sequences and ranges to get standalone chars
        const stripped = inner.replace(/\\./g, "\0").replace(/.-.(?!$)/g, "\0");
        const chars = stripped.replace(/\0/g, "").split("");
        return chars.length > 0 && chars.length !== new Set(chars).size;
      });
    },
    message:
      "Redundant duplicate characters in character class (e.g. [aa-z]). This won't cause errors but suggests a mistake.",
  },
];

export interface ValidateInput {
  pattern: string;
  flags?: string;
}

export function validateRegex(args: ValidateInput): string {
  const flags = args.flags ?? "";

  // Check flags
  const badFlags = [...flags].filter((f) => !VALID_FLAGS[f]);
  if (badFlags.length > 0) {
    return `Invalid flag${badFlags.length > 1 ? "s" : ""}: ${badFlags.join(", ")}\n\nValid flags:\n${Object.entries(VALID_FLAGS).map(([k, v]) => `  ${k} — ${v}`).join("\n")}`;
  }

  // Check duplicate flags
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const f of flags) {
    if (seen.has(f)) dupes.push(f);
    seen.add(f);
  }
  if (dupes.length > 0) {
    return `Duplicate flag${dupes.length > 1 ? "s" : ""}: ${dupes.join(", ")}`;
  }

  // Check pattern syntax
  try {
    new RegExp(args.pattern, flags);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Invalid pattern: ${msg}`;
  }

  const lines = ["Valid regex pattern."];

  if (flags) {
    lines.push("");
    lines.push("Flags:");
    for (const f of flags) {
      if (VALID_FLAGS[f]) {
        lines.push(`  ${f} — ${VALID_FLAGS[f]}`);
      }
    }
  }

  // Check for common pitfalls
  const warnings = PITFALLS.filter((p) => {
    try {
      return p.test(args.pattern, flags);
    } catch {
      return false;
    }
  });

  if (warnings.length > 0) {
    lines.push("");
    lines.push(`Warnings (${warnings.length}):`);
    warnings.forEach((w, i) => {
      lines.push(`  ${i + 1}. ${w.message}`);
    });
  }

  return lines.join("\n");
}
