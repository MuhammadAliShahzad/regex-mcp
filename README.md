# regex-mcp

[![npm version](https://img.shields.io/npm/v/regex-mcp.svg)](https://www.npmjs.com/package/regex-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for testing, explaining, debugging, and generating regular expressions. Works with any MCP client — Claude Code, Cursor, VS Code Copilot, Windsurf, and more.

**Never leave your editor for regex again.**

## Features

- **Test** — Run patterns against text with highlighted matches, capture groups, and coverage stats
- **Explain** — Token-by-token breakdown with nested group indentation
- **Validate** — Syntax checking with common pitfall warnings (greedy traps, anchor issues, unescaped dots)
- **Replace** — Find and replace with capture group references ($1, $2)
- **Debug** — Visual match markers with smart hints when patterns fail (case, anchors, whitespace, multiline)
- **Generate** — Natural language to regex for 25+ common patterns (email, URL, UUID, date, phone, etc.)

## Install

### Claude Code

```bash
claude mcp add regex-mcp -- npx -y regex-mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "regex": {
      "command": "npx",
      "args": ["-y", "regex-mcp"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "regex": {
      "command": "npx",
      "args": ["-y", "regex-mcp"]
    }
  }
}
```

### VS Code Copilot

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "regex": {
      "command": "npx",
      "args": ["-y", "regex-mcp"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "regex": {
      "command": "npx",
      "args": ["-y", "regex-mcp"]
    }
  }
}
```

## Tools

### `regex_test`

Test a pattern against input text. Returns highlighted matches, positions, capture groups, and coverage stats.

```
Pattern: \d+
Input:   "Order #123 has 4 items at $99.50"

Found 4 matches (8 chars, 25.0% of input)

Highlighted: Order #[123] has [4] items at $[99].[50]

Match 1:
  Text:     "123"
  Position: 7–10
  Length:   3

Match 2:
  Text:     "4"
  Position: 15–16
  Length:   1
```

### `regex_explain`

Token-by-token breakdown with group indentation for nested patterns.

```
Pattern: (?:https?://)([\w.-]+)(?:/(\w+))?

Breakdown:
  (?:          → start non-capturing group
    h          → literal 'h'
    t          → literal 't'
    t          → literal 't'
    p          → literal 'p'
    s          → literal 's'
    ?          → optional (zero or one)
    :          → literal ':'
    /          → literal '/'
    /          → literal '/'
  )            → end group
  (            → start capture group
    [\w.-]     → any character in [\w.-]
    +          → one or more times
  )            → end group
  (?:          → start non-capturing group
    /          → literal '/'
    (          → start capture group
      \w       → any word character (a-z, A-Z, 0-9, _)
      +        → one or more times
    )          → end group
  )            → end group
  ?            → optional (zero or one)
```

### `regex_validate`

Check syntax and detect common pitfalls.

```
Pattern: ^.*foo.bar$
Flags:   g

Valid regex pattern.

Flags:
  g — global — find all matches

Warnings (3):
  1. Unescaped '.' matches ANY character. Did you mean '\.'?
  2. '.*' is greedy — it matches as much as possible. Consider '.*?'
  3. Using anchors (^/$) with global flag (g). Add 'm' for per-line matching.
```

### `regex_debug`

Visual debugging with smart hints when patterns don't match.

```
Pattern: /^Hello/g
Input:   "hello world" (11 chars)

Result: No matches.

Hints:
  1. Case mismatch: With the 'i' flag, the pattern matches 1 time(s).
```

When matches are found, shows visual markers:

```
Found 2 matches:

  "Error on line 42: timeout. Error on line 99: crash."
   ^^^^^^^^^^^^^^^                ^^^^^^^^^^^^^^^^^^^^^

Match 1 [0–15]: "Error on line 42"
  Context: [Error on line 42]: timeout. Err...

Match 2 [27–52]: "Error on line 99: crash."
  Context: ...timeout. [Error on line 99: crash.]
```

### `regex_replace`

Find and replace with capture group support.

```
Pattern:     (\w+), (\w+)
Input:       "Doe, John"
Replacement: $2 $1

Replacements: 1

Before:
Doe, John

After:
John Doe
```

### `regex_generate`

Generate regex from natural language descriptions. Supports 25+ common patterns.

```
Description: "email address"

Best match:
  Pattern: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
  Description: Matches most common email address formats
```

Available categories: email, URL, IPv4, phone, date (ISO/US), time, hex color, UUID, number, decimal, HTML tag, credit card, ZIP code, MAC address, slug, camelCase, snake_case, password validation, JSON key, Markdown link, file extension, semver, and more.

## Development

```bash
git clone https://github.com/MuhammadAliShahzad/regex-mcp.git
cd regex-mcp
npm install
npm run build
```

Test with the MCP Inspector:

```bash
npm run inspector
```

Run the server directly:

```bash
node build/index.js
```

## How it works

regex-mcp runs as a local stdio process — no network calls, no API keys, no LLM dependencies. All regex operations use the native JavaScript RegExp engine. Pattern explanation uses a built-in tokenizer, not AI.

## License

MIT
