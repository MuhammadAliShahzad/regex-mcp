import { tokenize, formatExplanation } from "../utils/parser.js";

export interface ExplainInput {
  pattern: string;
}

export function explainRegex(args: ExplainInput): string {
  const tokens = tokenize(args.pattern);

  if (tokens.length === 0) {
    return "Empty pattern — matches empty string at every position.";
  }

  return `Pattern: ${args.pattern}\n\nBreakdown:\n${formatExplanation(tokens)}`;
}
