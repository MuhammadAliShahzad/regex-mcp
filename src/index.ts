#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { testRegex } from "./tools/test.js";
import { explainRegex } from "./tools/explain.js";
import { validateRegex } from "./tools/validate.js";
import { replaceRegex } from "./tools/replace.js";
import { debugRegex } from "./tools/debug.js";
import { generateRegex } from "./tools/generate.js";

const server = new McpServer({
  name: "regex-mcp",
  version: "1.0.0",
});

// --- Tools ---

server.tool(
  "regex_test",
  "Test a regex pattern against input text. Returns all matches with positions and capture groups.",
  {
    pattern: z.string().describe("Regular expression pattern"),
    input: z.string().describe("Text to test against"),
    flags: z
      .string()
      .optional()
      .describe("Regex flags: g (global), i (case-insensitive), m (multiline), s (dotAll), u (unicode). Default: g"),
  },
  async (args) => {
    try {
      const result = testRegex({
        pattern: args.pattern,
        input: args.input,
        flags: args.flags,
      });
      return { content: [{ type: "text", text: result }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "regex_explain",
  "Get a human-readable, token-by-token explanation of a regex pattern.",
  {
    pattern: z.string().describe("Regular expression pattern to explain"),
  },
  async (args) => {
    try {
      const result = explainRegex({ pattern: args.pattern });
      return { content: [{ type: "text", text: result }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "regex_validate",
  "Check if a regex pattern is syntactically valid and describe the flags used.",
  {
    pattern: z.string().describe("Regular expression pattern to validate"),
    flags: z.string().optional().describe("Regex flags to validate"),
  },
  async (args) => {
    try {
      const result = validateRegex({ pattern: args.pattern, flags: args.flags });
      return { content: [{ type: "text", text: result }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "regex_replace",
  "Find and replace text using a regex pattern. Supports capture group references ($1, $2, etc.) in the replacement string.",
  {
    pattern: z.string().describe("Regular expression pattern to match"),
    input: z.string().describe("Text to perform replacement on"),
    replacement: z.string().describe("Replacement string. Use $1, $2 for capture groups, $& for full match."),
    flags: z
      .string()
      .optional()
      .describe("Regex flags. Default: g (global)"),
  },
  async (args) => {
    try {
      const result = replaceRegex({
        pattern: args.pattern,
        input: args.input,
        replacement: args.replacement,
        flags: args.flags,
      });
      return { content: [{ type: "text", text: result }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "regex_debug",
  "Debug a regex pattern against input text. Shows match positions, visual markers, context, and hints when no match is found.",
  {
    pattern: z.string().describe("Regular expression pattern"),
    input: z.string().describe("Text to debug against"),
    flags: z
      .string()
      .optional()
      .describe("Regex flags. Default: g (global)"),
  },
  async (args) => {
    try {
      const result = debugRegex({
        pattern: args.pattern,
        input: args.input,
        flags: args.flags,
      });
      return { content: [{ type: "text", text: result }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "regex_generate",
  "Generate a regex pattern from a natural language description. Supports common patterns like email, URL, IP, phone, date, UUID, and more.",
  {
    description: z
      .string()
      .describe("Describe what you want to match, e.g. 'email address' or 'date in YYYY-MM-DD format'"),
  },
  async (args) => {
    try {
      const result = generateRegex({ description: args.description });
      return { content: [{ type: "text", text: result }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
