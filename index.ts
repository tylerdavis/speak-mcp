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

const LIST_VOICES_TOOL: Tool = {
  name: "list_voices",
  description:
    "List all available English (US) voices for text-to-speech. Shows voice names, quality levels, " +
    "and sizes. The currently selected voice is marked with an asterisk (*). " +
    "Voices are separated into 'Available to download' and 'Already downloaded' sections.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

const CHANGE_VOICE_TOOL: Tool = {
  name: "change_voice",
  description:
    "Change the text-to-speech voice. Provide either the voice name (e.g., 'amy-high') or " +
    "a number from the list_voices output. If the voice is not already downloaded, it will be " +
    "downloaded automatically (may take 1-2 minutes for larger voices). " +
    "Progress will be shown during download. The voice becomes active immediately after the operation completes.",
  inputSchema: {
    type: "object",
    properties: {
      voice: {
        type: "string",
        description:
          "Voice identifier - either the full voice key (e.g., 'en_US-amy-high'), a simplified " +
          "name (e.g., 'amy-high' or just 'amy'), or a number from the list_voices output (1-based index).",
      },
    },
    required: ["voice"],
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
      tools: [SPEAK_TOOL, LIST_VOICES_TOOL, CHANGE_VOICE_TOOL],
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

      if (request.params.name === "list_voices") {
        try {
          const voiceList = await this.piperManager.listVoices();
          return {
            content: [
              {
                type: "text",
                text: voiceList,
              },
            ],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Failed to list voices: ${errorMessage}`,
              },
            ],
          };
        }
      }

      if (request.params.name === "change_voice") {
        const { voice } = request.params.arguments as { voice: string };

        if (!voice || typeof voice !== "string") {
          throw new Error("Voice identifier is required and must be a string");
        }

        try {
          const result = await this.piperManager.changeVoice(voice);
          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Failed to change voice: ${errorMessage}`,
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
