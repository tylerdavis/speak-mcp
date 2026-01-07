# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides a `speak` tool for agent-to-user communication. The server enables AI agents to send conversational messages to users through a clean interface, separate from technical logs.

**Default Voice:** On first initialization, the server automatically downloads and uses `hfc_female` (medium quality) as the default voice.

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

**Core components**:
- `SpeakServer` class (index.ts): Manages the MCP server lifecycle
- `PiperManager` class (piper-manager.ts): Manages voice selection, downloads, and TTS operations
- Tool definitions: `SPEAK_TOOL`, `LIST_VOICES_TOOL`, `CHANGE_VOICE_TOOL`
- Transport: Uses stdio transport for MCP communication

## Available Tools

### 1. speak
Converts text to speech and plays it to the user.

**Parameters:**
- `message` (required, string): The message to speak
- `message_type` (optional, enum): "question", "update", "info", or "warning"

**Returns:** Success or error message

**Performance:**
- Non-blocking: Returns in ~500ms after generating audio
- Audio plays in background while agent continues working
- Multiple speak calls can be made without waiting for previous audio to finish

### 2. list_voices
Lists all available English (US) voices for text-to-speech.

**Parameters:** None

**Returns:** Formatted list showing:
- Currently selected voice (marked with *)
- Available voices to download (numbered list)
- Already downloaded voices (bulleted list)
- Voice quality and file size for each

### 3. change_voice
Changes the active text-to-speech voice.

**Parameters:**
- `voice` (required, string): Voice identifier in one of these formats:
  - Full key: "en_US-amy-high"
  - Short name: "amy-high"
  - Partial match: "amy" (picks highest quality)
  - Numeric index: "1" (from list_voices output)

**Returns:** Success message with voice details, or error

**Behavior:**
- If voice is already downloaded: Switches immediately
- If voice needs download: Downloads automatically (30-120 seconds) with progress logged to stderr
- Updates config and makes voice active immediately

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
