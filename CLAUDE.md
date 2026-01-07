# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides a `speak` tool for agent-to-user communication. The server enables AI agents to send conversational messages to users through a clean interface, separate from technical logs.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Build the project (compiles TypeScript to dist/)
npm run build

# Development mode with auto-rebuild
npm run watch

# Build automatically runs on npm install (via prepare script)
npm run prepare
```

## Architecture

**Single-file implementation**: The entire server is implemented in `index.ts` (no src/ directory despite tsconfig configuration).

**Core components**:
- `SpeakServer` class: Manages the MCP server lifecycle
- `SPEAK_TOOL`: Tool definition with schema for the `speak` tool
- Transport: Uses stdio transport for MCP communication

**Tool schema**:
- Required parameter: `message` (string)
- Optional parameter: `message_type` (enum: "question", "update", "info", "warning")
- Returns formatted message with emoji prefix based on type

**TypeScript configuration**:
- Compiles from root directory (note: tsconfig specifies `"rootDir": "./src"` but source is in root)
- Outputs to `dist/`
- Module system: ES2022 with Node16 module resolution
- Entry point: `dist/index.js`

## Message Design Principles

When modifying or extending the speak tool, messages should be:
- **Concise**: Brief and to the point
- **Conversational**: Written as you would speak
- **User-focused**: Minimal technical jargon
- **Context-aware**: Include enough information to be actionable

Message types and their use cases:
- `question`: Request user input or confirmation
- `update`: Progress reports on long-running operations
- `info`: General information that needs attention
- `warning`: Critical information or destructive operation alerts
