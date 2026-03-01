export interface Token {
  raw: string;
  description: string;
  depth: number;
}

const ESCAPE_MAP: Record<string, string> = {
  d: "any digit (0-9)",
  D: "any non-digit",
  w: "any word character (a-z, A-Z, 0-9, _)",
  W: "any non-word character",
  s: "any whitespace (space, tab, newline)",
  S: "any non-whitespace",
  b: "word boundary",
  B: "non-word boundary",
  n: "newline",
  r: "carriage return",
  t: "tab",
  f: "form feed",
  v: "vertical tab",
  "0": "null character",
};

export function tokenize(pattern: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let depth = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    // Escape sequences
    if (ch === "\\" && i + 1 < pattern.length) {
      const next = pattern[i + 1];

      if (ESCAPE_MAP[next]) {
        tokens.push({ raw: `\\${next}`, description: ESCAPE_MAP[next], depth });
        i += 2;
        continue;
      }

      // Unicode escape \uXXXX
      if (next === "u" && i + 5 < pattern.length) {
        const hex = pattern.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          tokens.push({
            raw: `\\u${hex}`,
            description: `unicode character U+${hex}`,
            depth,
          });
          i += 6;
          continue;
        }
      }

      // Hex escape \xXX
      if (next === "x" && i + 3 < pattern.length) {
        const hex = pattern.slice(i + 2, i + 4);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          tokens.push({
            raw: `\\x${hex}`,
            description: `hex character 0x${hex}`,
            depth,
          });
          i += 4;
          continue;
        }
      }

      // Backreference \1-\9
      if (/[1-9]/.test(next)) {
        tokens.push({
          raw: `\\${next}`,
          description: `backreference to group ${next}`,
          depth,
        });
        i += 2;
        continue;
      }

      // Escaped literal
      tokens.push({
        raw: `\\${next}`,
        description: `literal '${next}'`,
        depth,
      });
      i += 2;
      continue;
    }

    // Character class [...]
    if (ch === "[") {
      let cls = "[";
      let j = i + 1;
      let negated = false;

      if (j < pattern.length && pattern[j] === "^") {
        negated = true;
        cls += "^";
        j++;
      }

      while (j < pattern.length && pattern[j] !== "]") {
        if (pattern[j] === "\\" && j + 1 < pattern.length) {
          cls += pattern[j] + pattern[j + 1];
          j += 2;
        } else {
          cls += pattern[j];
          j++;
        }
      }

      if (j < pattern.length) {
        cls += "]";
        j++;
      }

      const inner = cls.slice(negated ? 2 : 1, -1);
      const desc = negated
        ? `any character NOT in [${inner}]`
        : `any character in [${inner}]`;

      tokens.push({ raw: cls, description: desc, depth });
      i = j;
      continue;
    }

    // Groups
    if (ch === "(") {
      if (pattern.slice(i, i + 3) === "(?:") {
        tokens.push({ raw: "(?:", description: "start non-capturing group", depth });
        depth++;
        i += 3;
        continue;
      }
      if (pattern.slice(i, i + 4) === "(?<=") {
        tokens.push({ raw: "(?<=", description: "start positive lookbehind", depth });
        depth++;
        i += 4;
        continue;
      }
      if (pattern.slice(i, i + 4) === "(?<!") {
        tokens.push({ raw: "(?<!", description: "start negative lookbehind", depth });
        depth++;
        i += 4;
        continue;
      }
      if (pattern.slice(i, i + 3) === "(?=") {
        tokens.push({ raw: "(?=", description: "start positive lookahead", depth });
        depth++;
        i += 3;
        continue;
      }
      if (pattern.slice(i, i + 3) === "(?!") {
        tokens.push({ raw: "(?!", description: "start negative lookahead", depth });
        depth++;
        i += 3;
        continue;
      }

      // Named group (?<name>...)
      const namedMatch = pattern.slice(i).match(/^\(\?<([^>]+)>/);
      if (namedMatch) {
        tokens.push({ raw: namedMatch[0], description: `start named capture group '${namedMatch[1]}'`, depth });
        depth++;
        i += namedMatch[0].length;
        continue;
      }

      tokens.push({ raw: "(", description: "start capture group", depth });
      depth++;
      i++;
      continue;
    }

    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      tokens.push({ raw: ")", description: "end group", depth });
      i++;
      continue;
    }

    // Quantifiers
    if (ch === "{") {
      const quantMatch = pattern.slice(i).match(/^\{(\d+)(?:,(\d*))?\}/);
      if (quantMatch) {
        const min = quantMatch[1];
        const max = quantMatch[2];
        let desc: string;

        if (max === undefined) {
          desc = `exactly ${min} times`;
        } else if (max === "") {
          desc = `${min} or more times`;
        } else {
          desc = `between ${min} and ${max} times`;
        }

        tokens.push({ raw: quantMatch[0], description: desc, depth });
        i += quantMatch[0].length;

        if (i < pattern.length && pattern[i] === "?") {
          tokens.push({ raw: "?", description: "(lazy/non-greedy)", depth });
          i++;
        }
        continue;
      }
    }

    if (ch === "*") {
      tokens.push({ raw: "*", description: "zero or more times", depth });
      i++;
      if (i < pattern.length && pattern[i] === "?") {
        tokens.push({ raw: "?", description: "(lazy/non-greedy)", depth });
        i++;
      }
      continue;
    }

    if (ch === "+") {
      tokens.push({ raw: "+", description: "one or more times", depth });
      i++;
      if (i < pattern.length && pattern[i] === "?") {
        tokens.push({ raw: "?", description: "(lazy/non-greedy)", depth });
        i++;
      }
      continue;
    }

    if (ch === "?") {
      tokens.push({ raw: "?", description: "optional (zero or one)", depth });
      i++;
      if (i < pattern.length && pattern[i] === "?") {
        tokens.push({ raw: "?", description: "(lazy/non-greedy)", depth });
        i++;
      }
      continue;
    }

    if (ch === "^") {
      tokens.push({ raw: "^", description: "start of string", depth });
      i++;
      continue;
    }

    if (ch === "$") {
      tokens.push({ raw: "$", description: "end of string", depth });
      i++;
      continue;
    }

    if (ch === ".") {
      tokens.push({ raw: ".", description: "any character (except newline)", depth });
      i++;
      continue;
    }

    if (ch === "|") {
      tokens.push({ raw: "|", description: "OR", depth });
      i++;
      continue;
    }

    tokens.push({ raw: ch, description: `literal '${ch}'`, depth });
    i++;
  }

  return tokens;
}

export function formatExplanation(tokens: Token[]): string {
  const lines = tokens.map((t) => {
    const indent = "  ".repeat(t.depth + 1);
    return `${indent}${t.raw.padEnd(Math.max(12 - t.depth * 2, 4))} → ${t.description}`;
  });
  return lines.join("\n");
}
