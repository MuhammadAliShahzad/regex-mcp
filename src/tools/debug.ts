export interface DebugInput {
  pattern: string;
  input: string;
  flags?: string;
}

export function debugRegex(args: DebugInput): string {
  const flags = args.flags ?? "g";
  const regex = new RegExp(args.pattern, flags);

  const startTime = Date.now();
  const matches = [...args.input.matchAll(regex)];
  const elapsed = Date.now() - startTime;

  const lines: string[] = [
    `Pattern: /${args.pattern}/${flags}`,
    `Input:   "${args.input}" (${args.input.length} chars)`,
    "",
  ];

  if (elapsed > 200) {
    lines.push(
      `WARNING: Execution took ${elapsed}ms. Possible catastrophic backtracking (ReDoS). Run regex_validate to analyze.`
    );
    lines.push("");
  }

  if (matches.length === 0) {
    lines.push("Result: No matches.");
    lines.push("");

    // Collect all applicable hints
    const hints: string[] = [];

    try {
      // Hint: anchors preventing match
      const stripped = args.pattern.replace(/^\^/, "").replace(/\$$/, "");
      if (stripped !== args.pattern) {
        const looseRegex = new RegExp(stripped, flags);
        const looseMatches = [...args.input.matchAll(looseRegex)];
        if (looseMatches.length > 0) {
          hints.push(
            `Anchor issue: Without ^ and $, the inner pattern matches ${looseMatches.length} time(s). Check if anchors are intended.`
          );
        }
      }

      // Hint: case sensitivity
      if (!flags.includes("i")) {
        const ciRegex = new RegExp(args.pattern, flags + "i");
        const ciMatches = [...args.input.matchAll(ciRegex)];
        if (ciMatches.length > 0) {
          hints.push(
            `Case mismatch: With the 'i' flag, the pattern matches ${ciMatches.length} time(s). Consider adding the 'i' flag.`
          );
        }
      }

      // Hint: whitespace issues
      if (args.pattern.includes(" ") && !args.input.includes(" ")) {
        hints.push(
          "Whitespace: Pattern contains literal spaces but input has none."
        );
      }
      if (
        !args.pattern.includes("\\s") &&
        !args.pattern.includes(" ") &&
        /\s/.test(args.input) &&
        args.pattern.includes(".")
      ) {
        // Check if pattern would match without whitespace
        const noSpaceInput = args.input.replace(/\s/g, "");
        const nsMatches = [...noSpaceInput.matchAll(regex)];
        if (nsMatches.length > 0) {
          hints.push(
            "Whitespace: Pattern would match if spaces were removed from input. Consider using \\s to handle whitespace."
          );
        }
      }

      // Hint: escaped chars that shouldn't be
      if (
        args.pattern.includes("\\(") ||
        args.pattern.includes("\\)") ||
        args.pattern.includes("\\[")
      ) {
        const unescaped = args.pattern
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\[/g, "[");
        try {
          const ueMatches = [...args.input.matchAll(new RegExp(unescaped, flags))];
          if (ueMatches.length > 0) {
            hints.push(
              "Escaping: Pattern escapes ( ) or [ as literals. If you meant grouping/character class, remove the backslashes."
            );
          }
        } catch {
          // Invalid regex after unescaping — skip hint
        }
      }

      // Hint: multiline
      if (
        (args.pattern.startsWith("^") || args.pattern.endsWith("$")) &&
        args.input.includes("\n") &&
        !flags.includes("m")
      ) {
        hints.push(
          "Multiline: Input contains newlines and pattern uses ^ or $. Add 'm' flag to match per-line."
        );
      }

      // Hint: dotAll
      if (
        args.pattern.includes(".") &&
        args.input.includes("\n") &&
        !flags.includes("s")
      ) {
        const sMatches = [
          ...args.input.matchAll(new RegExp(args.pattern, flags + "s")),
        ];
        if (sMatches.length > 0) {
          hints.push(
            "Newlines: '.' doesn't match newlines by default. Add 's' flag (dotAll) to match across lines."
          );
        }
      }
    } catch {
      // Hints are best-effort
    }

    if (hints.length > 0) {
      lines.push("Hints:");
      hints.forEach((h, i) => {
        lines.push(`  ${i + 1}. ${h}`);
      });
    } else {
      lines.push("No specific hints available. Double-check the pattern logic.");
    }

    return lines.join("\n");
  }

  // --- Matches found ---
  lines.push(
    `Found ${matches.length} match${matches.length === 1 ? "" : "es"}:`
  );
  lines.push("");

  // Visual highlight
  const markers = new Array(args.input.length).fill(" ");
  for (const m of matches) {
    const start = m.index ?? 0;
    for (let k = start; k < start + m[0].length; k++) {
      markers[k] = "^";
    }
  }
  lines.push(`  "${args.input}"`);
  lines.push(`   ${markers.join("")}`);
  lines.push("");

  // Detail each match
  matches.forEach((m, idx) => {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    lines.push(`Match ${idx + 1} [${start}–${end}]: "${m[0]}"`);

    // Show context
    const ctxStart = Math.max(0, start - 15);
    const ctxEnd = Math.min(args.input.length, end + 15);
    const before = args.input.slice(ctxStart, start);
    const matched = args.input.slice(start, end);
    const after = args.input.slice(end, ctxEnd);
    lines.push(
      `  Context: ${ctxStart > 0 ? "..." : ""}${before}[${matched}]${after}${ctxEnd < args.input.length ? "..." : ""}`
    );

    // Groups
    const groups = m.slice(1);
    if (groups.length > 0) {
      groups.forEach((g, gi) => {
        lines.push(`  Group ${gi + 1}: "${g ?? ""}"`);
      });
    }
    if (m.groups) {
      for (const [name, val] of Object.entries(m.groups)) {
        lines.push(`  Named '${name}': "${val ?? ""}"`);
      }
    }

    lines.push("");
  });

  return lines.join("\n");
}
