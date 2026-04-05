#!/usr/bin/env node
/**
 * @epicai/legion — Test Harness HTTP Server Process
 * Standalone MCP server over streamable-http for the HTTP harness profile.
 * Spawned as a child process by HttpHarnessBackend.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { HarnessProfile } from '../types.js';
import { createHandlerState, resetHandlerState, handleTool } from '../shared/handlers.js';

const state = createHandlerState(HarnessProfile.Http);

/** Serialize content for MCP text response — strings pass through, objects get JSON.stringify */
function toText(content: unknown): string {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'harness-http', version: '1.0.0' });

  server.tool('echo', { message: z.string() }, async (args) => {
    const r = await handleTool('echo', args, state);
    return { content: [{ type: 'text' as const, text: toText(r.content) }], isError: r.isError };
  });

  server.tool('sleep', { ms: z.number() }, async (args) => {
    const r = await handleTool('sleep', args, state);
    return { content: [{ type: 'text' as const, text: toText(r.content) }], isError: r.isError };
  });

  server.tool('fail', { reason: z.string().optional() }, async (args) => {
    const r = await handleTool('fail', args, state);
    return { content: [{ type: 'text' as const, text: toText(r.content) }], isError: r.isError };
  });

  server.tool('malformed', { variant: z.number().optional() }, async (args) => {
    const r = await handleTool('malformed', args, state);
    return { content: [{ type: 'text' as const, text: toText(r.content) }], isError: r.isError };
  });

  server.tool('approval_target', { action: z.string() }, async (args) => {
    const r = await handleTool('approval_target', args, state);
    return { content: [{ type: 'text' as const, text: toText(r.content) }], isError: r.isError };
  });

  server.tool('multi_step', { step: z.number() }, async (args) => {
    const r = await handleTool('multi_step', args, state);
    return { content: [{ type: 'text' as const, text: toText(r.content) }], isError: r.isError };
  });

  server.tool('stateful_counter', {}, async () => {
    const r = await handleTool('stateful_counter', {}, state);
    return { content: [{ type: 'text' as const, text: toText(r.content) }], isError: r.isError };
  });

  server.tool('ping', {}, async () => {
    const r = await handleTool('ping', {}, state);
    return { content: [{ type: 'text' as const, text: toText(r.content) }], isError: r.isError };
  });

  server.tool('_harness_reset', {}, async () => {
    resetHandlerState(state);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ reset: true }) }], isError: false };
  });

  return server;
}

// Stateful transport — one persistent session
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

const mcpServer = createMcpServer();
await mcpServer.connect(transport);

const httpServer = createServer(async (req, res) => {
  if (req.url !== '/mcp') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  try {
    await transport.handleRequest(req, res);
  } catch {
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal error');
    }
  }
});

httpServer.listen(0, '127.0.0.1', () => {
  const addr = httpServer.address();
  if (addr && typeof addr === 'object') {
    process.stdout.write(`HARNESS_PORT=${addr.port}\n`);
  }
});
