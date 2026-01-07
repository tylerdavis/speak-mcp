#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'node:child_process';

async function testSpeak() {
  console.log('Starting speak MCP server test...');

  // Start the server
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  // Create client transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js']
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('Connected to speak server');

    // List tools
    const tools = await client.listTools();
    console.log('Available tools:', tools.tools.map(t => t.name));

    // Call the speak tool
    console.log('\nCalling speak tool with test message...');
    const result = await client.callTool({
      name: 'speak',
      arguments: {
        message: 'Hello! This is a test of the text to speech system. If you can hear this, the speak tool is working correctly.',
        message_type: 'info'
      }
    });

    console.log('Result:', result);

    await client.close();
    console.log('\nTest completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testSpeak();
