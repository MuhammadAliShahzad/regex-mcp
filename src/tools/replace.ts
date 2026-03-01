export interface ReplaceInput {
  pattern: string;
  input: string;
  replacement: string;
  flags?: string;
}

export function replaceRegex(args: ReplaceInput): string {
  const flags = args.flags ?? "g";
  const regex = new RegExp(args.pattern, flags);

  // Count matches before replacing
  const matches = [...args.input.matchAll(new RegExp(args.pattern, flags))];
  const result = args.input.replace(regex, args.replacement);

  const lines = [
    `Replacements: ${matches.length}`,
    "",
    "Before:",
    args.input,
    "",
    "After:",
    result,
  ];

  return lines.join("\n");
}
