# Speak MCP Server

A simple Model Context Protocol (MCP) server that provides a clean communication channel between AI agents and users.

## Purpose

When running automated tasks or agent workflows, it's often necessary to:
- Ask the user questions and wait for responses
- Provide status updates on long-running operations
- Communicate important information that needs user attention
- Request clarification or additional input

The `speak` tool provides a conversational interface for these interactions, separate from technical logs and terminal output.

## Installation

```bash
cd speak-mcp
npm install
npm run build
```

## Configuration

Add to your Claude Code or MCP client configuration:

**Note:** On first run, the server will automatically download and use the `hfc_female` (medium quality) voice as the default. You can change this at any time using the `change_voice` tool.

### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS)

```json
{
  "mcpServers": {
    "speak": {
      "command": "node",
      "args": ["/absolute/path/to/speak-mcp/dist/index.js"]
    }
  }
}
```

### Claude Code

```json
{
  "mcpServers": {
    "speak": {
      "command": "node",
      "args": ["/absolute/path/to/speak-mcp/dist/index.js"]
    }
  }
}
```

## Usage

### Tool: `speak`

Sends a message directly to the user through a conversational interface using text-to-speech.

**Parameters:**
- `message` (required): The message to communicate to the user
- `message_type` (optional): Type of message - `question`, `update`, `info`, or `warning`

**Behavior:**
- **Non-blocking**: The tool returns immediately after generating the audio file (~500ms)
- Audio plays in the background while your agent continues working
- Perfect for real-time updates during long-running tasks

**Examples:**

```typescript
// Ask a question
await mcp.speak({
  message: "Should I proceed with deploying to production?",
  message_type: "question"
});

// Provide a status update
await mcp.speak({
  message: "Database migration completed successfully. Starting service restart.",
  message_type: "update"
});

// Share information
await mcp.speak({
  message: "Found 3 configuration issues that need attention.",
  message_type: "info"
});

// Warn about something
await mcp.speak({
  message: "This operation will delete all existing data. Are you sure?",
  message_type: "warning"
});
```

### Tool: `list_voices`

Lists all available English (US) voices for text-to-speech, showing which are downloaded and which is currently selected.

**Parameters:** None

**Example:**

```typescript
await mcp.list_voices();
```

**Returns:**
```
Available voices (16 total):

Currently selected: ryan-high (high quality, 116.2MB) *

Available to download:
1. amy-high (high quality, 116.2MB)
2. danny-high (high quality, 116.2MB)
...

Already downloaded:
• ryan-high (high quality, 116.2MB) *
• amy-medium (medium quality, 63.0MB)
```

### Tool: `change_voice`

Changes the active text-to-speech voice. If the voice isn't already downloaded, it will be downloaded automatically.

**Parameters:**
- `voice` (required): Voice identifier - supports multiple formats:
  - Full key: `"en_US-amy-high"`
  - Short name: `"amy-high"`
  - Partial match: `"amy"` (picks highest quality)
  - Numeric index: `"1"` (from list_voices output)

**Examples:**

```typescript
// Change to a specific voice by name
await mcp.change_voice({ voice: "amy-high" });

// Change using partial match (picks highest quality)
await mcp.change_voice({ voice: "amy" });

// Change using numeric index from list_voices
await mcp.change_voice({ voice: "1" });
```

**Note:** First-time voice downloads take 30-120 seconds depending on voice size. Progress is displayed during download.

## Design Philosophy

- **Concise**: Messages should be brief and to the point
- **Conversational**: Write as you would speak to someone
- **User-focused**: Avoid technical jargon unless necessary
- **Context-aware**: Provide enough information to be actionable

## Development

```bash
# Watch mode for development
npm run watch

# Build for production
npm run build
```

## License

MIT
