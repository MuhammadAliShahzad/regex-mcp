export interface TestInput {
  pattern: string;
  input: string;
  flags?: string;
}

function highlightMatches(input: string, matches: RegExpMatchArray[]): string {
  if (matches.length === 0) return input;

  // Build a set of matched positions
  const matched = new Set<number>();
  for (const m of matches) {
    const start = m.index ?? 0;
    for (let i = start; i < start + m[0].length; i++) {
      matched.add(i);
    }
  }

  // Build highlighted string with [brackets] around matched regions
  let result = "";
  let inMatch = false;
  for (let i = 0; i < input.length; i++) {
    const isMatched = matched.has(i);
    if (isMatched && !inMatch) {
      result += "[";
      inMatch = true;
    } else if (!isMatched && inMatch) {
      result += "]";
      inMatch = false;
    }
    result += input[i];
  }
  if (inMatch) result += "]";

  return result;
}

export function testRegex(args: TestInput): string {
  const flags = args.flags ?? "g";
  const regex = new RegExp(args.pattern, flags);

  const startTime = Date.now();
  const matches = [...args.input.matchAll(regex)];
  const elapsed = Date.now() - startTime;

  if (matches.length === 0) {
    const noMatchLines = ["No matches found."];
    if (elapsed > 200) {
      noMatchLines.push("");
      noMatchLines.push(
        `WARNING: Execution took ${elapsed}ms. This pattern may have catastrophic backtracking. Run regex_validate to check for ReDoS risks.`
      );
    }
    return noMatchLines.join("\n");
  }

  // Summary stats
  const totalMatchedChars = matches.reduce((sum, m) => sum + m[0].length, 0);
  const coverage = ((totalMatchedChars / args.input.length) * 100).toFixed(1);

  const lines: string[] = [
    `Found ${matches.length} match${matches.length === 1 ? "" : "es"} (${totalMatchedChars} chars, ${coverage}% of input)`,
    "",
    `Highlighted: ${highlightMatches(args.input, matches)}`,
    "",
  ];

  // Detail each match
  const results = matches.map((m, idx) => {
    const mLines = [
      `Match ${idx + 1}:`,
      `  Text:     "${m[0]}"`,
      `  Position: ${m.index}–${(m.index ?? 0) + m[0].length}`,
      `  Length:   ${m[0].length}`,
    ];

    // Named groups
    if (m.groups && Object.keys(m.groups).length > 0) {
      for (const [k, v] of Object.entries(m.groups)) {
        mLines.push(`  Group '${k}': "${v ?? ""}"`);
      }
    }

    // Numbered groups
    const numbered = m.slice(1);
    if (numbered.length > 0) {
      numbered.forEach((g, gi) => {
        mLines.push(`  Group ${gi + 1}:  "${g ?? ""}"`);
      });
    }

    return mLines.join("\n");
  });

  lines.push(results.join("\n\n"));

  if (elapsed > 200) {
    lines.push("");
    lines.push(
      `WARNING: Execution took ${elapsed}ms. This pattern may have catastrophic backtracking. Run regex_validate to check for ReDoS risks.`
    );
  }

  return lines.join("\n");
}
