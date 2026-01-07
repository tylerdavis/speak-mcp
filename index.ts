#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as os from "node:os";
import * as path from "node:path";
import { PiperManager } from "./piper-manager.js";

/**
 * Speak MCP Server
 *
 * Provides a communication channel for agents to speak directly to users
 * through text-to-speech audio playback.
 */

// Configuration paths
const CONFIG_DIR = path.join(os.homedir(), ".config", "speak-mcp");
const BIN_DIR = path.join(CONFIG_DIR, "bin");
const VOICES_DIR = path.join(CONFIG_DIR, "voices");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const SPEAK_TOOL: Tool = {
  name: "speak",
  description:
    "Speak a message directly to the user using text-to-speech audio. Use this when you need to:\n" +
    "- Ask the user a question and wait for their response\n" +
    "- Provide a status update or progress report\n" +
    "- Communicate important information that requires user attention\n" +
    "- Request clarification or additional input\n\n" +
    "The message will be synthesized to audio and played through the system speakers. " +
    "Keep messages concise and conversational for natural speech output.",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The message to speak to the user. Should be clear, concise, and conversational.",
      },
      message_type: {
        type: "string",
        enum: ["question", "update", "info", "warning"],
        description: "The type of message (reserved for future use with speech tone/prosody).",
        default: "info",
      },
    },
    required: ["message"],
  },
};

class SpeakServer {
  private server: Server;
  private piperManager: PiperManager;

  constructor() {
    this.server = new Server(
      {
        name: "speak-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.piperManager = new PiperManager(CONFIG_DIR, BIN_DIR, VOICES_DIR, CONFIG_FILE);
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [SPEAK_TOOL],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "speak") {
        const { message, message_type = "info" } = request.params.arguments as {
          message: string;
          message_type?: string;
        };

        if (!message || typeof message !== "string") {
          throw new Error("Message is required and must be a string");
        }

        try {
          // Generate and play audio
          await this.piperManager.speakMessage(message);

          // Return success message (no emoji prefix - audio speaks the message)
          return {
            content: [
              {
                type: "text",
                text: "Audio played successfully",
              },
            ],
          };
        } catch (error) {
          // Return error message if TTS fails
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Failed to play audio: ${errorMessage}`,
              },
            ],
          };
        }
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  async run(): Promise<void> {
    // Initialize piper before connecting transport
    await this.piperManager.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Speak MCP Server running on stdio with TTS enabled");
  }
}

const server = new SpeakServer();
server.run().catch(console.error);
