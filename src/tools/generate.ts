export interface GenerateInput {
  description: string;
}

interface PatternTemplate {
  keywords: string[];
  pattern: string;
  description: string;
  flags?: string;
}

const TEMPLATES: PatternTemplate[] = [
  {
    keywords: ["email", "e-mail", "mail address"],
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    description: "Matches most common email address formats",
  },
  {
    keywords: ["url", "http", "https", "web address", "link"],
    pattern: "https?://[\\w.-]+(?:\\.[a-zA-Z]{2,})(?:[/\\w.-]*)*(?:\\?[\\w=&.-]*)?(?:#[\\w.-]*)?",
    description: "Matches HTTP and HTTPS URLs",
  },
  {
    keywords: ["ipv4", "ip address", "ip v4"],
    pattern: "(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)(?:\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)){3}",
    description: "Matches valid IPv4 addresses (0.0.0.0 to 255.255.255.255)",
  },
  {
    keywords: ["phone", "telephone", "phone number"],
    pattern: "\\+?\\d{1,3}[-.\\s]?\\(?\\d{1,4}\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}",
    description: "Matches international phone numbers in various formats",
  },
  {
    keywords: ["date", "yyyy-mm-dd", "iso date"],
    pattern: "\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])",
    description: "Matches dates in YYYY-MM-DD format",
  },
  {
    keywords: ["date", "mm/dd/yyyy", "us date", "american date"],
    pattern: "(?:0[1-9]|1[0-2])/(?:0[1-9]|[12]\\d|3[01])/\\d{4}",
    description: "Matches dates in MM/DD/YYYY format",
  },
  {
    keywords: ["time", "hh:mm", "24 hour", "24h"],
    pattern: "(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?",
    description: "Matches 24-hour time (HH:MM or HH:MM:SS)",
  },
  {
    keywords: ["hex", "hex color", "colour", "css color"],
    pattern: "#(?:[0-9a-fA-F]{3}){1,2}\\b",
    description: "Matches CSS hex color codes (#RGB or #RRGGBB)",
  },
  {
    keywords: ["uuid", "guid"],
    pattern: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
    description: "Matches UUIDs (v1–v5 format)",
  },
  {
    keywords: ["number", "integer", "whole number", "digits only"],
    pattern: "-?\\d+",
    description: "Matches integers (positive or negative)",
  },
  {
    keywords: ["decimal", "float", "floating point", "real number"],
    pattern: "-?\\d+\\.\\d+",
    description: "Matches decimal/floating-point numbers",
  },
  {
    keywords: ["word", "words only", "alphabetic", "letters only"],
    pattern: "[a-zA-Z]+",
    description: "Matches one or more alphabetic characters",
  },
  {
    keywords: ["whitespace", "spaces", "blank"],
    pattern: "\\s+",
    description: "Matches one or more whitespace characters",
  },
  {
    keywords: ["html tag", "xml tag", "html element", "tag"],
    pattern: "<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*>.*?</\\1>",
    description: "Matches paired HTML/XML tags with content",
    flags: "gs",
  },
  {
    keywords: ["credit card", "card number", "cc number"],
    pattern: "\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}",
    description: "Matches 16-digit credit card numbers (with optional separators)",
  },
  {
    keywords: ["zip code", "postal code", "us zip"],
    pattern: "\\d{5}(?:-\\d{4})?",
    description: "Matches US ZIP codes (5-digit or ZIP+4)",
  },
  {
    keywords: ["mac address", "hardware address"],
    pattern: "(?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}",
    description: "Matches MAC addresses (colon or hyphen separated)",
  },
  {
    keywords: ["slug", "url slug", "kebab case"],
    pattern: "[a-z0-9]+(?:-[a-z0-9]+)*",
    description: "Matches URL slugs (lowercase alphanumeric with hyphens)",
  },
  {
    keywords: ["camel case", "camelcase"],
    pattern: "[a-z]+(?:[A-Z][a-z]+)*",
    description: "Matches camelCase identifiers",
  },
  {
    keywords: ["snake case", "snake_case"],
    pattern: "[a-z]+(?:_[a-z]+)*",
    description: "Matches snake_case identifiers",
  },
  {
    keywords: ["password", "strong password"],
    pattern: "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}",
    description: "Validates strong passwords (8+ chars, upper, lower, digit, special)",
  },
  {
    keywords: ["json key", "json property", "json field"],
    pattern: '"([^"]+)"\\s*:',
    description: "Matches JSON keys (quoted strings followed by colon)",
  },
  {
    keywords: ["markdown link", "md link"],
    pattern: "\\[([^\\]]+)\\]\\(([^)]+)\\)",
    description: "Matches Markdown links [text](url)",
  },
  {
    keywords: ["file extension", "file type"],
    pattern: "\\.[a-zA-Z0-9]+$",
    description: "Matches file extensions at end of string",
  },
  {
    keywords: ["semver", "semantic version", "version number"],
    pattern: "\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9.]+)?(?:\\+[a-zA-Z0-9.]+)?",
    description: "Matches semantic version numbers (e.g. 1.2.3-beta+build)",
  },
];

export function generateRegex(args: GenerateInput): string {
  const query = args.description.toLowerCase();

  // Score each template by keyword matches
  const scored = TEMPLATES.map((t) => {
    const score = t.keywords.reduce((acc, kw) => {
      return acc + (query.includes(kw) ? 1 : 0);
    }, 0);
    return { ...t, score };
  })
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return [
      "No matching pattern template found for that description.",
      "",
      "Available categories:",
      ...TEMPLATES.map((t) => `  - ${t.keywords[0]}: ${t.description}`),
      "",
      "Try describing what you want to match using one of these keywords.",
    ].join("\n");
  }

  // Return top matches
  const top = scored.slice(0, 3);
  const lines: string[] = [];

  top.forEach((t, idx) => {
    if (idx > 0) lines.push("---");
    lines.push(`${idx === 0 ? "Best match" : `Alternative ${idx}`}:`);
    lines.push(`  Pattern: ${t.pattern}`);
    lines.push(`  Description: ${t.description}`);
    if (t.flags) {
      lines.push(`  Suggested flags: ${t.flags}`);
    }
    lines.push("");
  });

  lines.push("Note: These are common patterns. Test with your actual data to verify.");

  return lines.join("\n");
}
