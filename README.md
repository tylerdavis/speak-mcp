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

Sends a message directly to the user through a conversational interface.

**Parameters:**
- `message` (required): The message to communicate to the user
- `message_type` (optional): Type of message - `question`, `update`, `info`, or `warning`

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
